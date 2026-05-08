from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from cats.models import Breed, Cat
from cats.serializers import (
    BreedSerializer,
    BreedListResponseSerializer,
    BreedResponseSerializer,
    CatReadSerializer,
    CatListResponseSerializer,
    CatWriteSerializer,
    CatResponseSerializer,
)
from core.mixins import BaseResponseDataFormatMixin
from core.swagger_utils import get_default_schema_responses


class BreedViewSet(BaseResponseDataFormatMixin, viewsets.ModelViewSet):
    """ ViewSet для работы с породами кошек """
    SCHEMA_TAG = 'Breed'
    queryset = Breed.objects.all()
    serializer_class = BreedSerializer
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Получение списка пород кошек",
        description="Получение списка пород кошек",
        responses={
            200: OpenApiResponse(response=BreedListResponseSerializer,description="Данные о породах"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

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
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

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
        return super().update(self, request, *args, **kwargs)

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
        return super().partial_update(self, request, *args, **kwargs)

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
        return super().destroy(self, request, *args, **kwargs)

    @extend_schema(
        summary="Получение всех кошек с породой с введенным ID",
        description="Получение всех кошек с породой с введенным ID",
        parameters=[
            OpenApiParameter('id', description='ID породы кошки', required=True, type=int, location='path')
        ],
        responses={
            200: OpenApiResponse(response=CatListResponseSerializer, description="Данные о кошек с определенной породой"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
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


class CatViewSet(BaseResponseDataFormatMixin, viewsets.ModelViewSet):
    """ ViewSet для работы с объявлениями кошек """
    SCHEMA_TAG = 'Cat'
    queryset = Cat.objects.select_related('breed', 'owner', 'mother', 'father').all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return CatReadSerializer if self.action in ('list', 'retrieve') else CatWriteSerializer

    @extend_schema(
        summary="Получение списка объявления кошек",
        description="Получение списка объявления кошек",
        responses={
            200: OpenApiResponse(response=CatListResponseSerializer, description="Данные о объявления кошек"),
            **get_default_schema_responses(),
        },
        tags=[SCHEMA_TAG],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

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
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

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
        return super().update(self, request, *args, **kwargs)

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
        return super().partial_update(self, request, *args, **kwargs)

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
        return super().destroy(self, request, *args, **kwargs)
