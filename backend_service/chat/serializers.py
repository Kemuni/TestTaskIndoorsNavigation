from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from chat.models import Dialog, Message
from core.serializers import BaseResponseSerializer
from core.utils.get_s3_image_url import get_s3_image_url

User = get_user_model()

class DialogUserSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)

    @staticmethod
    def get_image_url(obj) -> str | None:
        return get_s3_image_url(obj, 'image')

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'image_url')


class ShortMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source='sender.id')

    class Meta:
        model = Message
        fields = ('id', 'sender_id', 'content', 'created_at', 'read_at')
        read_only_fields = ('id', 'sender_id', 'content', 'created_at', 'read_at')


class ShortMessageResponseSerializer(BaseResponseSerializer):
    data = ShortMessageSerializer(many=True)

class DialogWithMessagesSerializer(serializers.ModelSerializer):
    with_user = serializers.SerializerMethodField(read_only=True)
    recent_messages = ShortMessageSerializer(many=True, read_only=True)

    class Meta:
        model = Dialog
        fields = ('id', 'with_user', 'recent_messages')
        read_only_fields = ('id', 'with_user', 'recent_messages')

    @extend_schema_field(DialogUserSerializer)
    def get_with_user(self, obj):
        request = self.context.get('request', None)
        if request is None or not request.user.is_authenticated:
            return None
        with_user = obj.user_2 if request.user == obj.user_1 else obj.user_1
        return DialogUserSerializer(with_user).data


class DialogWithMessagesResponseSerializer(BaseResponseSerializer):
    data = DialogWithMessagesSerializer(many=True)


class LastMessageSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    sender_id = serializers.IntegerField()
    sender_first_name = serializers.CharField()
    sender_last_name = serializers.CharField()
    content = serializers.CharField()
    created_at = serializers.DateTimeField()


class DialogSummarySerializer(DialogWithMessagesSerializer):
    with_user = serializers.SerializerMethodField(read_only=True)
    last_message = serializers.SerializerMethodField(read_only=True)
    unread_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Dialog
        fields = ('id', 'with_user', 'last_message', 'unread_count')
        read_only_fields = ('id', 'with_user', 'last_message')

    @extend_schema_field(DialogUserSerializer)
    def get_with_user(self, obj):
        request = self.context.get('request', None)
        if request is None or not request.user.is_authenticated:
            return None
        with_user = obj.user_2 if request.user == obj.user_1 else obj.user_1
        return DialogUserSerializer(with_user).data

    @extend_schema_field(LastMessageSerializer)
    def get_last_message(self, obj):
        return LastMessageSerializer({
            'id': obj.last_message_id,
            'sender_id': obj.last_message_sender_id,
            'sender_first_name': obj.last_message_sender_first_name,
            'sender_last_name': obj.last_message_sender_last_name,
            'content': obj.last_message_content,
            'created_at': obj.last_message_created_ad,
        }).data

    @extend_schema_field(int)
    def get_unread_count(self, obj):
        return getattr(obj, 'unread_count', 0)


class DialogSummaryResponseSerializer(BaseResponseSerializer):
    data = DialogSummarySerializer(many=True)


class MessageWriteSerializer(serializers.ModelSerializer):

    class Meta:
        model = Message
        fields = ('content',)
