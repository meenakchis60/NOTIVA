from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudyGroupViewSet, GroupMemberViewSet, SharedNoteViewSet, SharedFileViewSet

router = DefaultRouter()
router.register(r'groups', StudyGroupViewSet, basename='studygroup')

urlpatterns = [
    path('', include(router.urls)),
    path('groups/<uuid:group_pk>/members/', GroupMemberViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('groups/<uuid:group_pk>/members/<uuid:pk>/', GroupMemberViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'})),
    path('groups/<uuid:group_pk>/shared-notes/', SharedNoteViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('groups/<uuid:group_pk>/shared-notes/<uuid:pk>/', SharedNoteViewSet.as_view({'delete': 'destroy'})),
    path('groups/<uuid:group_pk>/files/', SharedFileViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('groups/<uuid:group_pk>/files/<uuid:pk>/', SharedFileViewSet.as_view({'delete': 'destroy'})),
]
