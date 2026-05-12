from django.contrib.auth import get_user_model
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from rest_framework import viewsets, status, mixins, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from cats.filters import CatFilterSet
from cats.models import Breed, Cat, CatImage
from cats.permissions import IsCatOwnerOrReadWriteOnly
from cats.serializers import (
    BreedSerializer,
    BreedListResponseSerializer,
    BreedResponseSerializer,
    CatReadSerializer,
    CatListResponseSerializer,
    CatWriteSerializer,
    CatResponseSerializer,
    CatImageUploadSerializer,
    CatImageSerializer,
    CatImageResponseSerializer,
)
from core.mixins import BaseResponseDataFormatMixin
from core.permissions import IsAdminOrReadOnly
from core.utils.api_schema_responses import get_default_schema_responses

User = get_user_model()

class BreedViewSet(BaseResponseDataFormatMixin, viewsets.ModelViewSet):
    """ ViewSet для пород кошек """
    SCHEMA_TAG = 'Breed'

    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['@name', '@description']
    ordering_fields = ['name']
    ordering = ['name']

    queryset = Breed.objects.all()
    serializer_class = BreedSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'cats'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsAdminOrReadOnly()]

    @extend_schema(
        summary="Получение списка пород кошек",
        description="Получение списка пород кошек",
        responses={
            200: OpenApiResponse(response=BreedListResponseSerializer, description="Данные о породах"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
        auth=[],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Получение породы кошки по ID",
        description="Получение породы кошки по ID",
        parameters=[
            OpenApiParameter('id', description='ID породы кошки', required=True, type=int, location='path')
        ],
        responses={
            200: OpenApiResponse(response=BreedResponseSerializer, description="Данные о породе"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
        auth=[],
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Получение всех кошек с определенной породой",
        description="Получение всех кошек с определенной породой",
        parameters=[
            OpenApiParameter('id', description='ID породы кошки', required=True, type=int, location='path')
        ],
        responses={
            200: OpenApiResponse(response=CatListResponseSerializer,
                                 description="Данные о кошек с определенной породой"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
        auth=[],
    )
    @action(detail=True, methods=['get'])
    def cats(self, _, pk=None):
        if pk is None:
            raise ValidationError('`id` in the URL must be an integer')
        try:
            breed_id = int(pk)
        except ValueError:
            raise ValidationError('`id` in the URL must be integer and greater than zero')
        if breed_id <= 0:
            raise ValidationError('`id` in the URL must be greater than zero')

        queryset = (Cat.objects
                    .filter(breed__id=breed_id)
                    .select_related('breed', 'owner', 'mother', 'father')
                    .all()
                    )
        page = self.paginate_queryset(queryset)
        if page is None:
            raise NotImplementedError('You have to add paginator class to the ViewSet.')
        serializer = CatReadSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @extend_schema(
        summary="Создание породы кошек",
        description="Создание породы кошек",
        request=BreedSerializer,
        responses={
            201: OpenApiResponse(response=BreedResponseSerializer, description="Данные о созданной породе"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Обновление породы кошки",
        description="Обновление породы кошки с введенным ID",
        request=BreedSerializer,
        parameters=[
            OpenApiParameter('id', description='ID породы кошки', required=True, type=int, location='path')
        ],
        responses={
            200: OpenApiResponse(response=BreedResponseSerializer, description="Данные о породе"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частичное обновление породы кошки",
        description="Частичное обновление породы кошки с введенным ID",
        request=BreedSerializer,
        parameters=[
            OpenApiParameter('id', description='ID породы кошки', required=True, type=int, location='path')
        ],
        responses={
            200: OpenApiResponse(response=BreedResponseSerializer, description="Данные о породе"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удаление породы кошки",
        description="Удаление породы кошки с введенным ID",
        parameters=[
            OpenApiParameter('id', description='ID породы кошки', required=True, type=int, location='path')
        ],
        responses={
            204: OpenApiResponse(description="Порода успешно удалена"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


class CatViewSet(BaseResponseDataFormatMixin, viewsets.ModelViewSet):
    """ ViewSet для объявления кошек """
    SCHEMA_TAG = 'Cat'

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = CatFilterSet
    search_fields = ['@name', '@color', '@description', '@breed__name']
    ordering_fields = ['current_weight', 'birthday', 'status']
    ordering = ['-created_at']

    queryset = Cat.objects.select_related('breed', 'owner', 'mother', 'father').all()
    serializer_class = CatReadSerializer

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return CatWriteSerializer
        return CatReadSerializer

    def get_permissions(self):
        if self.action in ('my', 'delete_image'):
            return [permissions.IsAuthenticated()]
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsCatOwnerOrReadWriteOnly()]

    @extend_schema(
        summary="Получение списка объявления кошек",
        description="Получение списка объявления кошек",
        responses={
            200: OpenApiResponse(response=CatListResponseSerializer, description="Данные о объявления кошек"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
        auth=[],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Получение кошки по ID",
        description="Получение кошки по ID",
        parameters=[
            OpenApiParameter('id', description='ID кошки', required=True, type=int, location='path')
        ],
        responses={
            200: OpenApiResponse(response=CatResponseSerializer, description="Данные о кошке"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
        auth=[],
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Получение кошек текущего пользователя",
        description="Получение кошек текущего пользователя",
        responses={
            200: OpenApiResponse(response=CatListResponseSerializer, description="Данные о кошах"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
    )
    @action(detail=False, methods=['get'])
    def my(self, _, *__, **___):
        queryset = self.get_queryset()
        queryset = queryset.filter(owner=self.request.user)
        page = self.paginate_queryset(queryset)
        if page is None:
            raise NotImplementedError('You have to add paginator class to the ViewSet.')
        serializer = CatReadSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @extend_schema(
        summary="Получение кошек пользователя по ID",
        description="Получение всех кошек указанного пользователя",
        parameters=[
            OpenApiParameter('user_id', description='ID пользователя', required=True, type=int, location='path')
        ],
        responses={
            200: OpenApiResponse(response=CatListResponseSerializer, description="Список кошек пользователя"),
            404: OpenApiResponse(description="Пользователь не найден"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
        auth=[],
    )
    @action(detail=False, methods=['get'], url_path='by-user/(?P<user_id>[^/.]+)')
    def user_cats(self, _, user_id=None):
        user = get_object_or_404(User, id=user_id)

        queryset = self.get_queryset().filter(owner=user)
        page = self.paginate_queryset(queryset)
        if page is None:
            raise NotImplementedError('You have to add paginator class to the ViewSet.')
        serializer = CatReadSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @extend_schema(
        summary="Создание объявление для кошки",
        description="Создание объявление для кошки",
        request=CatWriteSerializer,
        responses={
            201: OpenApiResponse(response=CatWriteSerializer, description="Данные о созданной кошке"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Обновление объявления кошки",
        description="Обновление объявления кошки с введенным ID",
        request=CatWriteSerializer,
        parameters=[
            OpenApiParameter('id', description='ID породы кошки', required=True, type=int, location='path')
        ],
        responses={
            200: OpenApiResponse(response=CatWriteSerializer, description="Данные о кошке"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частичное обновление объявления кошки",
        description="Частичное обновление объявления кошки с введенным ID",
        request=CatWriteSerializer,
        parameters=[
            OpenApiParameter('id', description='ID породы кошки', required=True, type=int, location='path')
        ],
        responses={
            200: OpenApiResponse(response=CatWriteSerializer, description="Данные о породе"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удаление объявления кошки",
        description="Удаление объявления кошки с введенным ID",
        parameters=[
            OpenApiParameter('id', description='ID объявления кошки', required=True, type=int, location='path')
        ],
        responses={
            204: OpenApiResponse(description="Объявление кошки успешно удалено"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @extend_schema(
        summary="Добавление фото кошки",
        description="Добавление фото кошки",
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
                    'is_main_image': {
                        'type': 'boolean',
                        'nullable': False,
                        'description': 'Является главным изображения'
                    }
                }
            }
        },
        parameters=[
            OpenApiParameter('id', description='ID объявления кошки', required=True, type=int, location='path')
        ],
        responses={
            201: OpenApiResponse(response=CatImageResponseSerializer, description="Фото кошки успешно добавлено"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
    )
    @action(detail=True, methods=['post'], url_path='upload-image', url_name='upload_image')
    def upload_image(self, request, **_):
        cat = self.get_object()
        if cat.owner.id != request.user.id:
            raise PermissionDenied()

        serializer = CatImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        image_obj = CatImage(
            cat=cat,
            image=serializer.validated_data['image'],
            is_main=serializer.validated_data['is_main_image'],
        )
        image_obj.save()

        response_serializer = CatImageSerializer(image_obj)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Удаление фото кошки",
        description="Удаление фото кошки. Если фото было главным, то новым главным фото станет самое старое фото.",
        parameters=[
            OpenApiParameter('id', description='ID объявления кошки', required=True, type=int, location='path'),
            OpenApiParameter('image_id', description='ID фото', required=True, type=int, location='path'),
        ],
        responses={
            204: OpenApiResponse(description="Фото кошки успешно удалено"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
    )
    @action(detail=True, methods=['delete'], url_path='images/(?P<image_id>[^/.]+)')
    def delete_image(self, request, pk=None, image_id=None):
        if not IsCatOwnerOrReadWriteOnly().has_object_permission(request, self, request.user):
            raise PermissionDenied(IsCatOwnerOrReadWriteOnly.message)

        # Валидация ID
        if image_id is None:
            raise ValidationError('`image_id` in the URL must be an integer')
        try:
            image_id = int(image_id)
        except ValueError:
            raise ValidationError('`image_id` in the URL must be integer and greater than zero')
        if image_id <= 0:
            raise ValidationError('`image_id` in the URL must be greater than zero')

        # Проверка прав доступа
        try:
            image_obj = CatImage.objects.select_related('cat').get(Q(id=image_id) & Q(cat__id=pk))
        except CatImage.DoesNotExist:
            raise NotFound(f'There are no cat ID={pk} with image ID={image_id}')

        # Если удаленное фото является главным, то заменяем главное изображение
        if image_obj.is_main:
            cat_image = CatImage.objects.filter(cat__id=pk).order_by('uploaded_at').first()
            if cat_image:
                cat_image.is_main = True
                cat_image.save()

        image_obj.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)
