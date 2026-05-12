from rest_framework.routers import DefaultRouter

from .views import BreedViewSet, CatViewSet, FavouriteCatViewSet

router = DefaultRouter()
router.register(r'breed', BreedViewSet, basename='breed')
router.register(r'cat', CatViewSet, basename='cat')
router.register(r'favourite-cat', FavouriteCatViewSet, basename='favourite-cat')

urlpatterns = [
    *router.urls,
]
