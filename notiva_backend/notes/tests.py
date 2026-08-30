from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from academics.models import Semester, Subject, Notebook
from .models import Note

User = get_user_model()
BASE = '/api/v1'

class NotesTestBase(APITestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(email='usera@test.com', username='usera', password='TestPass@123')
        self.user_b = User.objects.create_user(email='userb@test.com', username='userb', password='TestPass@123')
        
        self.sem_a = Semester.objects.create(owner=self.user_a, name='Sem A')
        self.sub_a = Subject.objects.create(semester=self.sem_a, name='Sub A')
        self.nb_a = Notebook.objects.create(subject=self.sub_a, name='NB A')
        
        self.sem_b = Semester.objects.create(owner=self.user_b, name='Sem B')
        self.sub_b = Subject.objects.create(semester=self.sem_b, name='Sub B')
        self.nb_b = Notebook.objects.create(subject=self.sub_b, name='NB B')
        
        self.token_a = self._get_token('usera@test.com', 'TestPass@123')
        self.token_b = self._get_token('userb@test.com', 'TestPass@123')

    def _get_token(self, email, password):
        response = self.client.post(f'{BASE}/auth/login/', {'email': email, 'password': password}, format='json')
        return response.data['access']

    def auth_a(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_a}')

    def auth_b(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_b}')

class NoteCreationIsolationTests(NotesTestBase):
    def test_01_user_creates_note_in_own_notebook(self):
        self.auth_a()
        response = self.client.post(f'{BASE}/notes/', {'notebook': str(self.nb_a.id), 'title': 'My Note'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Note.objects.count(), 1)

    def test_02_user_cannot_create_note_in_other_user_notebook(self):
        self.auth_a()
        response = self.client.post(f'{BASE}/notes/', {'notebook': str(self.nb_b.id), 'title': 'My Note'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_03_user_only_sees_own_notes(self):
        Note.objects.create(notebook=self.nb_a, title='Note A')
        Note.objects.create(notebook=self.nb_b, title='Note B')
        self.auth_a()
        response = self.client.get(f'{BASE}/notes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Note A')

    def test_04_user_cannot_access_other_user_note(self):
        note_b = Note.objects.create(notebook=self.nb_b, title='Note B')
        self.auth_a()
        response = self.client.get(f'{BASE}/notes/{note_b.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_05_user_cannot_update_other_user_note(self):
        note_b = Note.objects.create(notebook=self.nb_b, title='Note B')
        self.auth_a()
        response = self.client.patch(f'{BASE}/notes/{note_b.id}/', {'title': 'Hacked'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

class NoteDeletionTests(NotesTestBase):
    def test_06_user_cannot_soft_delete_other_user_note(self):
        note_b = Note.objects.create(notebook=self.nb_b, title='Note B')
        self.auth_a()
        response = self.client.delete(f'{BASE}/notes/{note_b.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_07_normal_delete_performs_soft_deletion(self):
        note_a = Note.objects.create(notebook=self.nb_a, title='Note A')
        self.auth_a()
        response = self.client.delete(f'{BASE}/notes/{note_a.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        note_a.refresh_from_db()
        self.assertTrue(note_a.is_deleted)
        self.assertIsNotNone(note_a.deleted_at)

    def test_08_soft_deleted_notes_not_in_default_listing(self):
        note_a = Note.objects.create(notebook=self.nb_a, title='Note A', is_deleted=True)
        self.auth_a()
        response = self.client.get(f'{BASE}/notes/')
        self.assertEqual(len(response.data['results']), 0)

    def test_09_deleted_notes_appear_when_requested(self):
        note_a = Note.objects.create(notebook=self.nb_a, title='Note A', is_deleted=True)
        self.auth_a()
        response = self.client.get(f'{BASE}/notes/?deleted=true')
        self.assertEqual(len(response.data['results']), 1)

    def test_10_user_can_restore_own_note(self):
        note_a = Note.objects.create(notebook=self.nb_a, title='Note A', is_deleted=True)
        self.auth_a()
        response = self.client.post(f'{BASE}/notes/{note_a.id}/restore/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        note_a.refresh_from_db()
        self.assertFalse(note_a.is_deleted)

    def test_11_user_can_permanently_delete_own_note(self):
        note_a = Note.objects.create(notebook=self.nb_a, title='Note A', is_deleted=True)
        self.auth_a()
        response = self.client.delete(f'{BASE}/notes/{note_a.id}/permanent/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Note.objects.filter(id=note_a.id).exists())

    def test_12_user_cannot_permanently_delete_other_user_note(self):
        note_b = Note.objects.create(notebook=self.nb_b, title='Note B')
        self.auth_a()
        response = self.client.delete(f'{BASE}/notes/{note_b.id}/permanent/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

class NoteArchiveTests(NotesTestBase):
    def test_13_user_can_archive_own_note(self):
        note_a = Note.objects.create(notebook=self.nb_a, title='Note A')
        self.auth_a()
        response = self.client.post(f'{BASE}/notes/{note_a.id}/archive/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        note_a.refresh_from_db()
        self.assertTrue(note_a.is_archived)

    def test_14_archived_notes_disappear_from_default(self):
        Note.objects.create(notebook=self.nb_a, title='Note A', is_archived=True)
        self.auth_a()
        response = self.client.get(f'{BASE}/notes/')
        self.assertEqual(len(response.data['results']), 0)

    def test_15_archived_notes_appear_when_requested(self):
        Note.objects.create(notebook=self.nb_a, title='Note A', is_archived=True)
        self.auth_a()
        response = self.client.get(f'{BASE}/notes/?archived=true')
        self.assertEqual(len(response.data['results']), 1)

    def test_16_user_can_unarchive_own_note(self):
        note_a = Note.objects.create(notebook=self.nb_a, title='Note A', is_archived=True)
        self.auth_a()
        response = self.client.post(f'{BASE}/notes/{note_a.id}/unarchive/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        note_a.refresh_from_db()
        self.assertFalse(note_a.is_archived)

class NoteActionTests(NotesTestBase):
    def test_17_pin_works(self):
        note_a = Note.objects.create(notebook=self.nb_a, title='Note A')
        self.auth_a()
        response = self.client.post(f'{BASE}/notes/{note_a.id}/pin/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        note_a.refresh_from_db()
        self.assertTrue(note_a.is_pinned)

    def test_18_star_works(self):
        note_a = Note.objects.create(notebook=self.nb_a, title='Note A')
        self.auth_a()
        response = self.client.post(f'{BASE}/notes/{note_a.id}/star/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        note_a.refresh_from_db()
        self.assertTrue(note_a.is_starred)

    def test_19_both_pinned_and_starred(self):
        note_a = Note.objects.create(notebook=self.nb_a, title='Note A', is_pinned=True, is_starred=True)
        self.assertTrue(note_a.is_pinned and note_a.is_starred)

    def test_20_duplicate_creates_independent_note(self):
        note_a = Note.objects.create(notebook=self.nb_a, title='Note A')
        self.auth_a()
        response = self.client.post(f'{BASE}/notes/{note_a.id}/duplicate/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Note.objects.count(), 2)

    def test_21_duplicate_gets_copy_title(self):
        note_a = Note.objects.create(notebook=self.nb_a, title='Note A')
        self.auth_a()
        response = self.client.post(f'{BASE}/notes/{note_a.id}/duplicate/')
        self.assertEqual(response.data['title'], 'Note A (Copy)')
        
        response2 = self.client.post(f'{BASE}/notes/{note_a.id}/duplicate/')
        self.assertEqual(response2.data['title'], 'Note A (Copy) 2')

    def test_22_user_can_move_to_own_notebook(self):
        nb_a2 = Notebook.objects.create(subject=self.sub_a, name='NB A2')
        note_a = Note.objects.create(notebook=self.nb_a, title='Note A')
        self.auth_a()
        response = self.client.post(f'{BASE}/notes/{note_a.id}/move/', {'notebook': str(nb_a2.id)}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        note_a.refresh_from_db()
        self.assertEqual(note_a.notebook, nb_a2)

    def test_23_user_cannot_move_to_other_user_notebook(self):
        note_a = Note.objects.create(notebook=self.nb_a, title='Note A')
        self.auth_a()
        response = self.client.post(f'{BASE}/notes/{note_a.id}/move/', {'notebook': str(self.nb_b.id)}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

class NoteFilteringTests(NotesTestBase):
    def setUp(self):
        super().setUp()
        self.note_a1 = Note.objects.create(notebook=self.nb_a, title='Note 1')
        self.note_a2 = Note.objects.create(notebook=self.nb_a, title='Note 2')
        
        self.sub_a2 = Subject.objects.create(semester=self.sem_a, name='Sub A2')
        self.nb_a2 = Notebook.objects.create(subject=self.sub_a2, name='NB A2')
        self.note_a3 = Note.objects.create(notebook=self.nb_a2, title='Note 3')
        
        self.note_b1 = Note.objects.create(notebook=self.nb_b, title='Note B1')

    def test_24_semester_id_filtering(self):
        self.auth_a()
        response = self.client.get(f'{BASE}/notes/?semester_id={self.sem_a.id}')
        self.assertEqual(len(response.data['results']), 3)

    def test_25_subject_id_filtering(self):
        self.auth_a()
        response = self.client.get(f'{BASE}/notes/?subject_id={self.sub_a.id}')
        self.assertEqual(len(response.data['results']), 2)

    def test_26_notebook_id_filtering(self):
        self.auth_a()
        response = self.client.get(f'{BASE}/notes/?notebook_id={self.nb_a.id}')
        self.assertEqual(len(response.data['results']), 2)

    def test_27_other_user_semester_id_exposes_nothing(self):
        self.auth_a()
        response = self.client.get(f'{BASE}/notes/?semester_id={self.sem_b.id}')
        self.assertEqual(len(response.data['results']), 0)

    def test_28_other_user_subject_id_exposes_nothing(self):
        self.auth_a()
        response = self.client.get(f'{BASE}/notes/?subject_id={self.sub_b.id}')
        self.assertEqual(len(response.data['results']), 0)

    def test_29_other_user_notebook_id_exposes_nothing(self):
        self.auth_a()
        response = self.client.get(f'{BASE}/notes/?notebook_id={self.nb_b.id}')
        self.assertEqual(len(response.data['results']), 0)

    def test_30_default_ordering_prioritizes_pinned(self):
        self.note_a2.is_pinned = True
        self.note_a2.save()
        self.auth_a()
        response = self.client.get(f'{BASE}/notes/')
        self.assertEqual(response.data['results'][0]['title'], 'Note 2')

    def test_31_supported_ordering(self):
        self.auth_a()
        response = self.client.get(f'{BASE}/notes/?ordering=title_desc')
        self.assertEqual(response.data['results'][0]['title'], 'Note 3')
