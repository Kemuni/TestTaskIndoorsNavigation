from django.contrib.auth import authenticate, get_user_model
from django.core.files.storage import default_storage
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from rest_framework import status, permissions, viewsets, mixins
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from core.mixins import BaseResponseDataFormatMixin
from core.serializers import ErrorResponseSerializer
from core.utils.api_schema_responses import get_default_schema_responses
from users.permissions import IsProfileOwner
from users.serializers import (
    RegisterSerializer,
    AuthUserResponseSerializer,
    UserDataSerializer,
    LoginSerializer,
    UserWithTokensResponseSerializer,
    UserProfileResponseSerializer,
    UpdateUserDataSerializer,
    ProfileImageUploadSerializer,
    ProfileImageSerializer,
    ProfileImageResponseSerializer, IsEmailFreeSerializer, IsEmailFreeResponseSerializer, DataIsEmailFreeSerializer
)

AUTH_TAG = 'User authentication'
PROFILE_TAG = 'User profile'
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
                'user': UserDataSerializer(user).data,
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
                'user': user,
                'refresh': str(refresh),
                'access': str(refresh.access_token)
            }).data
        )


class IsEmailFreeView(BaseResponseDataFormatMixin, APIView):
    """
    Проверка является ли email свободным
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Является ли Email свободным",
        description="Является ли Email свободным",
        request=IsEmailFreeSerializer,
        responses={
            200: OpenApiResponse(response=IsEmailFreeResponseSerializer, description="Пользователь успешно создан"),
            **get_default_schema_responses(),
        },
        tags=[AUTH_TAG],
    )
    def post(self, request):
        serializer = IsEmailFreeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        is_free = not User.objects.filter(email=serializer.validated_data['email']).exists()


        return Response(
            DataIsEmailFreeSerializer({
                'email': serializer.validated_data['email'],
                'is_free': is_free,
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


class ProfileViewSet(BaseResponseDataFormatMixin,
                     mixins.RetrieveModelMixin,
                     viewsets.GenericViewSet):
    """
    Просмотр и изменение информации о профиле пользователя(ей).
    """
    queryset = User
    serializer_class = UserDataSerializer

    def get_permissions(self):
        if self.action == 'retrieve':
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
        tags=[PROFILE_TAG],
    )
    @action(detail=False, methods=['get'], url_path='my')
    def my_profile(self, request):
        return Response(UserDataSerializer(request.user).data)

    @extend_schema(
        summary="Получение информации о профиле",
        responses={
            200: OpenApiResponse(
                response=UserProfileResponseSerializer,
                description="Данные пользователя"
            ),
            **get_default_schema_responses(),
        },
        tags=[PROFILE_TAG],
        auth=[],
    )
    def retrieve(self, *args, **kwargs):
        return super().retrieve(*args, **kwargs)

    @extend_schema(
        summary="Обновление профиля пользователя",
        description="Обновление профиля пользователя",
        request=UpdateUserDataSerializer,
        responses={
            200: OpenApiResponse(response=UserProfileResponseSerializer, description="Данные о пользователя"),
            **get_default_schema_responses(),
        },
        tags=[PROFILE_TAG],
    )
    @action(detail=False, methods=['put'], url_path='personal')
    def update_my(self, request, *_, **__):
        user = request.user
        serializer = UpdateUserDataSerializer(user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserDataSerializer(user).data)

    @extend_schema(
        summary="Добавление фото профиля",
        description="Добавление фото профиля",
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'image': {
                        'type': 'string',
                        'format': 'binary',
                        'nullable': False,
                        'description': 'Файл изображения'
                    },
                }
            }
        },
        responses={
            204: OpenApiResponse(response=ProfileImageResponseSerializer, description="Фото профиля успешно добавлено"),
            **get_default_schema_responses(),
        },
        tags=[PROFILE_TAG],
    )
    @action(detail=False, methods=['post'], url_path='upload-image', url_name='upload_image')
    def upload_image(self, request, **_):
        serializer = ProfileImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if user.image:
            default_storage.delete(user.image.name)
        user.image = serializer.validated_data['image']
        user.save()

        response_serializer = ProfileImageSerializer(user)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Удаление фото профиля",
        description="Удаление фото профиля",
        responses={
            204: OpenApiResponse(description="Фото профиля успешно удалено"),
            **get_default_schema_responses(),
        },
        tags=[PROFILE_TAG],
    )
    @action(detail=False, methods=['delete'], url_path='remove_image', url_name='remove_image')
    def remove_image(self, request):
        user = request.user
        if not user.image:
            raise NotFound(f'There are no image for your profile')


        default_storage.delete(user.image.name)
        user.image.delete()
        user.save()

        return Response(status=status.HTTP_204_NO_CONTENT)
