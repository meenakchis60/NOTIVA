"""
Signals for the accounts app.
- Auto-creates a Profile whenever a new User is created.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, Profile


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create a Profile row when a new User is registered."""
    if created:
        Profile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Ensure the profile is saved whenever the User is saved."""
    if hasattr(instance, 'profile'):
        instance.profile.save()
