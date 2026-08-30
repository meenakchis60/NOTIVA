"""
Models for the academics app.

Hierarchy:
    User
     └── Semester
           └── Subject
                 └── Notebook

Ownership rules:
    - Semester.owner = User (direct FK)
    - Subject inherits ownership through Semester.owner
    - Notebook inherits ownership through Subject → Semester.owner
    - No duplicate owner FKs on Subject or Notebook — ownership is always
      resolved by traversing the hierarchy (prevents data drift)

Deletion behavior:
    - Deleting a Semester CASCADE-deletes its Subjects
    - Deleting a Subject CASCADE-deletes its Notebooks
    - Future Note objects will be CASCADE-deleted from Notebooks

Security:
    - All querysets in views are pre-filtered to the authenticated user's
      hierarchy, so cross-user data is never returned even if an ID is guessed
"""

import uuid
from django.conf import settings
from django.db import models


class Semester(models.Model):
    """
    Top-level academic grouping owned directly by a User.
    A user can have many semesters. Duplicate names per user are prevented
    by a unique_together constraint.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='semesters',
    )
    name = models.CharField(max_length=200)
    academic_year = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'academics_semester'
        ordering = ['-created_at']
        # A user cannot have two semesters with the same name.
        # Different users may reuse the same name freely.
        constraints = [
            models.UniqueConstraint(
                fields=['owner', 'name'],
                name='unique_semester_per_user',
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.owner.email})"


class Subject(models.Model):
    """
    Academic subject belonging to exactly one Semester.
    Ownership is inherited through Semester.owner — no duplicate user FK needed.
    Duplicate names are prevented per Semester.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    semester = models.ForeignKey(
        Semester,
        on_delete=models.CASCADE,
        related_name='subjects',
    )
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'academics_subject'
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['semester', 'name'],
                name='unique_subject_per_semester',
            )
        ]

    def __str__(self):
        return f"{self.name} — {self.semester.name}"

    @property
    def owner(self):
        """Convenience accessor — resolves ownership through the hierarchy."""
        return self.semester.owner


class Notebook(models.Model):
    """
    Academic notebook (or unit) belonging to exactly one Subject.
    Ownership is inherited through Subject → Semester.owner.
    Duplicate names are prevented per Subject.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='notebooks',
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'academics_notebook'
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['subject', 'name'],
                name='unique_notebook_per_subject',
            )
        ]

    def __str__(self):
        return f"{self.name} — {self.subject.name}"

    @property
    def owner(self):
        """Convenience accessor — resolves ownership through the hierarchy."""
        return self.subject.semester.owner
