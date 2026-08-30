import uuid
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django.shortcuts import get_object_or_404

from .models import Note, Tag, Checklist, ChecklistItem, NoteAttachment, NoteVersion
from .serializers import (
    NoteSerializer, NoteMoveSerializer, NoteTagsActionSerializer,
    TagSerializer, ChecklistSerializer, ChecklistItemSerializer,
    NoteAttachmentSerializer, NoteVersionSerializer
)


def _parse_uuid(value, field_name):
    try:
        return uuid.UUID(str(value))
    except (ValueError, AttributeError):
        raise ValidationError({field_name: f'Invalid UUID format for {field_name}.'})


class TagViewSet(ModelViewSet):
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Tag.objects.filter(user=self.request.user)


class ChecklistViewSet(ModelViewSet):
    serializer_class = ChecklistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Checklist.objects.filter(note__notebook__subject__semester__owner=self.request.user)
        
    def perform_create(self, serializer):
        note_id = self.kwargs.get('note_id')
        note = get_object_or_404(Note, id=note_id, notebook__subject__semester__owner=self.request.user)
        serializer.save(note=note)


class ChecklistItemViewSet(ModelViewSet):
    serializer_class = ChecklistItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChecklistItem.objects.filter(checklist__note__notebook__subject__semester__owner=self.request.user)

    def perform_create(self, serializer):
        checklist_id = self.kwargs.get('checklist_id')
        checklist = get_object_or_404(Checklist, id=checklist_id, note__notebook__subject__semester__owner=self.request.user)
        serializer.save(checklist=checklist)


class NoteAttachmentViewSet(ModelViewSet):
    serializer_class = NoteAttachmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return NoteAttachment.objects.filter(note__notebook__subject__semester__owner=self.request.user)
        
    def perform_create(self, serializer):
        note_id = self.kwargs.get('note_id')
        note = get_object_or_404(Note, id=note_id, notebook__subject__semester__owner=self.request.user)
        file = self.request.data.get('file')
        if not file:
            raise ValidationError({'file': 'No file provided'})
            
        serializer.save(
            note=note,
            original_filename=file.name,
            file_size=file.size,
            content_type=file.content_type
        )


class NoteVersionViewSet(ModelViewSet):
    serializer_class = NoteVersionSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post']

    def get_queryset(self):
        qs = NoteVersion.objects.filter(note__notebook__subject__semester__owner=self.request.user)
        if 'note_id' in self.kwargs:
            qs = qs.filter(note_id=self.kwargs['note_id'])
        return qs

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        version = self.get_object()
        note = version.note
        
        # Save current state as a new version before restoring
        last_version = NoteVersion.objects.filter(note=note).order_by('-version_number').first()
        v_num = (last_version.version_number + 1) if last_version else 1
        NoteVersion.objects.create(
            note=note,
            title=note.title,
            content=note.content,
            version_number=v_num
        )
        
        # Restore version
        note.title = version.title
        note.content = version.content
        note.save()
        
        return Response({'message': 'Version restored successfully'})


class NoteViewSet(ModelViewSet):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Note.objects.filter(notebook__subject__semester__owner=user)
        qs = qs.prefetch_related('tags')
        
        # Base Filters
        archived = self.request.query_params.get('archived', 'false').lower() == 'true'
        deleted = self.request.query_params.get('deleted', 'false').lower() == 'true'
        
        bypass_state_filters = self.action in ['restore', 'permanent_delete', 'unarchive', 'retrieve', 'update', 'partial_update', 'destroy', 'tags_add', 'tags_remove']

        if bypass_state_filters:
            pass
        else:
            if deleted:
                qs = qs.filter(is_deleted=True)
            else:
                qs = qs.filter(is_deleted=False)
                if archived:
                    qs = qs.filter(is_archived=True)
                else:
                    qs = qs.filter(is_archived=False)

        # Academic Hierarchy Filters
        semester_id = self.request.query_params.get('semester_id')
        if semester_id:
            parsed = _parse_uuid(semester_id, 'semester_id')
            qs = qs.filter(notebook__subject__semester_id=parsed)

        subject_id = self.request.query_params.get('subject_id')
        if subject_id:
            parsed = _parse_uuid(subject_id, 'subject_id')
            qs = qs.filter(notebook__subject_id=parsed)

        notebook_id = self.request.query_params.get('notebook_id')
        if notebook_id:
            parsed = _parse_uuid(notebook_id, 'notebook_id')
            qs = qs.filter(notebook_id=parsed)

        # Phase 4 Filters
        tag_id = self.request.query_params.get('tag_id')
        if tag_id:
            parsed = _parse_uuid(tag_id, 'tag_id')
            qs = qs.filter(tags__id=parsed)
            
        study_material = self.request.query_params.get('study_material')
        if study_material is not None:
            qs = qs.filter(is_study_material=(study_material.lower() == 'true'))
            
        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            qs = qs.filter(difficulty=difficulty.upper())

        # State filters
        pinned = self.request.query_params.get('pinned')
        if pinned is not None:
            qs = qs.filter(is_pinned=(pinned.lower() == 'true'))

        starred = self.request.query_params.get('starred')
        if starred is not None:
            qs = qs.filter(is_starred=(starred.lower() == 'true'))

        # Ordering
        ordering = self.request.query_params.get('ordering')
        valid_orderings = {
            'newest': '-created_at',
            'oldest': 'created_at',
            'updated': '-updated_at',
            'title_asc': 'title',
            'title_desc': '-title',
            '-updated_at': '-updated_at'
        }
        
        if ordering in valid_orderings:
            qs = qs.order_by(valid_orderings[ordering])
        else:
            qs = qs.order_by('-is_pinned', '-updated_at')

        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['delete'], url_path='permanent')
    def permanent_delete(self, request, pk=None):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        instance = self.get_object()
        instance.is_deleted = False
        instance.deleted_at = None
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        instance = self.get_object()
        instance.is_archived = True
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unarchive(self, request, pk=None):
        instance = self.get_object()
        instance.is_archived = False
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def pin(self, request, pk=None):
        instance = self.get_object()
        instance.is_pinned = True
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unpin(self, request, pk=None):
        instance = self.get_object()
        instance.is_pinned = False
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def star(self, request, pk=None):
        instance = self.get_object()
        instance.is_starred = True
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unstar(self, request, pk=None):
        instance = self.get_object()
        instance.is_starred = False
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        instance = self.get_object()
        
        base_title = f"{instance.title} (Copy)"
        new_title = base_title
        counter = 1
        
        while Note.objects.filter(notebook=instance.notebook, title=new_title).exists():
            counter += 1
            new_title = f"{base_title} {counter}"
            
        new_note = Note.objects.create(
            notebook=instance.notebook,
            title=new_title,
            content=instance.content
        )
        # Duplicate tags too (as a nice feature, but the spec didn't forbid it)
        new_note.tags.set(instance.tags.all())
        
        serializer = self.get_serializer(new_note)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        instance = self.get_object()
        serializer = NoteMoveSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        instance.notebook = serializer.validated_data['notebook']
        instance.save()
        
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=['post'], url_path='tags')
    def tags_add(self, request, pk=None):
        instance = self.get_object()
        serializer = NoteTagsActionSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        instance.tags.add(*serializer.validated_data['tag_ids'])
        return Response(self.get_serializer(instance).data)

    @tags_add.mapping.delete
    def tags_remove(self, request, pk=None):
        instance = self.get_object()
        serializer = NoteTagsActionSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        instance.tags.remove(*serializer.validated_data['tag_ids'])
        return Response(self.get_serializer(instance).data)
