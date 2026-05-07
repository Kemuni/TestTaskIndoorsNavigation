from django.contrib.auth import authenticate
from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from core.serializers import ErrorResponseSerializer
from users.serializers import RegisterSerializer, AuthUserResponseSerializer, UserOutputSerializer, LoginSerializer


class RegisterView(APIView):
    """
    Регистрация нового пользователя
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Регистрация пользователя",
        description="Создаёт нового пользователя с уникальным email, именем, фамилией, возрастом. Также возвращает JWT-токены",
        request=RegisterSerializer,
        responses={
            201: OpenApiResponse(response=AuthUserResponseSerializer, description="Пользователь успешно создан"),
            400: OpenApiResponse(response=ErrorResponseSerializer, description="Ошибки валидации")
        },
        tags=['Authentication'],
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response(
            AuthUserResponseSerializer(data={
                'user': UserOutputSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token)
            }).initial_data,
            status=status.HTTP_201_CREATED
        )


class LoginView(APIView):
    """
    Авторизация пользователя
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Авторизация пользователя",
        description="При успешном входе создаёт JWT токены для пользователя.",
        request=LoginSerializer,
        responses={
            200: OpenApiResponse(response=AuthUserResponseSerializer, description="Пользователь успешно создан"),
            400: OpenApiResponse(response=ErrorResponseSerializer, description="Ошибки валидации")
        },
        tags=['Authentication'],
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
        )
        if user is None:
            return Response(
                ErrorResponseSerializer(data={
                    'code': 'WRONG_CREDENTIALS',
                    'message': 'Email or password is wrong.'
                }).initial_data,
                status=status.HTTP_400_BAD_REQUEST,
            )

        refresh = RefreshToken.for_user(user)

        return Response(
            AuthUserResponseSerializer(data={
                'user': UserOutputSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token)
            }).initial_data,
            status=status.HTTP_200_OK
        )
