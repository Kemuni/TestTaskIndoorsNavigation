from rest_framework import permissions

from cats.models import Cat


class IsCatOwnerOrReadWriteOnly(permissions.BasePermission):
    """
    Разрешает взаимодействие с моделью Cat, если выполнен хотя бы один из пунктов:
    - Чтение и Создание доступно для всех авторизованных.
    - Изменение и удаление доступно только владельцам данных моделей, либо администраторам (is_superuser).
    """
    message = 'Only cat owners can edit/delete this cat model, other authorized users can only read or create.'

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS + ('POST',):
            return request.user and request.user.is_authenticated

        return request.user.is_superuser or Cat.objects.filter(id=obj.id, owner__id=request.user.id).exists()
