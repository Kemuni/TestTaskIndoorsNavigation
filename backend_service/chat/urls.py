from rest_framework.routers import DefaultRouter

from .views import DialogViewSet

router = DefaultRouter()
router.register(r'dialog', DialogViewSet, basename='dialog')

urlpatterns = [
    *router.urls,
]
