import uuid
from django.db import models
from django.conf import settings
from notes.models import Note

class StudySession(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'ACTIVE'),
        ('COMPLETED', 'COMPLETED'),
        ('CANCELLED', 'CANCELLED'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='study_sessions')
    note = models.ForeignKey(Note, on_delete=models.SET_NULL, null=True, blank=True, related_name='study_sessions')
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-started_at']
        constraints = [
            models.UniqueConstraint(fields=['user'], condition=models.Q(status='ACTIVE'), name='unique_active_session_per_user')
        ]

    def __str__(self):
        return f"{self.user} - {self.status} - {self.started_at}"

class StudyGoal(models.Model):
    GOAL_TYPE_CHOICES = (
        ('DAILY_STUDY_TIME', 'DAILY_STUDY_TIME'),
        ('WEEKLY_STUDY_TIME', 'WEEKLY_STUDY_TIME'),
        ('NOTES_COMPLETED', 'NOTES_COMPLETED'),
        ('CUSTOM', 'CUSTOM'),
    )
    STATUS_CHOICES = (
        ('ACTIVE', 'ACTIVE'),
        ('COMPLETED', 'COMPLETED'),
        ('EXPIRED', 'EXPIRED'),
        ('CANCELLED', 'CANCELLED'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='study_goals')
    title = models.CharField(max_length=255)
    goal_type = models.CharField(max_length=50, choices=GOAL_TYPE_CHOICES)
    target_value = models.PositiveIntegerField()
    current_value = models.PositiveIntegerField(default=0)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.title} - {self.user}"

class Reminder(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'PENDING'),
        ('COMPLETED', 'COMPLETED'),
        ('DISMISSED', 'DISMISSED'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reminders')
    note = models.ForeignKey(Note, on_delete=models.SET_NULL, null=True, blank=True, related_name='reminders')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    remind_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['remind_at']

    def __str__(self):
        return f"{self.title} - {self.remind_at}"
