import uuid
import os
from django.db import models
from django.conf import settings
from academics.models import Notebook
from django.core.validators import FileExtensionValidator


class Tag(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tags')
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default='#000000', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'name'], name='unique_tag_name_per_user')
        ]
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.name:
            self.name = self.name.strip().lower()
        super().save(*args, **kwargs)


class Note(models.Model):
    """
    Note model belonging to a Notebook.
    Ownership is inherited from Notebook -> Subject -> Semester -> User.
    """
    DIFFICULTY_CHOICES = (
        ('BEGINNER', 'BEGINNER'),
        ('INTERMEDIATE', 'INTERMEDIATE'),
        ('ADVANCED', 'ADVANCED'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notebook = models.ForeignKey(
        Notebook,
        on_delete=models.CASCADE,
        related_name='notes'
    )
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True, help_text="Stored in a format suitable for future rich text editors (e.g., HTML or JSON string)")
    is_pinned = models.BooleanField(default=False)
    is_starred = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Phase 4
    tags = models.ManyToManyField(Tag, blank=True, related_name='notes')
    
    is_study_material = models.BooleanField(default=False)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, null=True, blank=True)
    estimated_read_time = models.PositiveIntegerField(null=True, blank=True, help_text="Estimated read time in minutes")
    last_studied_at = models.DateTimeField(null=True, blank=True)

    # Phase 7
    STUDY_STATUS_CHOICES = (
        ('NOT_STARTED', 'NOT_STARTED'),
        ('IN_PROGRESS', 'IN_PROGRESS'),
        ('COMPLETED', 'COMPLETED'),
    )
    study_status = models.CharField(max_length=20, choices=STUDY_STATUS_CHOICES, null=True, blank=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title

    def clean(self):
        from django.core.exceptions import ValidationError
        if not self.is_study_material and self.study_status:
            self.study_status = None

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    @property
    def owner(self):
        return self.notebook.subject.semester.owner


class Checklist(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='checklists')
    title = models.CharField(max_length=255, blank=True)
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['position', 'created_at']

    def __str__(self):
        return self.title


class ChecklistItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    checklist = models.ForeignKey(Checklist, on_delete=models.CASCADE, related_name='items')
    content = models.CharField(max_length=500)
    is_completed = models.BooleanField(default=False)
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['position', 'created_at']

    def __str__(self):
        return self.content


def get_attachment_upload_path(instance, filename):
    return f'attachments/user_{instance.note.owner.id}/{uuid.uuid4()}_{filename}'

class NoteAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='attachments')
    original_filename = models.CharField(max_length=255)
    file = models.FileField(
        upload_to=get_attachment_upload_path,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'webp', 'ppt', 'pptx'])]
    )
    file_size = models.PositiveIntegerField() # in bytes
    content_type = models.CharField(max_length=100)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.original_filename


class NoteVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='versions')
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True)
    version_number = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-version_number']

    def __str__(self):
        return f"{self.note.title} - v{self.version_number}"
