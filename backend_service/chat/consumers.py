import enum
import json
import logging
from datetime import datetime

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from chat.exceptions import IncorrectMessageBody
from chat.models import Message, Dialog

User = get_user_model()

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    """ Личный чат между двумя пользователями """

    # Максимальная длина сообщения в символах
    MAX_MESSAGE_LENGTH = 800
    # Имя комнаты в которой находится пользователь
    room_name: str
    # Текущий пользователь (отправитель сообщения)
    user: User
    # Id пользователя с которым отправитель сообщения общается
    receiver_user_id: int


    class ActionType(str, enum.Enum):
        """ Различные типы сообщений вебсокета """
        SEND_MESSAGE = "send_message"
        READ_MESSAGES = "read_messages"
        DELETE_MESSAGES = "delete_messages"


    async def connect(self):
        self.receiver_user_id = int(self.scope['url_route']['kwargs']['receiver_user_id'])
        self.user = self.scope['user']

        if not self.user.is_authenticated or self.user.id == self.receiver_user_id:
            await self.close()
            return

        self.room_name = self.get_room_name(self.user.id, self.receiver_user_id)

        await self.channel_layer.group_add(
            self.room_name,
            self.channel_name,
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_name'):
            await self.channel_layer.group_discard(
                self.room_name,
                self.channel_name,
            )

    async def receive(self, text_data = None, **_):
        """
        Обработка запросов. Существуют следующие типы:
        SEND_MESSAGE - Отправка сообщений.
        READ_MESSAGES - Чтение сообщений.
        """
        try:
            text_data_json = json.loads(text_data)
        except json.JSONDecodeError as e:
            logger.error(f'Ошибка во время декодирования JSON сообщения: {e}', exc_info=True)
            await self.send_error('Invalid JSON')
            return

        try:
            action_type = self.parse_action_type(text_data_json)
            if action_type == self.ActionType.SEND_MESSAGE:
                message_text = self.parse_message_text(text_data_json)
                message_obj = await self.save_message(
                    sender_user_id=self.user.id,
                    receiver_user_id=self.receiver_user_id,
                    message_text=message_text,
                )
                result = {
                    'message': {
                        'id': message_obj.id,
                        'sender_id': self.user.id,
                        'content': message_obj.content,
                    }
                }
            elif action_type == self.ActionType.READ_MESSAGES:
                message_ids = self.parse_message_ids(text_data_json)
                await self.validate_messages_ids(message_ids=message_ids)
                await self.mark_messages_as_read(message_ids)
                result = {
                    'message_ids': message_ids
                }
            elif action_type == self.ActionType.DELETE_MESSAGES:
                message_ids = self.parse_message_ids(text_data_json)
                await self.validate_messages_ids(message_ids=message_ids)
                await self.delete_messages_in_db(message_ids)
                result = {
                    'message_ids': message_ids
                }
            else:
                await self.send('Unknown action type')
                return
        except IncorrectMessageBody as exc:
            logger.error(f'Не удалось сообщение: {exc}', exc_info=True)
            await self.send_error(str(exc))
            return

        await self.channel_layer.group_send(
            self.room_name,
            {
                'type': action_type,
                **result,
            }
        )

    async def send_message(self, event):
        """ Обрабатываем сообщения в группу типа `send_message` """
        await self.send(text_data=json.dumps({
            'success': True,
            'action': str(self.ActionType.SEND_MESSAGE),
            'message': event['message'],
        }))

    async def read_messages(self, event):
        """ Обрабатываем сообщения в группу типа `read_messages` """
        await self.send(text_data=json.dumps({
            'success': True,
            'action': str(self.ActionType.READ_MESSAGES),
            'message_ids': event['message_ids'],
        }))

    async def delete_messages(self, event):
        """ Обрабатываем сообщения в группу типа `delete_messages` """
        await self.send(text_data=json.dumps({
            'success': True,
            'action': str(self.ActionType.DELETE_MESSAGES),
            'message_ids': event['message_ids'],
        }))

    async def send_error(self, error_msg: str):
        """ Отправляем ошибку пользователю """
        await self.send(text_data=json.dumps({
            'success': False,
            'error': error_msg,
        }))

    def parse_action_type(self, data: dict) -> ActionType:
        """ Парсим тип активности в enum и возвращаем его """
        action_type_str = data.get('type', None)
        if action_type_str is None:
            raise IncorrectMessageBody(f"Action type is required")

        try:
            return self.ActionType(action_type_str.lower())
        except ValueError:
            raise IncorrectMessageBody(f"Incorrect action type. Available is {', '.join(i.value for i in self.ActionType)}")

    @staticmethod
    def parse_message_ids(data: dict) -> list[int]:
        """ Парсим из тела запроса ID сообщений """
        message_ids = data.get('message_ids', None)
        if not isinstance(message_ids, list):
            raise IncorrectMessageBody("`message_ids` is required and must be a list of numbers")

        for i in range(len(message_ids)):
            try:
                message_ids[i] = int(message_ids[i])
            except ValueError:
                raise IncorrectMessageBody(f"Message id {message_ids[i]} must be a number")

        if len(set(message_ids)) != len(message_ids):
            raise IncorrectMessageBody(f"Message ids are not unique")

        return message_ids

    def parse_message_text(self, data: dict) -> str:
        """ Парсим из тела запроса тело сообщения """
        message_text = data.get('message', None)
        if message_text is None:
            raise IncorrectMessageBody("Body of message is empty. Message text is required")
        if len(message_text) > self.MAX_MESSAGE_LENGTH:
            raise IncorrectMessageBody(f"Message text is too long. Max length is {self.MAX_MESSAGE_LENGTH} characters")
        return message_text

    @database_sync_to_async
    def validate_messages_ids(self, message_ids: list[int]) -> None:
        """ Валидируем, что в БД существуют такие ID сообщений и они принадлежат текущему чату """
        user_1_id, user_2_id = self.get_user1_and_user2_ids(self.user.id, self.receiver_user_id)
        messages_amount = (
            Message.objects
            .select_related('dialog')
            .filter(
                id__in=message_ids,
                dialog__user_1_id=user_1_id,
                dialog__user_2_id=user_2_id,
            )
            .count()
        )
        if messages_amount != len(message_ids):
            raise IncorrectMessageBody(f"There are no some messages with such Id or you try to edit someone else message")

    @staticmethod
    @database_sync_to_async
    def mark_messages_as_read(message_ids: list[int]) -> None:
        """ Помечаем в БД, что сообщения прочитаны """
        Message.objects.filter(id__in=message_ids).update(read_at=datetime.now())


    @staticmethod
    @database_sync_to_async
    def delete_messages_in_db(message_ids: list[int]) -> None:
        """ Удаляем сообщения из БД """
        Message.objects.filter(id__in=message_ids).delete()

    @database_sync_to_async
    def save_message(self, sender_user_id: int, receiver_user_id: int, message_text: str) -> Message:
        """ Сохраняем новое сообщение в БД """
        user_1_id, user_2_id = self.get_user1_and_user2_ids(receiver_user_id, sender_user_id)

        dialog, created = Dialog.objects.get_or_create(user_1_id=user_1_id, user_2_id=user_2_id)
        if created:
            logger.info(f'Создан диалог (ID={dialog.id}) между {user_1_id} и {user_2_id}')

        try:
            message_obj = Message.objects.create(
                dialog=dialog,
                sender_id=sender_user_id,
                content=message_text,
            )
        except IntegrityError:
            raise IncorrectMessageBody('Unknown error. Failed to create message')

        return message_obj

    @staticmethod
    def get_user1_and_user2_ids(first_id: int, second_id: int) -> tuple[int, int]:
        if first_id < second_id:
            return first_id, second_id
        else:
            return second_id, first_id


    @staticmethod
    def get_room_name(user_1_id: int, user_2_id: int) -> str:
        """ Создает имя комнаты для личного чата двух пользователей """
        ids = sorted([str(user_1_id), str(user_2_id)])
        return f"private_chat_{'_'.join(ids)}"
