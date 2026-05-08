from functools import cache

from drf_spectacular.utils import OpenApiResponse, OpenApiExample

from core.serializers import ErrorResponseSerializer


@cache
def get_default_schema_responses() -> dict[int, OpenApiResponse]:
    return {
        400: OpenApiResponse(
            response=ErrorResponseSerializer,
            description="Ошибка запроса",
            examples=[
                OpenApiExample(
                    'Пример вывода',
                    {
                        'success': False,
                        'data': [],
                        'errors': {
                            'code': 'InvalidResponse',
                            'detail': 'details of invalid response',
                        }
                    },
                )
            ],
        ),
        401: OpenApiResponse(
            response=ErrorResponseSerializer,
            description="Неавторизованный доступ",
            examples=[
                OpenApiExample(
                    'Пример вывода',
                    {
                        'success': False,
                        'data': [],
                        'errors': {
                            'code': 'NotAuthenticated',
                            'detail': 'NotAuthenticated',
                        }
                    },
                )
            ],
        ),
        422: OpenApiResponse(
            response=ErrorResponseSerializer,
            description="Ошибка валидации (неверные данные тела запроса)",
            examples=[
                OpenApiExample(
                    'Пример вывода',
                    {
                        'success': False,
                        'data': [],
                        'errors': {
                            'code': 'ValidationError',
                            'detail': 'field email must be unique.',
                        }
                    },
                )
            ],
        ),
    }
