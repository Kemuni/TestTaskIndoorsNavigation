from rest_framework.routers import DefaultRouter

from .views import ReadBreedViewSet, WriteBreedViewSet, ReadCatViewSet, WriteCatViewSet

router = DefaultRouter()
router.register(r'breed', ReadBreedViewSet, basename='breed_read')
router.register(r'breed', WriteBreedViewSet, basename='breed_write')
router.register(r'cat', ReadCatViewSet, basename='cat_read')
router.register(r'cat', WriteCatViewSet, basename='cat_write')

urlpatterns = [
    *router.urls,
]
