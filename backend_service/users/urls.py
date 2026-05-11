from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import RegisterView, LoginView, ProfileView, MyTokenRefreshView

router = DefaultRouter()
router.register(r'profile', ProfileView, basename='profile')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='user-register'),
    path('login/', LoginView.as_view(), name='user-login'),
    path('token/refresh/', MyTokenRefreshView.as_view(), name='token-refresh'),
    *router.urls,
]
