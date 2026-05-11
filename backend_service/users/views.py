from django.contrib.auth import authenticate, get_user_model
from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import status, permissions, viewsets, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from core.mixins import BaseResponseDataFormatMixin
from core.serializers import ErrorResponseSerializer
from core.swagger_utils import get_default_schema_responses
from users.serializers import (
    RegisterSerializer,
    AuthUserResponseSerializer,
    UserResponseSerializer,
    LoginSerializer,
    UserWithTokensResponseSerializer,
    UserProfileResponseSerializer
)

AUTH_TAG = 'User authentication'
User = get_user_model()

class RegisterView(BaseResponseDataFormatMixin, APIView):
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
            **get_default_schema_responses(),
        },
        tags=[AUTH_TAG],
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response(
            UserWithTokensResponseSerializer({
                'user': UserResponseSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token)
            }).data,
            status=status.HTTP_201_CREATED
        )


class LoginView(BaseResponseDataFormatMixin, APIView):
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
            **get_default_schema_responses(),
            401: OpenApiResponse(response=ErrorResponseSerializer, description="Неверные учётные данные"),
        },
        tags=[AUTH_TAG],
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
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)

        return Response(
            UserWithTokensResponseSerializer({
                'user': UserResponseSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token)
            }).data
        )


class MyTokenRefreshView(BaseResponseDataFormatMixin, TokenRefreshView):
    @extend_schema(
        summary="Обновление access токена",
        description='Запрашивает refresh JWT token и возвращает JWT access token, если токен обновления действителен.',
        responses={
            200: OpenApiResponse(
                response=TokenRefreshSerializer,
                description="Токен успешно обновлён"
            ),
            **get_default_schema_responses(),
            401: OpenApiResponse(description="Refresh токен недействителен или просрочен"),
        },
        tags=[AUTH_TAG],
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class ProfileView(BaseResponseDataFormatMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    Просмотр информации о профилях пользователей.
    """
    queryset = User
    serializer_class = UserResponseSerializer

    def get_permissions(self):
        if self.action in ('retrieve',):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    @extend_schema(
        summary="Получение информации о профиле текущего пользователя ",
        responses={
            200: OpenApiResponse(
                response=UserProfileResponseSerializer,
                description="Данные текущего пользователя"
            ),
            **get_default_schema_responses(),
        },
        tags=[AUTH_TAG],
    )
    @action(detail=False, methods=['get'], url_path='my')
    def my_profile(self, request):
        return Response(UserResponseSerializer(request.user).data)

    @extend_schema(
        summary="Получение информации о профиле",
        responses={
            200: OpenApiResponse(
                response=UserProfileResponseSerializer,
                description="Данные пользователя"
            ),
            **get_default_schema_responses(),
        },
        tags=[AUTH_TAG],
        auth=[],
    )
    def retrieve(self, *args, **kwargs):
        return super().retrieve(*args, **kwargs)
