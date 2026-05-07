import logging

from django.db import IntegrityError
from rest_framework import status
from rest_framework.exceptions import ValidationError, APIException
from rest_framework.request import Request
from rest_framework.response import Response

from core.serializers import BaseResponseSerializer


logger = logging.getLogger(__name__)

def exception_handler(exc, context):
    error_details = {
        'code': 'UNKNOWN',
        'message': 'Unexpected error. Please try again later.'
    }
    http_status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR

    # Обработка различных типов ошибок
    if isinstance(exc, ValidationError):
        error_details["code"] = "VALIDATION_ERROR"
        error_details["message"] = ""
        if isinstance(exc.detail, dict):
            # Handle field-specific errors (e.g., {"email": [...], "password": [...]})
            for field, errors in exc.detail.items():
                for error in errors:
                    error_details["message"] += f'{str(field)}: {str(error)}; '
        elif isinstance(exc.detail, list):
            # Handle non-field errors (e.g., ["Invalid data"])
            for error in exc.detail:
                error_details["message"] += f'{str(error)}; '

        error_details["message"] = error_details["message"].strip()
        http_status_code = status.HTTP_422_UNPROCESSABLE_ENTITY

    elif isinstance(exc, APIException):
        error_details["code"] = error_details["message"] = str(exc.__class__.__name__)
        http_status_code = getattr(exc, 'status_code', status.HTTP_400_BAD_REQUEST)

    elif isinstance(exc, IntegrityError):
        # Ошибки базы данных
        error_details["code"] = "DATABASE_INTEGRITY_ERROR"
        error_details["message"] = str(exc)
        http_status_code = status.HTTP_409_CONFLICT

    elif isinstance(exc, PermissionError):
        error_details["code"] = "PERMISSION_DENIED"
        error_details["message"] = "You do not have permission for this."
        http_status_code = status.HTTP_403_FORBIDDEN

    request: Request = context['request']
    logger.error(f"{request.method} request to {request.get_full_path()} failed: {exc}", exc_info=True)

    return Response(
        BaseResponseSerializer({
            'success': False,
            'data': None,
            'error': error_details
        }).data,
        status=http_status_code
    )
