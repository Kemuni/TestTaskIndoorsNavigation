from drf_spectacular.utils import extend_schema_serializer
from rest_framework import serializers


class ErrorDetailSerializer(serializers.Serializer):
    """ Сериализатор для деталей ошибки """
    code = serializers.CharField(help_text="Код ошибки")
    message = serializers.CharField(help_text="Сообщение об ошибке")


class BaseResponseSerializer(serializers.Serializer):
    """ Базовый сериализатор всех ответов нашего API """
    success = serializers.BooleanField(required=True, help_text="Успешность операции")
    data = serializers.JSONField(help_text="Основные данные ответа", required=False, allow_null=True)
    error = ErrorDetailSerializer(required=False, allow_null=True)

    def __init__(self, *args, **kwargs):
        if 'data' in kwargs and 'success' not in kwargs and 'instance' not in kwargs:
            data = kwargs.pop('data')
            kwargs['data'] = {
                'success': True,
                'data': data,
                'error': None
            }
        super().__init__(*args, **kwargs)



@extend_schema_serializer(
    exclude_fields=['data'],
)
class ErrorResponseSerializer(serializers.Serializer):
    """ Сериализатор базового ответа нашего API с ошибкой """
    success = serializers.BooleanField(default=False, help_text="Успешность операции")
    data = serializers.JSONField(required=False, allow_null=True)
    error = ErrorDetailSerializer(required=True, allow_null=False)

    def __init__(self, *args, **kwargs):
        if 'data' in kwargs and 'success' not in kwargs and 'instance' not in kwargs:
            data = kwargs.pop('data')
            kwargs['data'] = {
                'success': False,
                'data': [],
                'error': data
            }
        super().__init__(*args, **kwargs)
