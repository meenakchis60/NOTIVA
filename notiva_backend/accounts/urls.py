"""
URL patterns for the accounts app.
All routes are mounted under /api/v1/auth/ (see notiva/api_urls.py).
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    MeView,
    ProfileView,
    ProfileImageView,
    ChangePasswordView,
)

urlpatterns = [
    # Authentication
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),

    # Current user
    path('me/', MeView.as_view(), name='auth-me'),

    # Profile
    path('profile/', ProfileView.as_view(), name='auth-profile'),
    path('profile/image/', ProfileImageView.as_view(), name='auth-profile-image'),

    # Password
    path('change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
]
