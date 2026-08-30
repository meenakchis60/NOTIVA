"""
Custom DRF permission classes for NOTIVA.

Ownership isolation rule:
    Every resource that belongs to a user (Semester, Subject, Notebook, Note,
    Task, Assignment, Attachment, StudyMaterial, etc.) MUST be filtered or
    guarded so that one user cannot read or modify another user's private data
    unless an explicit sharing permission exists.

These permission classes are the foundation. Each view/viewset that deals
with owned resources must use IsOwner (or IsOwnerOrReadOnly where appropriate)
in addition to IsAuthenticated.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsOwner(BasePermission):
    """
    Grants access ONLY if the requesting user is the owner of the object.

    The object must have one of:
        - obj.owner  (used by most models: Note, Semester, Task, etc.)
        - obj.user   (used by Profile)

    Usage in ViewSets:
        permission_classes = [IsAuthenticated, IsOwner]
    """

    message = 'You do not have permission to access this resource.'

    def has_object_permission(self, request, view, obj):
        # Check for common ownership field patterns
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return False


class IsOwnerOrReadOnly(BasePermission):
    """
    Grants read access to authenticated users, but write access only to the owner.
    Intended for resources that may be publicly viewable within the platform
    (e.g., shared notes in a group context — read allowed, edit only for owner).
    """

    message = 'You do not have permission to modify this resource.'

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return False
