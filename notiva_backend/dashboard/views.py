from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from .models import Notification, Activity
from .serializers import NotificationSerializer, ActivitySerializer
from notes.models import Note
from academics.models import Notebook, Subject, Semester
from collaboration.models import StudyGroup, GroupMember

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=False, methods=['post'], url_path='read-all')
    def read_all(self, request):
        self.get_queryset().update(is_read=True)
        return Response({'status': 'All notifications marked as read.'})

class ActivityViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Activity.objects.filter(actor=self.request.user)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def stats_view(request):
    user = request.user
    stats = {
        'total_semesters': Semester.objects.filter(owner=user).count(),
        'total_subjects': Subject.objects.filter(semester__owner=user).count(),
        'total_notebooks': Notebook.objects.filter(subject__semester__owner=user).count(),
        'total_notes': Note.objects.filter(notebook__subject__semester__owner=user).count(),
        'total_groups': GroupMember.objects.filter(user=user).count(),
        'unread_notifications': Notification.objects.filter(recipient=user, is_read=False).count(),
    }
    return Response(stats)

from django.utils import timezone
from django.db.models import Sum
from study.models import StudySession, StudyGoal

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def study_summary_view(request):
    user = request.user
    now = timezone.now()
    today = now.date()
    start_of_week = today - timezone.timedelta(days=today.weekday())

    # Study Sessions
    sessions = StudySession.objects.filter(user=user)
    completed_sessions = sessions.filter(status='COMPLETED')
    
    total_study_time = completed_sessions.aggregate(t=Sum('duration_seconds'))['t'] or 0
    study_time_today = completed_sessions.filter(started_at__date=today).aggregate(t=Sum('duration_seconds'))['t'] or 0
    study_time_this_week = completed_sessions.filter(started_at__date__gte=start_of_week).aggregate(t=Sum('duration_seconds'))['t'] or 0

    # Notes
    study_notes = Note.objects.filter(notebook__subject__semester__owner=user, is_study_material=True)
    
    # Goals
    goals = StudyGoal.objects.filter(user=user)

    data = {
        'total_study_sessions': sessions.count(),
        'completed_study_sessions': completed_sessions.count(),
        'total_study_time': total_study_time,
        'study_time_today': study_time_today,
        'study_time_this_week': study_time_this_week,
        
        'study_notes_total': study_notes.count(),
        'study_notes_not_started': study_notes.filter(study_status='NOT_STARTED').count(),
        'study_notes_in_progress': study_notes.filter(study_status='IN_PROGRESS').count(),
        'study_notes_completed': study_notes.filter(study_status='COMPLETED').count(),
        
        'active_goals': goals.filter(status='ACTIVE').count(),
        'completed_goals': goals.filter(status='COMPLETED').count(),
    }
    return Response(data)

