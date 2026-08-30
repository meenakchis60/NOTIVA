"""
Serializers for the accounts app.
Handles: registration, user info, profile CRUD, password change.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import Profile

User = get_user_model()


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

class RegisterSerializer(serializers.ModelSerializer):
    """
    Validates and creates a new User.
    Password is write-only and confirmed with a second field.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
    )
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'password', 'password2', 'first_name', 'last_name')
        read_only_fields = ('id',)

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


# ---------------------------------------------------------------------------
# User info (read-only lightweight)
# ---------------------------------------------------------------------------

class UserSerializer(serializers.ModelSerializer):
    """
    Lightweight user representation returned after login and at /auth/me/.
    Does not expose password or internal fields.
    """
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'first_name', 'last_name', 'date_joined', 'last_login')
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

class ProfileSerializer(serializers.ModelSerializer):
    """
    Full profile serializer for GET and PATCH /auth/profile/.
    profile_image is returned as an absolute URL via SerializerMethodField.
    """
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = (
            'id',
            'display_name',
            'bio',
            'profile_image',
            'profile_image_url',
            'theme_preference',
            'email_notifications',
            'in_app_notifications',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'profile_image_url')
        extra_kwargs = {
            'profile_image': {'write_only': True},
        }

    def get_profile_image_url(self, obj):
        request = self.context.get('request')
        if obj.profile_image and request:
            return request.build_absolute_uri(obj.profile_image.url)
        return None


class ProfileImageSerializer(serializers.ModelSerializer):
    """Dedicated serializer for profile image upload (POST /auth/profile/image/)."""
    class Meta:
        model = Profile
        fields = ('profile_image',)

    def validate_profile_image(self, value):
        # Limit to 5 MB
        max_size = 5 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError('Profile image must be smaller than 5 MB.')
        return value


# ---------------------------------------------------------------------------
# Password change
# ---------------------------------------------------------------------------

class ChangePasswordSerializer(serializers.Serializer):
    """Validates the current password and ensures new passwords match."""
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password],
    )
    new_password2 = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({'new_password': 'New passwords do not match.'})
        return attrs
