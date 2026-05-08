from rest_framework.request import Request
from rest_framework.response import Response

from core.serializers import BaseResponseSerializer


class BaseResponseDataFormatMixin:
    """ Оборачивает все запросы в структуру {"success": bool, "data": dict | None, "errors": dict | None} """

    def finalize_response(self, request: Request, response, *args, **kwargs):
        if isinstance(response, Response):
            if 200 <= response.status_code <= 299:
                modified_response_data = BaseResponseSerializer({
                    'success': True,
                    'data': response.data,
                    'error': None,
                }).data
            else:
                modified_response_data = BaseResponseSerializer({
                    'success': False,
                    'data': None,
                    # Если exception_handler уже обработал ошибку, то берем только response.data['error']
                    'error': response.data['error'] if 'data' in response.data else response.data,
                }).data
            response.data = modified_response_data

        return super().finalize_response(request, response, *args, **kwargs)
