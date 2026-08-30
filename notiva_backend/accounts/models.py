import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model.
    - Uses email as the primary login identifier (in addition to username).
    - All owned resources (semesters, notes, tasks, etc.) FK back to this model.
    - Deleting a user cascades to all owned resources via FK on_delete=CASCADE.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)

    # Make email the canonical identifier for display purposes.
    # username remains for Django internals (admin, etc.).
    REQUIRED_FIELDS = ['username']
    USERNAME_FIELD = 'email'

    class Meta:
        db_table = 'accounts_user'
        ordering = ['-date_joined']

    def __str__(self):
        return self.email


class Profile(models.Model):
    """
    Extended user profile. Auto-created via post_save signal on User creation.
    Stores preferences (theme) and additional personal info.
    Deleting the User cascades and removes the Profile.
    """

    THEME_CHOICES = [
        ('light', 'Light'),
        ('dark', 'Dark'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    display_name = models.CharField(max_length=150, blank=True)
    bio = models.TextField(blank=True)
    profile_image = models.ImageField(
        upload_to='profiles/',
        null=True,
        blank=True,
    )
    theme_preference = models.CharField(
        max_length=10,
        choices=THEME_CHOICES,
        default='light',
    )
    email_notifications = models.BooleanField(default=True)
    in_app_notifications = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_profile'

    def __str__(self):
        return f"Profile({self.user.email})"
