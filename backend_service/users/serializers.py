from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password

from core.serializers import BaseResponseSerializer
from .models import User


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


class UserResponseSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[]
    )

    class Meta:
        model = User
        fields = ('id', 'first_name', 'last_name', 'email')


class UserProfileResponseSerializer(BaseResponseSerializer):
    data = UserResponseSerializer(help_text='Информация о пользователе')


class UserWithTokensResponseSerializer(serializers.Serializer):
    user = UserResponseSerializer(help_text='Информация о пользователе')
    refresh = serializers.CharField(help_text='Refresh token')
    access = serializers.CharField(help_text='Access token')


class AuthUserResponseSerializer(BaseResponseSerializer):
    data = UserWithTokensResponseSerializer(help_text='Информация о пользователе и токенах')
