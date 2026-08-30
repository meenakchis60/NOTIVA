"""
Views for the accounts app.

Endpoints:
    POST   /api/v1/auth/register/          Register a new user
    POST   /api/v1/auth/login/             Obtain JWT token pair
    POST   /api/v1/auth/token/refresh/     Refresh access token
    POST   /api/v1/auth/logout/            Blacklist refresh token (logout)
    GET    /api/v1/auth/me/                Current authenticated user info
    GET    /api/v1/auth/profile/           Get own profile
    PATCH  /api/v1/auth/profile/           Update own profile
    POST   /api/v1/auth/profile/image/     Upload / replace profile image
    POST   /api/v1/auth/change-password/   Change password

Ownership isolation:
    All views require IsAuthenticated. Profile views additionally verify
    object-level ownership via the IsOwner permission class.
"""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

from .models import Profile
from .permissions import IsOwner
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    ProfileSerializer,
    ProfileImageSerializer,
    ChangePasswordSerializer,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

class RegisterView(GenericAPIView):
    """
    POST /api/v1/auth/register/
    Creates a new user. Returns user info and JWT token pair on success.
    No authentication required.
    """
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Issue JWT tokens immediately so the user is logged in after registration
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': UserSerializer(user, context={'request': request}).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'Registration successful.',
            },
            status=status.HTTP_201_CREATED,
        )


# ---------------------------------------------------------------------------
# Login (token obtain)
# ---------------------------------------------------------------------------

class LoginView(TokenObtainPairView):
    """
    POST /api/v1/auth/login/
    Authenticates with email + password, returns JWT access + refresh tokens.
    Extends SimpleJWT's TokenObtainPairView to include user info in response.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        user = serializer.user
        return Response(
            {
                'user': UserSerializer(user, context={'request': request}).data,
                'refresh': serializer.validated_data['refresh'],
                'access': serializer.validated_data['access'],
            },
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Blacklists the provided refresh token, effectively logging the user out.
    The client must also discard the access token locally.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'error': 'Refresh token is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response(
                {'error': 'Invalid or already blacklisted token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({'message': 'Logout successful.'}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Current user info
# ---------------------------------------------------------------------------

class MeView(APIView):
    """
    GET /api/v1/auth/me/
    Returns the currently authenticated user's basic info.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# Profile CRUD
# ---------------------------------------------------------------------------

class ProfileView(APIView):
    """
    GET    /api/v1/auth/profile/   Returns the authenticated user's profile.
    PATCH  /api/v1/auth/profile/   Updates name, bio, theme, notification prefs.
    """
    permission_classes = [IsAuthenticated, IsOwner]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_profile(self, user):
        """Retrieve profile, creating it if it somehow does not exist."""
        profile, _ = Profile.objects.get_or_create(user=user)
        return profile

    def get(self, request, *args, **kwargs):
        profile = self.get_profile(request.user)
        self.check_object_permissions(request, profile)
        serializer = ProfileSerializer(profile, context={'request': request})
        return Response(serializer.data)

    def patch(self, request, *args, **kwargs):
        profile = self.get_profile(request.user)
        self.check_object_permissions(request, profile)
        serializer = ProfileSerializer(
            profile,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# Profile image upload
# ---------------------------------------------------------------------------

class ProfileImageView(APIView):
    """
    POST /api/v1/auth/profile/image/
    Accepts multipart/form-data with a 'profile_image' field.
    Replaces the existing profile image.
    """
    permission_classes = [IsAuthenticated, IsOwner]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        self.check_object_permissions(request, profile)
        serializer = ProfileImageSerializer(
            profile,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                'message': 'Profile image updated.',
                'profile_image_url': (
                    request.build_absolute_uri(profile.profile_image.url)
                    if profile.profile_image else None
                ),
            },
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Change password
# ---------------------------------------------------------------------------

class ChangePasswordView(APIView):
    """
    POST /api/v1/auth/change-password/
    Validates the current password and sets a new one.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'old_password': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response(
            {'message': 'Password changed successfully.'},
            status=status.HTTP_200_OK,
        )
