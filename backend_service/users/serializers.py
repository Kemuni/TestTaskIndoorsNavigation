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
    age = serializers.IntegerField(
        required=True,
        min_value=18,
        max_value=99,
    )

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'password', 'age')
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def create(self, validated_data):
        user = User.objects.create(
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            age=validated_data['age'],
        )
        user.set_password(validated_data['password'])
        user.save()
        return user


class LoginSerializer(serializers.ModelSerializer):
    email = serializers.EmailField()
    class Meta:
        model = User
        fields = ('email', 'password')


class UserOutputSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[]
    )
    class Meta:
        model = User
        fields = ('id', 'first_name', 'last_name', 'email', 'age')


class UserWithTokensResponseSerializer(serializers.Serializer):
    user = UserOutputSerializer(help_text='Информация о пользователе')
    refresh = serializers.CharField(help_text='Refresh token')
    access = serializers.CharField(help_text='Access token')


class AuthUserResponseSerializer(BaseResponseSerializer):
    data = UserWithTokensResponseSerializer(help_text='Информация о пользователе и токенах')
