from django.contrib.auth import get_user_model
from rest_framework import permissions

User = get_user_model()

class IsProfileOwner(permissions.BasePermission):
    """
    Разрешает взаимодействие с моделью User, если пользователь является его владельцем или super_user.
    """
    message = 'You can edit only your profile.'

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        return request.user and request.user.is_superuser

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        return request.user and request.user.is_superuser or request.user.id == obj.id
