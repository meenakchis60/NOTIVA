"""
Serializers for the academics app.

Security contract:
    - The backend NEVER trusts a parent ID from the frontend without verification.
    - Every FK field (semester, subject) is validated to belong to the
      authenticated request.user before the object is created or updated.
    - Validation errors are clear and do not expose internal DB exceptions.
    - The request context is REQUIRED by Subject and Notebook serializers.
"""

from rest_framework import serializers
from .models import Semester, Subject, Notebook


# ---------------------------------------------------------------------------
# Semester
# ---------------------------------------------------------------------------

class SemesterSerializer(serializers.ModelSerializer):
    """
    Serializer for Semester CRUD.
    - owner is set automatically from request.user (never from client input).
    - Duplicate name validation is handled at the model level (UniqueConstraint)
      but we provide a clean message here.
    """
    owner_email = serializers.EmailField(source='owner.email', read_only=True)

    class Meta:
        model = Semester
        fields = ('id', 'name', 'academic_year', 'owner_email', 'created_at', 'updated_at')
        read_only_fields = ('id', 'owner_email', 'created_at', 'updated_at')

    def validate_name(self, value):
        """Ensure names are not blank after stripping."""
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Semester name cannot be blank.')
        return value

    def validate(self, attrs):
        """
        Check uniqueness of (owner, name) at the serializer level for clean errors.
        This duplicates the DB constraint check but avoids IntegrityError bubbling.
        """
        request = self.context['request']
        name = attrs.get('name', getattr(self.instance, 'name', None))
        qs = Semester.objects.filter(owner=request.user, name=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                {'name': 'You already have a semester with this name.'}
            )
        return attrs

    def create(self, validated_data):
        """Inject the owner from the request context."""
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


# ---------------------------------------------------------------------------
# Subject
# ---------------------------------------------------------------------------

class SubjectSerializer(serializers.ModelSerializer):
    """
    Serializer for Subject CRUD.
    - semester field is validated to belong to request.user.
    - If a malicious or mistaken UUID is supplied, a clean error is returned.
    """
    semester_name = serializers.CharField(source='semester.name', read_only=True)
    semester_id = serializers.UUIDField(source='semester.id', read_only=True)

    class Meta:
        model = Subject
        fields = (
            'id', 'semester', 'semester_id', 'semester_name',
            'name', 'code', 'description',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'semester_id', 'semester_name', 'created_at', 'updated_at')
        extra_kwargs = {
            'semester': {'write_only': True},
        }

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Subject name cannot be blank.')
        return value

    def validate_semester(self, semester):
        """
        Ensure the semester belongs to the authenticated user.
        Returns 400 with a clean message — never exposes another user's semester.
        """
        request = self.context['request']
        if semester.owner != request.user:
            raise serializers.ValidationError(
                'You do not have access to this semester.'
            )
        return semester

    def validate(self, attrs):
        """Check uniqueness of (semester, name) for a clean error message."""
        semester = attrs.get('semester', getattr(self.instance, 'semester', None))
        name = attrs.get('name', getattr(self.instance, 'name', None))
        if semester and name:
            qs = Subject.objects.filter(semester=semester, name=name)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {'name': 'A subject with this name already exists in this semester.'}
                )
        return attrs


# ---------------------------------------------------------------------------
# Notebook
# ---------------------------------------------------------------------------

class NotebookSerializer(serializers.ModelSerializer):
    """
    Serializer for Notebook CRUD.
    - subject field is validated to belong to request.user's hierarchy.
    """
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_id = serializers.UUIDField(source='subject.id', read_only=True)
    semester_name = serializers.CharField(
        source='subject.semester.name', read_only=True
    )
    semester_id = serializers.UUIDField(
        source='subject.semester.id', read_only=True
    )

    class Meta:
        model = Notebook
        fields = (
            'id', 'subject', 'subject_id', 'subject_name',
            'semester_id', 'semester_name',
            'name', 'description',
            'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'subject_id', 'subject_name',
            'semester_id', 'semester_name',
            'created_at', 'updated_at',
        )
        extra_kwargs = {
            'subject': {'write_only': True},
        }

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Notebook name cannot be blank.')
        return value

    def validate_subject(self, subject):
        """
        Ensure the subject's semester belongs to the authenticated user.
        Returns 400 with a clean message — never exposes cross-user data.
        """
        request = self.context['request']
        if subject.semester.owner != request.user:
            raise serializers.ValidationError(
                'You do not have access to this subject.'
            )
        return subject

    def validate(self, attrs):
        """Check uniqueness of (subject, name) for a clean error message."""
        subject = attrs.get('subject', getattr(self.instance, 'subject', None))
        name = attrs.get('name', getattr(self.instance, 'name', None))
        if subject and name:
            qs = Notebook.objects.filter(subject=subject, name=name)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {'name': 'A notebook with this name already exists in this subject.'}
                )
        return attrs
