"""
Views for the academics app.

Security model:
    Every queryset is pre-filtered to the authenticated user's data.
    If a user guesses another user's UUID, they receive 404 — not a 403.
    This prevents object-existence leakage.

    Semesters   → filtered by owner == request.user
    Subjects    → filtered by semester__owner == request.user
    Notebooks   → filtered by subject__semester__owner == request.user

Cascading filter:
    GET /api/v1/academics/subjects/?semester_id=<uuid>
        → Returns subjects in that semester, only if it belongs to request.user
    GET /api/v1/academics/notebooks/?subject_id=<uuid>
        → Returns notebooks in that subject, only if it belongs to request.user

All views use ModelViewSet for consistent CRUD behaviour.
"""

import uuid as uuid_lib
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import Semester, Subject, Notebook
from .serializers import SemesterSerializer, SubjectSerializer, NotebookSerializer


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _parse_uuid(value, field_name):
    """
    Parse a UUID string, raising a clean ValidationError on invalid format.
    Prevents raw ValueError / 500 responses from malformed UUIDs.
    """
    try:
        return uuid_lib.UUID(str(value))
    except (ValueError, AttributeError):
        raise ValidationError({field_name: f'Invalid UUID format for {field_name}.'})


# ---------------------------------------------------------------------------
# Semester ViewSet
# ---------------------------------------------------------------------------

class SemesterViewSet(ModelViewSet):
    """
    CRUD for Semesters owned by the authenticated user.

    GET    /api/v1/academics/semesters/         List own semesters
    POST   /api/v1/academics/semesters/         Create a semester
    GET    /api/v1/academics/semesters/{id}/    Retrieve
    PUT    /api/v1/academics/semesters/{id}/    Full update
    PATCH  /api/v1/academics/semesters/{id}/    Partial update
    DELETE /api/v1/academics/semesters/{id}/    Delete (cascades to subjects/notebooks)
    """
    serializer_class = SemesterSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return ONLY the authenticated user's semesters."""
        return Semester.objects.filter(owner=self.request.user).order_by('-created_at')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        subject_count = instance.subjects.count()
        notebook_count = Notebook.objects.filter(
            subject__semester=instance
        ).count()
        self.perform_destroy(instance)
        return Response(
            {
                'message': 'Semester deleted.',
                'deleted_subjects': subject_count,
                'deleted_notebooks': notebook_count,
            },
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Subject ViewSet
# ---------------------------------------------------------------------------

class SubjectViewSet(ModelViewSet):
    """
    CRUD for Subjects scoped to the authenticated user's hierarchy.

    Cascading filter:
        GET /api/v1/academics/subjects/?semester_id=<uuid>
        Returns only subjects in that semester, verified to belong to request.user.
    """
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Base queryset: all subjects whose semester is owned by request.user.
        Optionally filtered by semester_id query param.
        """
        qs = Subject.objects.filter(
            semester__owner=self.request.user
        ).select_related('semester').order_by('name')

        semester_id = self.request.query_params.get('semester_id')
        if semester_id is not None:
            parsed = _parse_uuid(semester_id, 'semester_id')
            # Verify the semester belongs to this user — if not, return empty
            # (never 403, never expose the object's existence to another user)
            qs = qs.filter(semester__id=parsed)

        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        notebook_count = instance.notebooks.count()
        self.perform_destroy(instance)
        return Response(
            {
                'message': 'Subject deleted.',
                'deleted_notebooks': notebook_count,
            },
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Notebook ViewSet
# ---------------------------------------------------------------------------

class NotebookViewSet(ModelViewSet):
    """
    CRUD for Notebooks scoped to the authenticated user's hierarchy.

    Cascading filter:
        GET /api/v1/academics/notebooks/?subject_id=<uuid>
        Returns only notebooks in that subject, verified to belong to request.user.
    """
    serializer_class = NotebookSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Base queryset: all notebooks whose subject → semester is owned by request.user.
        Optionally filtered by subject_id query param.
        """
        qs = Notebook.objects.filter(
            subject__semester__owner=self.request.user
        ).select_related('subject', 'subject__semester').order_by('name')

        subject_id = self.request.query_params.get('subject_id')
        if subject_id is not None:
            parsed = _parse_uuid(subject_id, 'subject_id')
            qs = qs.filter(subject__id=parsed)

        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
