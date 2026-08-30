import uuid
import os
from django.db import models
from django.conf import settings
from notes.models import Note

class StudyGroup(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_groups')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class GroupMember(models.Model):
    ROLE_CHOICES = (
        ('admin', 'admin'),
        ('member', 'member'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='group_memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['group', 'user'], name='unique_group_member')
        ]

    def __str__(self):
        return f"{self.user.email} in {self.group.name}"

class SharedNote(models.Model):
    PERMISSION_CHOICES = (
        ('view', 'view'),
        ('edit', 'edit'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='shared_in_groups')
    group = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name='shared_notes', null=True, blank=True)
    shared_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='notes_shared_by')
    permission = models.CharField(max_length=20, choices=PERMISSION_CHOICES, default='view')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['note', 'group'], name='unique_note_per_group')
        ]

    def __str__(self):
        return f"{self.note.title} shared in {self.group.name if self.group else 'Direct'}"

def get_shared_file_path(instance, filename):
    return f'shared_files/group_{instance.group.id}/{uuid.uuid4()}_{filename}'

class SharedFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name='files')
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='uploaded_shared_files')
    file = models.FileField(upload_to=get_shared_file_path)
    original_filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField()
    mime_type = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.original_filename

class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='comments')
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    content = models.TextField()
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author.email if self.author else 'Unknown'} on {self.note.title}"
