from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from django.utils import timezone
import datetime
from study.models import StudySession, StudyGoal, Reminder
from academics.models import Semester, Subject, Notebook
from notes.models import Note

User = get_user_model()
BASE = '/api/v1/study'

class StudyTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='test@notiva.dev', username='tester', password='pw')
        self.user2 = User.objects.create_user(email='test2@notiva.dev', username='tester2', password='pw')
        
        self.semester = Semester.objects.create(owner=self.user, name='Sem 1')
        self.subject = Subject.objects.create(semester=self.semester, name='Sub 1')
        self.notebook = Notebook.objects.create(subject=self.subject, name='NB 1')
        self.note = Note.objects.create(notebook=self.notebook, title='Note 1', is_study_material=True)
        self.note2 = Note.objects.create(notebook=self.notebook, title='Note 2', is_study_material=False)
        
        self.semester2 = Semester.objects.create(owner=self.user2, name='Sem 2')
        self.subject2 = Subject.objects.create(semester=self.semester2, name='Sub 2')
        self.notebook2 = Notebook.objects.create(subject=self.subject2, name='NB 2')
        self.other_note = Note.objects.create(notebook=self.notebook2, title='Other Note', is_study_material=True)

    def auth(self):
        self.client.force_authenticate(user=self.user)

    # --- NOTE STUDY STATUS TESTS ---
    def test_study_status_updates(self):
        self.auth()
        # Set NOT_STARTED
        res = self.client.patch(f'/api/v1/notes/{self.note.id}/', {'study_status': 'NOT_STARTED'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['study_status'], 'NOT_STARTED')
        
        # Set IN_PROGRESS
        res = self.client.patch(f'/api/v1/notes/{self.note.id}/', {'study_status': 'IN_PROGRESS'})
        self.assertEqual(res.data['study_status'], 'IN_PROGRESS')
        
        # Set COMPLETED
        res = self.client.patch(f'/api/v1/notes/{self.note.id}/', {'study_status': 'COMPLETED'})
        self.assertEqual(res.data['study_status'], 'COMPLETED')

    def test_study_status_normalization(self):
        self.auth()
        # Set is_study_material=False along with a study_status
        res = self.client.patch(f'/api/v1/notes/{self.note.id}/', {
            'is_study_material': False,
            'study_status': 'IN_PROGRESS'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should normalize to None
        self.assertIsNone(res.data['study_status'])
        self.note.refresh_from_db()
        self.assertIsNone(self.note.study_status)

    def test_prevent_cross_user_note_update(self):
        self.auth()
        res = self.client.patch(f'/api/v1/notes/{self.other_note.id}/', {'study_status': 'COMPLETED'})
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    # --- STUDY SESSIONS TESTS ---
    def test_create_and_reject_second_active_session(self):
        self.auth()
        res1 = self.client.post(f'{BASE}/sessions/')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res1.data['status'], 'ACTIVE')
        
        # Attempt second active session
        res2 = self.client.post(f'{BASE}/sessions/')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_link_own_note_vs_other_note(self):
        self.auth()
        res = self.client.post(f'{BASE}/sessions/', {'note': self.note.id})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        
        # Cancel to allow new session
        self.client.post(f'{BASE}/sessions/{res.data["id"]}/cancel/')
        
        # Reject other user's note
        res2 = self.client.post(f'{BASE}/sessions/', {'note': self.other_note.id})
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_complete_session_duration_and_last_studied(self):
        self.auth()
        session = StudySession.objects.create(
            user=self.user,
            note=self.note
        )
        # Using .update() bypasses auto_now_add
        StudySession.objects.filter(id=session.id).update(
            started_at=timezone.now() - datetime.timedelta(minutes=30)
        )
        
        res = self.client.post(f'{BASE}/sessions/{session.id}/complete/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], 'COMPLETED')
        
        # Verify duration is ~30 mins (1800 seconds)
        self.assertGreaterEqual(res.data['duration_seconds'], 1790)
        
        # Verify last_studied_at
        self.note.refresh_from_db()
        self.assertIsNotNone(self.note.last_studied_at)

    def test_cancel_session_and_invalid_transitions(self):
        self.auth()
        res_create = self.client.post(f'{BASE}/sessions/')
        session_id = res_create.data['id']
        
        res_cancel = self.client.post(f'{BASE}/sessions/{session_id}/cancel/')
        self.assertEqual(res_cancel.status_code, status.HTTP_200_OK)
        
        # Cannot complete a cancelled session
        res_complete = self.client.post(f'{BASE}/sessions/{session_id}/complete/')
        self.assertEqual(res_complete.status_code, status.HTTP_400_BAD_REQUEST)
        
    def test_unsafe_patch_session(self):
        self.auth()
        session = StudySession.objects.create(user=self.user, status='ACTIVE')
        # Attempt to bypass status and duration
        res = self.client.patch(f'{BASE}/sessions/{session.id}/', {
            'status': 'COMPLETED',
            'duration_seconds': 9999
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should remain ACTIVE and 0
        self.assertEqual(res.data['status'], 'ACTIVE')
        self.assertEqual(res.data['duration_seconds'], 0)

    # --- STUDY HISTORY FILTERING ---
    def test_history_filters_and_isolation(self):
        self.auth()
        s1 = StudySession.objects.create(user=self.user, note=self.note, status='COMPLETED')
        s2 = StudySession.objects.create(user=self.user, status='CANCELLED')
        
        # Other user's session
        s_other = StudySession.objects.create(user=self.user2, note=self.other_note, status='COMPLETED')
        
        # Should only see own
        res_all = self.client.get(f'{BASE}/sessions/')
        self.assertEqual(len(res_all.data['results']), 2)
        
        # Filter by status
        res_status = self.client.get(f'{BASE}/sessions/?status=COMPLETED')
        self.assertEqual(len(res_status.data['results']), 1)
        
        # Filter by semester
        res_sem = self.client.get(f'{BASE}/sessions/?semester_id={self.semester.id}')
        self.assertEqual(len(res_sem.data['results']), 1)
        self.assertEqual(res_sem.data['results'][0]['id'], str(s1.id))
        
        # Try to retrieve other user's session
        res_other = self.client.get(f'{BASE}/sessions/{s_other.id}/')
        self.assertEqual(res_other.status_code, status.HTTP_404_NOT_FOUND)

    # --- STUDY GOALS TESTS ---
    def test_goal_validation_and_creation(self):
        self.auth()
        # Invalid date range
        res1 = self.client.post(f'{BASE}/goals/', {
            'title': 'Test',
            'goal_type': 'DAILY_STUDY_TIME',
            'target_value': 10,
            'start_date': '2026-12-31',
            'end_date': '2026-01-01'
        })
        self.assertEqual(res1.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Valid goal
        res2 = self.client.post(f'{BASE}/goals/', {
            'title': 'Read 10 notes',
            'goal_type': 'NOTES_COMPLETED',
            'target_value': 10,
            'start_date': '2026-01-01',
            'end_date': '2026-12-31'
        })
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)

    def test_goal_auto_progress(self):
        self.auth()
        # Create NOTES_COMPLETED goal
        goal_res = self.client.post(f'{BASE}/goals/', {
            'title': 'Complete 1 Note',
            'goal_type': 'NOTES_COMPLETED',
            'target_value': 1,
            'start_date': '2020-01-01',
            'end_date': '2099-12-31'
        })
        goal_id = goal_res.data['id']
        
        # Note not completed yet
        res = self.client.get(f'{BASE}/goals/{goal_id}/')
        self.assertEqual(res.data['current_value'], 0)
        self.assertEqual(res.data['status'], 'ACTIVE')
        
        # Complete note
        self.note.study_status = 'COMPLETED'
        self.note.save()
        
        # Goal should auto complete
        res2 = self.client.get(f'{BASE}/goals/{goal_id}/')
        self.assertEqual(res2.data['current_value'], 1)
        self.assertEqual(res2.data['status'], 'COMPLETED')
        
        # Verify client cannot arbitrarily overwrite auto progress
        res_patch = self.client.patch(f'{BASE}/goals/{goal_id}/', {'current_value': 999})
        self.assertEqual(res_patch.data['current_value'], 1)

    def test_custom_goal_progress(self):
        self.auth()
        res = self.client.post(f'{BASE}/goals/', {
            'title': 'Custom',
            'goal_type': 'CUSTOM',
            'target_value': 10,
            'start_date': '2020-01-01',
            'end_date': '2099-12-31'
        })
        goal_id = res.data['id']
        
        # Valid update
        res_valid = self.client.patch(f'{BASE}/goals/{goal_id}/', {'current_value': 5})
        self.assertEqual(res_valid.data['current_value'], 5)
        
        # Invalid negative update
        res_invalid = self.client.patch(f'{BASE}/goals/{goal_id}/', {'current_value': -2})
        self.assertEqual(res_invalid.status_code, status.HTTP_400_BAD_REQUEST)

    def test_goal_cancellation(self):
        self.auth()
        res = self.client.post(f'{BASE}/goals/', {
            'title': 'Custom',
            'goal_type': 'CUSTOM',
            'target_value': 10,
            'start_date': '2020-01-01',
            'end_date': '2099-12-31'
        })
        goal_id = res.data['id']
        
        res_cancel = self.client.post(f'{BASE}/goals/{goal_id}/cancel/')
        self.assertEqual(res_cancel.status_code, status.HTTP_200_OK)
        self.assertEqual(res_cancel.data['status'], 'CANCELLED')
        
        res_cancel_again = self.client.post(f'{BASE}/goals/{goal_id}/cancel/')
        self.assertEqual(res_cancel_again.status_code, status.HTTP_400_BAD_REQUEST)

    # --- REMINDERS TESTS ---
    def test_create_and_link_reminder(self):
        self.auth()
        now = timezone.now()
        tomorrow = now + datetime.timedelta(days=1)
        yesterday = now - datetime.timedelta(days=1)
        
        # Create upcoming
        res_up = self.client.post(f'{BASE}/reminders/', {
            'title': 'Upcoming',
            'remind_at': tomorrow.isoformat(),
            'note': self.note.id
        })
        self.assertEqual(res_up.status_code, status.HTTP_201_CREATED)
        
        # Create overdue
        res_over = self.client.post(f'{BASE}/reminders/', {
            'title': 'Overdue',
            'remind_at': yesterday.isoformat()
        })
        self.assertEqual(res_over.status_code, status.HTTP_201_CREATED)
        
        # Test filters
        up_filter = self.client.get(f'{BASE}/reminders/?upcoming=true')
        self.assertEqual(len(up_filter.data['results']), 1)
        self.assertEqual(up_filter.data['results'][0]['title'], 'Upcoming')
        
        over_filter = self.client.get(f'{BASE}/reminders/?overdue=true')
        self.assertEqual(len(over_filter.data['results']), 1)
        self.assertEqual(over_filter.data['results'][0]['title'], 'Overdue')
        
        # Reject other user's note
        res_bad = self.client.post(f'{BASE}/reminders/', {
            'title': 'Bad Note',
            'remind_at': tomorrow.isoformat(),
            'note': self.other_note.id
        })
        self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST)

    def test_complete_and_dismiss_reminders(self):
        self.auth()
        tomorrow = timezone.now() + datetime.timedelta(days=1)
        res = self.client.post(f'{BASE}/reminders/', {'title': 'Test', 'remind_at': tomorrow.isoformat()})
        rem_id = res.data['id']
        
        res_comp = self.client.post(f'{BASE}/reminders/{rem_id}/complete/')
        self.assertEqual(res_comp.status_code, status.HTTP_200_OK)
        self.assertEqual(res_comp.data['status'], 'COMPLETED')
        
        # Attempt to dismiss completed
        res_dis = self.client.post(f'{BASE}/reminders/{rem_id}/dismiss/')
        self.assertEqual(res_dis.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Should no longer appear in upcoming
        up_filter = self.client.get(f'{BASE}/reminders/?upcoming=true')
        self.assertEqual(len(up_filter.data['results']), 0)

    # --- DASHBOARD SUMMARY TESTS ---
    def test_dashboard_summary_metrics(self):
        self.auth()
        # Add a completed session (3600 seconds)
        s1 = StudySession.objects.create(
            user=self.user,
            status='COMPLETED',
            started_at=timezone.now(),
            duration_seconds=3600
        )
        # Add a cancelled session (should be excluded)
        s2 = StudySession.objects.create(
            user=self.user,
            status='CANCELLED',
            started_at=timezone.now(),
            duration_seconds=9999
        )
        
        # Complete a note
        self.note.study_status = 'COMPLETED'
        self.note.save()
        
        # Add an active goal
        StudyGoal.objects.create(
            user=self.user,
            title='Goal 1',
            goal_type='CUSTOM',
            target_value=1,
            start_date=timezone.now().date(),
            end_date=timezone.now().date(),
            status='ACTIVE'
        )
        
        res = self.client.get('/api/v1/dashboard/study-summary/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['total_study_sessions'], 2)
        self.assertEqual(res.data['completed_study_sessions'], 1)
        self.assertEqual(res.data['total_study_time'], 3600)
        self.assertEqual(res.data['study_time_today'], 3600)
        
        self.assertEqual(res.data['study_notes_completed'], 1)
        self.assertEqual(res.data['active_goals'], 1)
