from django.urls import path

from .views import RegisterView, LoginView, MyProfileView, MyTokenRefreshView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='user-register'),
    path('login/', LoginView.as_view(), name='user-login'),
    path('token/refresh/', MyTokenRefreshView.as_view(), name='token-refresh'),
    path('my_profile/', MyProfileView.as_view(), name='user-my-profile'),
]
