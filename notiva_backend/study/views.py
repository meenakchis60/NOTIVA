from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Q, F
from django.shortcuts import get_object_or_404
from .models import StudySession, StudyGoal, Reminder
from .serializers import StudySessionSerializer, StudyGoalSerializer, ReminderSerializer
from notes.models import Note

class StudySessionViewSet(viewsets.ModelViewSet):
    serializer_class = StudySessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = StudySession.objects.filter(user=self.request.user).select_related(
            'note', 'note__notebook', 'note__notebook__subject', 'note__notebook__subject__semester'
        )
        
        # Filtering
        semester_id = self.request.query_params.get('semester_id')
        subject_id = self.request.query_params.get('subject_id')
        notebook_id = self.request.query_params.get('notebook_id')
        note_id = self.request.query_params.get('note_id')
        status_filter = self.request.query_params.get('status')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if semester_id:
            qs = qs.filter(note__notebook__subject__semester_id=semester_id)
        if subject_id:
            qs = qs.filter(note__notebook__subject_id=subject_id)
        if notebook_id:
            qs = qs.filter(note__notebook_id=notebook_id)
        if note_id:
            qs = qs.filter(note_id=note_id)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if start_date:
            qs = qs.filter(started_at__date__gte=start_date)
        if end_date:
            qs = qs.filter(started_at__date__lte=end_date)
            
        return qs.order_by('-started_at')

    def create(self, request, *args, **kwargs):
        # Enforce exactly one ACTIVE session
        if StudySession.objects.filter(user=request.user, status='ACTIVE').exists():
            return Response({"detail": "An active study session already exists."}, status=status.HTTP_400_BAD_REQUEST)
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        session = self.get_object()
        if session.status != 'ACTIVE':
            return Response({"detail": "Only active sessions can be completed."}, status=status.HTTP_400_BAD_REQUEST)
            
        session.status = 'COMPLETED'
        session.ended_at = timezone.now()
        delta = session.ended_at - session.started_at
        session.duration_seconds = max(0, int(delta.total_seconds()))
        session.save()
        
        # Update note's last_studied_at
        if session.note:
            session.note.last_studied_at = session.ended_at
            session.note.save()
            
        return Response(self.get_serializer(session).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        session = self.get_object()
        if session.status != 'ACTIVE':
            return Response({"detail": "Only active sessions can be cancelled."}, status=status.HTTP_400_BAD_REQUEST)
            
        session.status = 'CANCELLED'
        session.save()
        return Response(self.get_serializer(session).data)


class StudyGoalViewSet(viewsets.ModelViewSet):
    serializer_class = StudyGoalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = StudyGoal.objects.filter(user=self.request.user)
        
        status_filter = self.request.query_params.get('status')
        goal_type = self.request.query_params.get('goal_type')
        active = self.request.query_params.get('active')
        completed = self.request.query_params.get('completed')
        
        if status_filter:
            qs = qs.filter(status=status_filter)
        if goal_type:
            qs = qs.filter(goal_type=goal_type)
        if active == 'true':
            qs = qs.filter(status='ACTIVE')
        if completed == 'true':
            qs = qs.filter(status='COMPLETED')
            
        # Optional: update dynamic goals on the fly when requested (or rely on a background/cron task normally)
        # Here we do it on-the-fly for accurate reads.
        self._update_auto_goals(qs)
        
        return qs

    def _update_auto_goals(self, goals):
        for goal in goals:
            if goal.status != 'ACTIVE':
                continue
            
            # Check expiry
            if timezone.now().date() > goal.end_date:
                goal.status = 'EXPIRED'
                goal.save()
                continue
                
            if goal.goal_type in ['DAILY_STUDY_TIME', 'WEEKLY_STUDY_TIME']:
                total_duration = StudySession.objects.filter(
                    user=goal.user,
                    status='COMPLETED',
                    started_at__date__gte=goal.start_date,
                    started_at__date__lte=goal.end_date
                ).aggregate(total=Sum('duration_seconds'))['total'] or 0
                goal.current_value = total_duration
                if goal.current_value >= goal.target_value:
                    goal.status = 'COMPLETED'
                goal.save()
                
            elif goal.goal_type == 'NOTES_COMPLETED':
                completed_notes = Note.objects.filter(
                    notebook__subject__semester__owner=goal.user,
                    is_study_material=True,
                    study_status='COMPLETED'
                ).count()
                goal.current_value = completed_notes
                if goal.current_value >= goal.target_value:
                    goal.status = 'COMPLETED'
                goal.save()

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        goal = self.get_object()
        if goal.status != 'ACTIVE':
            return Response({"detail": "Only active goals can be cancelled."}, status=status.HTTP_400_BAD_REQUEST)
        goal.status = 'CANCELLED'
        goal.save()
        return Response(self.get_serializer(goal).data)


class ReminderViewSet(viewsets.ModelViewSet):
    serializer_class = ReminderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Reminder.objects.filter(user=self.request.user)
        
        upcoming = self.request.query_params.get('upcoming')
        overdue = self.request.query_params.get('overdue')
        now = timezone.now()
        
        if upcoming == 'true':
            qs = qs.filter(status='PENDING', remind_at__gte=now)
        if overdue == 'true':
            qs = qs.filter(status='PENDING', remind_at__lt=now)
            
        return qs.order_by('remind_at')

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        rem = self.get_object()
        if rem.status != 'PENDING':
            return Response({"detail": "Only pending reminders can be completed."}, status=status.HTTP_400_BAD_REQUEST)
        rem.status = 'COMPLETED'
        rem.save()
        return Response(self.get_serializer(rem).data)

    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        rem = self.get_object()
        if rem.status != 'PENDING':
            return Response({"detail": "Only pending reminders can be dismissed."}, status=status.HTTP_400_BAD_REQUEST)
        rem.status = 'DISMISSED'
        rem.save()
        return Response(self.get_serializer(rem).data)
