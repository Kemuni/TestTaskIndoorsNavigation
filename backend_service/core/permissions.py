from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Устанавливает следующее:
    - Чтение доступно для всех авторизованных пользователей.
    - Изменение, удаление и создание только для администраторов (is_superuser).
    """
    message = 'Only admins can send write requests, other authorized users can only read.'

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        return request.user and request.user.is_superuser
