from django.core.files.uploadedfile import InMemoryUploadedFile
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password

from backend_service.settings import AWS_S3_ENDPOINT_URL, PUBLIC_S3_ENDPOINT_URL
from core.serializers import BaseResponseSerializer
from core.utils.get_s3_image_url import get_s3_image_url
from .models import User


class IsEmailFreeSerializer(serializers.Serializer):
    email = serializers.EmailField()


class DataIsEmailFreeSerializer(IsEmailFreeSerializer):
    is_free = serializers.BooleanField()

class IsEmailFreeResponseSerializer(BaseResponseSerializer):
    data = DataIsEmailFreeSerializer()

class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
        validators=[validate_password],
    )

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'password')
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def create(self, validated_data):
        user = User.objects.create(
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
        )
        user.set_password(validated_data['password'])
        user.save()
        return user


class LoginSerializer(serializers.ModelSerializer):
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
    )

    class Meta:
        model = User
        fields = ('email', 'password')


class UserDataSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[]
    )
    image_url = serializers.SerializerMethodField(read_only=True)

    @staticmethod
    def get_image_url(obj) -> str | None:
        return get_s3_image_url(obj, 'image')

    class Meta:
        model = User
        fields = ('id', 'image_url', 'first_name', 'last_name', 'email')


class UserProfileResponseSerializer(BaseResponseSerializer):
    data = UserDataSerializer(help_text='Информация о пользователе')


class UpdateUserDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('first_name', 'last_name')

class UserWithTokensResponseSerializer(serializers.Serializer):
    user = UserDataSerializer(help_text='Информация о пользователе')
    refresh = serializers.CharField(help_text='Refresh token')
    access = serializers.CharField(help_text='Access token')


class AuthUserResponseSerializer(BaseResponseSerializer):
    data = UserWithTokensResponseSerializer(help_text='Информация о пользователе и токенах')


class ProfileImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField(required=True, allow_null=False, write_only=True)

    @staticmethod
    def validate_image(value: InMemoryUploadedFile):
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Image size must be less than 5MB")

        allowed_formats = {'image/jpeg', 'image/png', 'image/webp'}
        if value.content_type not in allowed_formats:
            raise serializers.ValidationError("Image format must be JPEG, PNG or WebP")

        return value


class ProfileImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = ('image_url',)

    @staticmethod
    def get_image_url(obj) -> str:
        return get_s3_image_url(obj, 'image')
        # HACK - почему-то при любых настройках она добавляет https:// перед всей ссылкой
        return obj.image.url.replace(AWS_S3_ENDPOINT_URL, PUBLIC_S3_ENDPOINT_URL).split('://', 1)[1] if obj.image else None


class ProfileImageResponseSerializer(BaseResponseSerializer):
    data = ProfileImageSerializer()
