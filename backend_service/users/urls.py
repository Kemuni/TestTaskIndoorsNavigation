from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import RegisterView, LoginView, ProfileViewSet, MyTokenRefreshView, IsEmailFreeView

router = DefaultRouter()
router.register(r'profile', ProfileViewSet, basename='profile_read')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='user-register'),
    path('login/', LoginView.as_view(), name='user-login'),
    path('is_email_free/', IsEmailFreeView.as_view(), name='is-email-free'),
    path('token/refresh/', MyTokenRefreshView.as_view(), name='token-refresh'),
    *router.urls,
]
