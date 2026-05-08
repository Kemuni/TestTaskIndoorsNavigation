from django.contrib.auth import authenticate
from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import status, permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from core.serializers import ErrorResponseSerializer
from users.serializers import RegisterSerializer, AuthUserResponseSerializer, UserOutputSerializer, LoginSerializer

AUTH_TAG = 'User authentication'


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
        tags=[AUTH_TAG],
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
            400: OpenApiResponse(response=ErrorResponseSerializer, description="Ошибка валидации (неверные email/пароль)"),
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
            AuthUserResponseSerializer(data={
                'user': UserOutputSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token)
            }).initial_data,
            status=status.HTTP_200_OK
        )


class MyTokenRefreshView(TokenRefreshView):
    @extend_schema(
        summary="Обновление access токена",
        description='Запрашивает refresh JWT token и возвращает JWT access token, если токен обновления действителен.',
        responses={
            200: OpenApiResponse(
                response=TokenRefreshSerializer,
                description="Токен успешно обновлён"
            ),
            401: OpenApiResponse(description="Refresh токен недействителен или просрочен"),
        },
        tags=[AUTH_TAG],
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class MyProfileView(APIView):
    """
    Просмотр информации о себе пользователем.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Получение информации о профиле текущего пользователя ",
        responses={
            200: OpenApiResponse(
                response=UserOutputSerializer,
                description="Данные текущего пользователя"
            ),
            401: OpenApiResponse(response=ErrorResponseSerializer, description="Требуется авторизация"),
        },
        tags=[AUTH_TAG],
    )
    def get(self, request):
        return Response(UserOutputSerializer(request.user).data)
