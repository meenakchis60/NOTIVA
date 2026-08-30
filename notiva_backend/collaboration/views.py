from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import StudyGroup, GroupMember, SharedNote, SharedFile, Comment
from notes.models import Note
from .serializers import (
    StudyGroupSerializer, GroupMemberSerializer, SharedNoteSerializer,
    SharedFileSerializer, CommentSerializer
)
from django.contrib.auth import get_user_model

User = get_user_model()

class StudyGroupViewSet(viewsets.ModelViewSet):
    serializer_class = StudyGroupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # User can see groups they created or are members of
        return StudyGroup.objects.filter(
            Q(created_by=self.request.user) | Q(members__user=self.request.user)
        ).distinct()

    def perform_create(self, serializer):
        group = serializer.save()
        # Automatically make creator an admin member
        GroupMember.objects.create(group=group, user=self.request.user, role='admin')

class GroupMemberViewSet(viewsets.ModelViewSet):
    serializer_class = GroupMemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        group_id = self.kwargs.get('group_pk')
        return GroupMember.objects.filter(group_id=group_id, group__members__user=self.request.user).distinct()

    def perform_create(self, serializer):
        group = get_object_or_404(StudyGroup, id=self.kwargs.get('group_pk'))
        # Only admins can add members
        if not GroupMember.objects.filter(group=group, user=self.request.user, role='admin').exists() and group.created_by != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only group admins can add members.")
        
        user_email = serializer.initial_data.get('user_email')
        if user_email:
            user = get_object_or_404(User, email=user_email)
            serializer.save(group=group, user=user)
        else:
            serializer.save(group=group)

class SharedNoteViewSet(viewsets.ModelViewSet):
    serializer_class = SharedNoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        group_id = self.kwargs.get('group_pk')
        return SharedNote.objects.filter(group_id=group_id, group__members__user=self.request.user).distinct()

    def perform_create(self, serializer):
        group = get_object_or_404(StudyGroup, id=self.kwargs.get('group_pk'))
        note = serializer.validated_data.get('note')
        
        # User must own the note to share it
        if note.notebook.subject.semester.owner != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only share notes you own.")
        
        serializer.save(group=group, shared_by=self.request.user)

class SharedFileViewSet(viewsets.ModelViewSet):
    serializer_class = SharedFileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        group_id = self.kwargs.get('group_pk')
        return SharedFile.objects.filter(group_id=group_id, group__members__user=self.request.user).distinct()

    def perform_create(self, serializer):
        group = get_object_or_404(StudyGroup, id=self.kwargs.get('group_pk'))
        if not GroupMember.objects.filter(group=group, user=self.request.user).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You must be a member to upload files.")
        
        file = serializer.validated_data.get('file')
        serializer.save(
            group=group,
            original_filename=file.name,
            file_size=file.size,
            mime_type=file.content_type
        )

class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        note_id = self.kwargs.get('note_pk')
        return Comment.objects.filter(note_id=note_id, parent__isnull=True).order_by('created_at')

    def check_note_access(self, note):
        if note.notebook.subject.semester.owner == self.request.user:
            return True
        if SharedNote.objects.filter(note=note, group__members__user=self.request.user).exists():
            return True
        return False

    def perform_create(self, serializer):
        note = get_object_or_404(Note, id=self.kwargs.get('note_pk'))
        if not self.check_note_access(note):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have access to this note.")
        
        parent_id = self.kwargs.get('parent_pk') or self.request.data.get('parent')
        if parent_id:
            parent = get_object_or_404(Comment, id=parent_id)
            serializer.save(note=note, parent=parent)
        else:
            serializer.save(note=note)

    def perform_destroy(self, instance):
        if instance.author != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only delete your own comments.")
        instance.is_deleted = True
        instance.save()
