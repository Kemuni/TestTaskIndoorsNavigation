from rest_framework.routers import DefaultRouter

from .views import BreedViewSet, CatViewSet

router = DefaultRouter()
router.register(r'breed', BreedViewSet, basename='breed')
router.register(r'cat', CatViewSet, basename='cat')

urlpatterns = [
    *router.urls,
]
