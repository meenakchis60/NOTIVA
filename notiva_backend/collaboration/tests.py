from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from collaboration.models import StudyGroup, GroupMember, SharedNote, SharedFile, Comment
from notes.models import Note
from academics.models import Notebook, Subject, Semester
from rest_framework import status
import tempfile

User = get_user_model()
BASE = '/api/v1'

class CollaborationTests(APITestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(email='user_a@test.com', username='a', password='pw')
        self.user_b = User.objects.create_user(email='user_b@test.com', username='b', password='pw')
        
        self.semester = Semester.objects.create(owner=self.user_a, name='Sem 1')
        self.subject = Subject.objects.create(semester=self.semester, name='Sub 1')
        self.notebook = Notebook.objects.create(subject=self.subject, name='NB 1')
        self.note = Note.objects.create(notebook=self.notebook, title='Note 1')

    def auth_a(self):
        self.client.force_authenticate(user=self.user_a)

    def auth_b(self):
        self.client.force_authenticate(user=self.user_b)

    def test_01_create_group(self):
        self.auth_a()
        res = self.client.post(f'{BASE}/collab/groups/', {'name': 'Group 1'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(GroupMember.objects.filter(user=self.user_a, role='admin').exists())

    def test_02_add_member(self):
        self.auth_a()
        group = StudyGroup.objects.create(name='Group 1', created_by=self.user_a)
        GroupMember.objects.create(group=group, user=self.user_a, role='admin')

        res = self.client.post(f'{BASE}/collab/groups/{group.id}/members/', {'user_email': self.user_b.email})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(GroupMember.objects.filter(user=self.user_b, role='member').exists())

    def test_03_non_admin_cannot_add_member(self):
        self.auth_b()
        group = StudyGroup.objects.create(name='Group 1', created_by=self.user_a)
        GroupMember.objects.create(group=group, user=self.user_a, role='admin')
        GroupMember.objects.create(group=group, user=self.user_b, role='member')

        user_c = User.objects.create_user(email='c@test.com', username='c', password='pw')
        res = self.client.post(f'{BASE}/collab/groups/{group.id}/members/', {'user_email': user_c.email})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_04_share_note(self):
        self.auth_a()
        group = StudyGroup.objects.create(name='Group 1', created_by=self.user_a)
        GroupMember.objects.create(group=group, user=self.user_a, role='admin')
        GroupMember.objects.create(group=group, user=self.user_b, role='member')

        res = self.client.post(f'{BASE}/collab/groups/{group.id}/shared-notes/', {'note': self.note.id})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_05_cannot_share_others_note(self):
        self.auth_b()
        group = StudyGroup.objects.create(name='Group 1', created_by=self.user_a)
        GroupMember.objects.create(group=group, user=self.user_a, role='admin')
        GroupMember.objects.create(group=group, user=self.user_b, role='member')

        res = self.client.post(f'{BASE}/collab/groups/{group.id}/shared-notes/', {'note': self.note.id})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_06_comment_on_shared_note(self):
        group = StudyGroup.objects.create(name='Group 1', created_by=self.user_a)
        GroupMember.objects.create(group=group, user=self.user_a, role='admin')
        GroupMember.objects.create(group=group, user=self.user_b, role='member')
        SharedNote.objects.create(note=self.note, group=group, shared_by=self.user_a)

        self.auth_b()
        res = self.client.post(f'{BASE}/notes/{self.note.id}/comments/', {'content': 'Nice note'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_07_cannot_comment_unshared_note(self):
        self.auth_b()
        res = self.client.post(f'{BASE}/notes/{self.note.id}/comments/', {'content': 'Nice note'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_08_upload_shared_file(self):
        self.auth_a()
        group = StudyGroup.objects.create(name='Group 1', created_by=self.user_a)
        GroupMember.objects.create(group=group, user=self.user_a, role='admin')

        with tempfile.NamedTemporaryFile(suffix='.txt') as tmp:
            tmp.write(b'hello')
            tmp.seek(0)
            res = self.client.post(f'{BASE}/collab/groups/{group.id}/files/', {'file': tmp})
            self.assertEqual(res.status_code, status.HTTP_201_CREATED)
