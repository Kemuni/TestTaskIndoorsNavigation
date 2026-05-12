from django.db.models import OuterRef, Q, Subquery, Count
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from rest_framework import viewsets, pagination
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from chat.models import Dialog, Message
from chat.serializers import DialogSummarySerializer, DialogWithMessagesSerializer, ShortMessageSerializer, \
    DialogSummaryResponseSerializer, DialogWithMessagesResponseSerializer, ShortMessageResponseSerializer
from core.mixins import BaseResponseDataFormatMixin
from core.pagination import FixResponsePaginatedSchemaMixin
from core.utils.api_schema_responses import get_default_schema_responses


class CursorSetPagination(FixResponsePaginatedSchemaMixin, pagination.CursorPagination):
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 500
    ordering = '-created_at'
    cursor_query_param = 'cursor'


class DialogViewSet(BaseResponseDataFormatMixin, viewsets.GenericViewSet):
    """ ViewSet для работы с диалогами """
    SCHEMA_TAG = 'Dialogs'

    pagination_class = CursorSetPagination
    permission_classes = [IsAuthenticated]
    serializer_class = DialogSummarySerializer

    def get_queryset(self):
        user = self.request.user
        return (
            Dialog.objects
            .filter(Q(user_1=user) | Q(user_2=user))
            .select_related('user_1', 'user_2')
        )

    @extend_schema(
        summary="Получение диалогов пользователя",
        description="Получение диалогов пользователя",
        responses={
            200: OpenApiResponse(response=DialogSummaryResponseSerializer, description="Данные диалогов"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
    )
    def list(self, request, *_, **__):
        last_message_subquery = Message.objects.filter(
            dialog=OuterRef('pk')
        ).select_related('sender').order_by('-created_at')

        user = self.request.user
        queryset = (
            self.get_queryset()
            .annotate(
                last_message_id=Subquery(
                    last_message_subquery.values('id')[:1]
                ),
                last_message_content=Subquery(
                    last_message_subquery.values('content')[:1]
                ),
                last_message_created_ad=Subquery(
                    last_message_subquery.values('created_at')[:1]
                ),
                last_message_sender_id=Subquery(
                    last_message_subquery.values('sender_id')[:1]
                ),
                last_message_sender_first_name=Subquery(
                    last_message_subquery.values('sender__first_name')[:1]
                ),
                last_message_sender_last_name=Subquery(
                    last_message_subquery.values('sender__last_name')[:1]
                ),
                unread_count=Count(
                    'messages',
                    filter=Q(messages__read_at__isnull=True) & ~Q(messages__sender=user)
                )
            )
        )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(
                page,
                context={'request': request},
                many=True
            )
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(
            queryset,
            context={'request': request},
            many=True
        )
        return Response(serializer.data)

    @extend_schema(
        summary="Получить сообщения и данные диалога",
        description="Получить сообщения и данные диалога",
        parameters=[
            OpenApiParameter('id', description='ID диалога', required=True, type=int, location='path'),
        ],
        responses={
            200: OpenApiResponse(response=DialogWithMessagesResponseSerializer, description="Данные и сообщения диалога"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
    )
    def retrieve(self, _, pk=None, *__, **___):
        # Валидация ID
        if pk is None:
            raise ValidationError('`id` in the URL must be an integer')
        try:
            dialog_id = int(pk)
        except ValueError:
            raise ValidationError('`id` in the URL must be integer and greater than zero')
        if dialog_id <= 0:
            raise ValidationError('`id` in the URL must be greater than zero')

        user = self.request.user
        try:
            dialog_obj = (
                Dialog.objects
                .filter(Q(user_1=user) | Q(user_2=user))
                .select_related('user_1', 'user_2')
                .get(id=dialog_id)
            )
        except Dialog.DoesNotExist:
            raise NotFound(f'There are no dialog ID={pk} or you are not a participant')

        dialog_obj.recent_messages = dialog_obj.messages.order_by('-created_at')[:100]

        serializer = DialogWithMessagesSerializer(
            dialog_obj,
            context={'request': self.request}
        )

        return Response(serializer.data)

    @extend_schema(
        summary="Получение сообщений из диалога",
        description="Получение сообщений из диалога",
        responses={
            200: OpenApiResponse(response=ShortMessageResponseSerializer, description="Сообщения"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
    )
    @action(detail=True, methods=['get'], url_path='messages', url_name='messages')
    def message_list(self, _, pk=None, *__, **___):
        # Валидация ID
        if pk is None:
            raise ValidationError('`id` in the URL must be an integer')
        try:
            dialog_id = int(pk)
        except ValueError:
            raise ValidationError('`id` in the URL must be integer and greater than zero')
        if dialog_id <= 0:
            raise ValidationError('`id` in the URL must be greater than zero')

        user = self.request.user
        is_dialog_exists = (
            Dialog.objects
            .filter((Q(user_1=user) | Q(user_2=user)) & Q(id=dialog_id))
            .exists()
        )
        if not is_dialog_exists:
            raise NotFound(f'There are no dialog ID={pk} or you are not a participant')

        messages = Message.objects.filter(dialog_id=dialog_id).order_by('-created_at')
        page = self.paginate_queryset(messages)
        if page is not None:
            serializer = ShortMessageSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = ShortMessageSerializer(messages, many=True)
        return Response(serializer.data)

