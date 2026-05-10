import enum
import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model

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


    class MessageType(str, enum.Enum):
        """ Различные типы сообщений вебсокета """
        CHAT_MESSAGE = "chat_message"


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
        try:
            text_data_json = json.loads(text_data)
        except json.JSONDecodeError as e:
            logger.error(f'Ошибка во время декодирования JSON сообщения: {e}', exc_info=True)
            await self.send_error('Invalid JSON')
            return

        message_text = text_data_json.get('message', None)
        if message_text is None:
            await self.send_error("Body of message is empty. Message text is required")
            return
        if len(message_text) > self.MAX_MESSAGE_LENGTH:
            await self.send_error(f"Message text is too long. Max length is {self.MAX_MESSAGE_LENGTH} characters")
            return

        try:
            message_obj = await self.save_message(
                sender_user_id=self.user.id,
                receiver_user_id=self.receiver_user_id,
                message_text=message_text,
            )
        except Exception as e:
            logger.error(f'Не удалось создать сообщение: {e}', exc_info=True)
            await self.send_error('Unknown error. Failed to create message')
            return

        await self.channel_layer.group_send(
            self.room_name,
            {
                'type': self.MessageType.CHAT_MESSAGE,
                'message': {
                    'id': message_obj.id,
                    'sender_id': self.user.id,
                    'content': message_obj.content,
                }
            }
        )

    async def chat_message(self, event):
        """ Обрабатываем сообщения в группу типа `chat_message` """
        await self.send(text_data=json.dumps({
            'success': True,
            'message': event['message'],
        }))

    async def send_error(self, error_msg: str):
        """ Отправляем ошибку пользователю """
        await self.send(text_data=json.dumps({
            'success': False,
            'error': error_msg,
        }))

    @staticmethod
    @database_sync_to_async
    def save_message(sender_user_id: int, receiver_user_id: int, message_text: str) -> Message:
        if sender_user_id < receiver_user_id:
            user_1_id, user_2_id = sender_user_id, receiver_user_id
        else:
            user_1_id, user_2_id = receiver_user_id, sender_user_id

        dialog, created = Dialog.objects.get_or_create(user_1_id=user_1_id, user_2_id=user_2_id)
        if created:
            logger.info(f'Создан диалог (ID={dialog.id}) между {user_1_id} и {user_2_id}')

        message_obj = Message.objects.create(
            dialog=dialog,
            sender_id=sender_user_id,
            content=message_text,
        )

        return message_obj


    @staticmethod
    def get_room_name(user_1_id: int, user_2_id: int) -> str:
        """ Создает имя комнаты для личного чата двух пользователей """
        ids = sorted([str(user_1_id), str(user_2_id)])
        return f"private_chat_{'_'.join(ids)}"
