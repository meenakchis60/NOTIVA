from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from dashboard.models import Notification, Activity
from academics.models import Semester, Subject, Notebook
from notes.models import Note
from collaboration.models import StudyGroup, GroupMember

User = get_user_model()
BASE = '/api/v1/dashboard'

class DashboardTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='test@notiva.dev', username='tester', password='pw')
        self.user2 = User.objects.create_user(email='test2@notiva.dev', username='tester2', password='pw')
        
        self.semester = Semester.objects.create(owner=self.user, name='Sem 1')
        self.subject = Subject.objects.create(semester=self.semester, name='Sub 1')
        self.notebook = Notebook.objects.create(subject=self.subject, name='NB 1')
        self.note = Note.objects.create(notebook=self.notebook, title='Note 1')
        
        self.group = StudyGroup.objects.create(name='Group 1', created_by=self.user)
        GroupMember.objects.create(group=self.group, user=self.user, role='admin')

        self.notif1 = Notification.objects.create(recipient=self.user, notification_type='test', title='Test Notif', message='Message')
        self.notif2 = Notification.objects.create(recipient=self.user, notification_type='test2', title='Test Notif 2', message='Message 2', is_read=True)
        self.notif_other = Notification.objects.create(recipient=self.user2, notification_type='test3', title='Other', message='Msg')
        
        self.act1 = Activity.objects.create(actor=self.user, action='created_note', object_type='Note', object_id=self.note.id, object_repr='Note 1')
        self.act_other = Activity.objects.create(actor=self.user2, action='joined', object_type='Group', object_id=self.group.id, object_repr='Group 1')

    def auth(self):
        self.client.force_authenticate(user=self.user)

    def test_01_stats_view(self):
        self.auth()
        res = self.client.get(f'{BASE}/stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['total_semesters'], 1)
        self.assertEqual(res.data['total_notes'], 1)
        self.assertEqual(res.data['total_groups'], 1)
        self.assertEqual(res.data['unread_notifications'], 1)

    def test_02_stats_unauthorized(self):
        res = self.client.get(f'{BASE}/stats/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_03_list_notifications(self):
        self.auth()
        res = self.client.get(f'{BASE}/notifications/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['results']), 2)

    def test_04_read_all_notifications(self):
        self.auth()
        res = self.client.post(f'{BASE}/notifications/read-all/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.notif1.refresh_from_db()
        self.assertTrue(self.notif1.is_read)

    def test_05_mark_single_notification_read(self):
        self.auth()
        res = self.client.patch(f'{BASE}/notifications/{self.notif1.id}/', {'is_read': True})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['is_read'])

    def test_06_cannot_read_others_notification(self):
        self.auth()
        res = self.client.get(f'{BASE}/notifications/{self.notif_other.id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_07_list_activity(self):
        self.auth()
        res = self.client.get(f'{BASE}/activity/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['results']), 1)
        self.assertEqual(res.data['results'][0]['action'], 'created_note')

    def test_08_cannot_list_others_activity(self):
        self.client.force_authenticate(user=self.user2)
        res = self.client.get(f'{BASE}/activity/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['results']), 1)
        self.assertEqual(res.data['results'][0]['action'], 'joined')
