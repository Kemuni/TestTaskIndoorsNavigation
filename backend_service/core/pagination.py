from rest_framework import pagination


class PageNumberPagination(pagination.PageNumberPagination):
    """ Дефолтный PageNumberPagination из DRF, но с доработанной Open API схемой """
    page_size_query_param = 'page_size'
    max_page_size = 500
    page_query_description = 'Номер страницы в разбитом наборе.'
    page_size_query_description = 'Максимальное количество объектов на одной странице'

    def get_paginated_response_schema(self, schema):
        # HACK - Следует добавить динамическое определение schema на основе BaseResponseSerializer
        default_schema = super().get_paginated_response_schema(schema)
        return {
            'type': 'object',
            'required': ['success', 'data'],
            'properties': {
                'success': {
                    'type': 'boolean',
                    'example': True,
                },
                'data': default_schema,
                'error': {
                    'type': 'object',
                    'nullable': True,
                    'example': None,
                },
            },
        }
