from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    NoteViewSet, TagViewSet, ChecklistViewSet, ChecklistItemViewSet,
    NoteAttachmentViewSet, NoteVersionViewSet
)
from collaboration.views import CommentViewSet

router = DefaultRouter()
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'notes', NoteViewSet, basename='note')
router.register(r'checklists', ChecklistViewSet, basename='checklist')
router.register(r'checklist-items', ChecklistItemViewSet, basename='checklist-item')
router.register(r'attachments', NoteAttachmentViewSet, basename='attachment')
router.register(r'versions', NoteVersionViewSet, basename='version')

urlpatterns = [
    path('', include(router.urls)),
    
    # Nested endpoints
    path('notes/<uuid:note_id>/checklists/', ChecklistViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('notes/<uuid:note_id>/attachments/', NoteAttachmentViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('notes/<uuid:note_id>/versions/', NoteVersionViewSet.as_view({'get': 'list'})),
    path('notes/<uuid:note_pk>/comments/', CommentViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('notes/<uuid:note_pk>/comments/<uuid:pk>/', CommentViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'})),
    path('checklists/<uuid:checklist_id>/items/', ChecklistItemViewSet.as_view({'get': 'list', 'post': 'create'})),
]
