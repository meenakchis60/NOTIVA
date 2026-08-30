from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from academics.models import Semester, Subject, Notebook
from .models import Note, Tag, Checklist, ChecklistItem, NoteAttachment, NoteVersion
from django.core.files.uploadedfile import SimpleUploadedFile

User = get_user_model()
BASE = '/api/v1'

class Phase4TestBase(APITestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(email='usera@test.com', username='usera', password='TestPass@123')
        self.user_b = User.objects.create_user(email='userb@test.com', username='userb', password='TestPass@123')
        
        self.sem_a = Semester.objects.create(owner=self.user_a, name='Sem A')
        self.sub_a = Subject.objects.create(semester=self.sem_a, name='Sub A')
        self.nb_a = Notebook.objects.create(subject=self.sub_a, name='NB A')
        self.note_a = Note.objects.create(notebook=self.nb_a, title='Note A', content='Content A')
        
        self.sem_b = Semester.objects.create(owner=self.user_b, name='Sem B')
        self.sub_b = Subject.objects.create(semester=self.sem_b, name='Sub B')
        self.nb_b = Notebook.objects.create(subject=self.sub_b, name='NB B')
        self.note_b = Note.objects.create(notebook=self.nb_b, title='Note B', content='Content B')
        
        self.token_a = self._get_token('usera@test.com', 'TestPass@123')
        self.token_b = self._get_token('userb@test.com', 'TestPass@123')

    def _get_token(self, email, password):
        response = self.client.post(f'{BASE}/auth/login/', {'email': email, 'password': password}, format='json')
        return response.data['access']

    def auth_a(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_a}')

    def auth_b(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_b}')

class TagTests(Phase4TestBase):
    def test_01_create_tag(self):
        self.auth_a()
        res = self.client.post(f'{BASE}/tags/', {'name': 'Urgent'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Tag.objects.count(), 1)
        
    def test_02_duplicate_tag_name_same_user(self):
        Tag.objects.create(user=self.user_a, name='urgent')
        self.auth_a()
        res = self.client.post(f'{BASE}/tags/', {'name': 'urgent'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_03_different_users_same_tag_name(self):
        Tag.objects.create(user=self.user_b, name='urgent')
        self.auth_a()
        res = self.client.post(f'{BASE}/tags/', {'name': 'urgent'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_04_user_cannot_access_other_user_tag(self):
        tag_b = Tag.objects.create(user=self.user_b, name='urgent')
        self.auth_a()
        res = self.client.get(f'{BASE}/tags/{tag_b.id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_05_user_cannot_update_other_user_tag(self):
        tag_b = Tag.objects.create(user=self.user_b, name='urgent')
        self.auth_a()
        res = self.client.patch(f'{BASE}/tags/{tag_b.id}/', {'name': 'hacked'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_06_user_cannot_delete_other_user_tag(self):
        tag_b = Tag.objects.create(user=self.user_b, name='urgent')
        self.auth_a()
        res = self.client.delete(f'{BASE}/tags/{tag_b.id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_07_user_can_assign_own_tag(self):
        tag_a = Tag.objects.create(user=self.user_a, name='urgent')
        self.auth_a()
        res = self.client.post(f'{BASE}/notes/{self.note_a.id}/tags/', {'tag_ids': [str(tag_a.id)]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self.note_a.tags.count(), 1)

    def test_08_user_cannot_assign_other_user_tag(self):
        tag_b = Tag.objects.create(user=self.user_b, name='urgent')
        self.auth_a()
        res = self.client.post(f'{BASE}/notes/{self.note_a.id}/tags/', {'tag_ids': [str(tag_b.id)]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_09_multiple_tags(self):
        tag1 = Tag.objects.create(user=self.user_a, name='one')
        tag2 = Tag.objects.create(user=self.user_a, name='two')
        self.auth_a()
        res = self.client.post(f'{BASE}/notes/{self.note_a.id}/tags/', {'tag_ids': [str(tag1.id), str(tag2.id)]}, format='json')
        self.assertEqual(self.note_a.tags.count(), 2)

    def test_10_remove_tag(self):
        tag1 = Tag.objects.create(user=self.user_a, name='one')
        tag2 = Tag.objects.create(user=self.user_a, name='two')
        self.note_a.tags.add(tag1, tag2)
        self.auth_a()
        res = self.client.delete(f'{BASE}/notes/{self.note_a.id}/tags/', {'tag_ids': [str(tag1.id)]}, format='json')
        self.assertEqual(self.note_a.tags.count(), 1)

    def test_11_tag_id_filtering(self):
        tag_a = Tag.objects.create(user=self.user_a, name='test')
        self.note_a.tags.add(tag_a)
        self.auth_a()
        res = self.client.get(f'{BASE}/notes/?tag_id={tag_a.id}')
        self.assertEqual(len(res.data['results']), 1)

class ChecklistTests(Phase4TestBase):
    def test_12_create_checklist_in_own_note(self):
        self.auth_a()
        res = self.client.post(f'{BASE}/notes/{self.note_a.id}/checklists/', {'title': 'Tasks'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Checklist.objects.count(), 1)

    def test_13_create_checklist_in_other_note(self):
        self.auth_a()
        res = self.client.post(f'{BASE}/notes/{self.note_b.id}/checklists/', {'title': 'Tasks'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_14_add_checklist_items(self):
        cl = Checklist.objects.create(note=self.note_a, title='Tasks')
        self.auth_a()
        res = self.client.post(f'{BASE}/checklists/{cl.id}/items/', {'content': 'Item 1'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ChecklistItem.objects.count(), 1)

    def test_15_update_completion_state(self):
        cl = Checklist.objects.create(note=self.note_a, title='Tasks')
        item = ChecklistItem.objects.create(checklist=cl, content='Item 1')
        self.auth_a()
        res = self.client.patch(f'{BASE}/checklist-items/{item.id}/', {'is_completed': True}, format='json')
        self.assertEqual(res.data['is_completed'], True)

    def test_16_modify_other_user_checklist(self):
        cl = Checklist.objects.create(note=self.note_b, title='Tasks')
        self.auth_a()
        res = self.client.patch(f'{BASE}/checklists/{cl.id}/', {'title': 'Hacked'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_17_modify_other_user_checklist_item(self):
        cl = Checklist.objects.create(note=self.note_b, title='Tasks')
        item = ChecklistItem.objects.create(checklist=cl, content='Item 1')
        self.auth_a()
        res = self.client.patch(f'{BASE}/checklist-items/{item.id}/', {'is_completed': True}, format='json')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_18_deleting_checklist_deletes_items(self):
        cl = Checklist.objects.create(note=self.note_a, title='Tasks')
        ChecklistItem.objects.create(checklist=cl, content='Item 1')
        self.auth_a()
        res = self.client.delete(f'{BASE}/checklists/{cl.id}/')
        self.assertEqual(Checklist.objects.count(), 0)
        self.assertEqual(ChecklistItem.objects.count(), 0)

    def test_19_checklist_ordering(self):
        cl2 = Checklist.objects.create(note=self.note_a, title='Tasks 2', position=2)
        cl1 = Checklist.objects.create(note=self.note_a, title='Tasks 1', position=1)
        self.auth_a()
        res = self.client.get(f'{BASE}/notes/{self.note_a.id}/checklists/')
        self.assertEqual(res.data['results'][0]['title'], 'Tasks 1')

    def test_20_item_ordering(self):
        cl = Checklist.objects.create(note=self.note_a, title='Tasks')
        item2 = ChecklistItem.objects.create(checklist=cl, content='Item 2', position=2)
        item1 = ChecklistItem.objects.create(checklist=cl, content='Item 1', position=1)
        self.auth_a()
        res = self.client.get(f'{BASE}/checklists/{cl.id}/items/')
        self.assertEqual(res.data['results'][0]['content'], 'Item 1')

class AttachmentTests(Phase4TestBase):
    def test_21_upload_allowed_type(self):
        self.auth_a()
        file = SimpleUploadedFile("test.txt", b"file_content", content_type="text/plain")
        res = self.client.post(f'{BASE}/notes/{self.note_a.id}/attachments/', {'file': file})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(NoteAttachment.objects.count(), 1)

    def test_22_reject_invalid_type(self):
        self.auth_a()
        file = SimpleUploadedFile("test.exe", b"file_content", content_type="application/octet-stream")
        res = self.client.post(f'{BASE}/notes/{self.note_a.id}/attachments/', {'file': file})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        
    def test_22b_reject_mismatched_mime_type(self):
        self.auth_a()
        file = SimpleUploadedFile("test.png", b"fake_content", content_type="text/plain")
        res = self.client.post(f'{BASE}/notes/{self.note_a.id}/attachments/', {'file': file})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        
    def test_22c_reject_invalid_image_data(self):
        self.auth_a()
        file = SimpleUploadedFile("test.png", b"fake_content", content_type="image/png")
        res = self.client.post(f'{BASE}/notes/{self.note_a.id}/attachments/', {'file': file})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_23_reject_oversized(self):
        self.auth_a()
        file = SimpleUploadedFile("test.txt", b"A" * (11 * 1024 * 1024), content_type="text/plain")
        res = self.client.post(f'{BASE}/notes/{self.note_a.id}/attachments/', {'file': file})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_24_list_own_attachments(self):
        self.auth_a()
        file = SimpleUploadedFile("test.txt", b"file_content", content_type="text/plain")
        self.client.post(f'{BASE}/notes/{self.note_a.id}/attachments/', {'file': file})
        res = self.client.get(f'{BASE}/notes/{self.note_a.id}/attachments/')
        self.assertEqual(len(res.data['results']), 1)

    def test_25_cannot_access_other_user_attachment(self):
        file = SimpleUploadedFile("test.txt", b"file_content", content_type="text/plain")
        self.auth_b()
        res = self.client.post(f'{BASE}/notes/{self.note_b.id}/attachments/', {'file': file})
        att_id = res.data['id']
        self.auth_a()
        res = self.client.get(f'{BASE}/attachments/{att_id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_26_cannot_delete_other_user_attachment(self):
        file = SimpleUploadedFile("test.txt", b"file_content", content_type="text/plain")
        self.auth_b()
        res = self.client.post(f'{BASE}/notes/{self.note_b.id}/attachments/', {'file': file})
        att_id = res.data['id']
        self.auth_a()
        res = self.client.delete(f'{BASE}/attachments/{att_id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

class VersionTests(Phase4TestBase):
    def test_27_28_meaningful_change_creates_version(self):
        self.auth_a()
        res = self.client.patch(f'{BASE}/notes/{self.note_a.id}/', {'title': 'New Title'}, format='json')
        self.assertEqual(NoteVersion.objects.count(), 1)
        self.assertEqual(NoteVersion.objects.first().title, 'Note A')

    def test_29_30_31_32_state_change_does_not_create_version(self):
        self.auth_a()
        self.client.post(f'{BASE}/notes/{self.note_a.id}/pin/')
        self.client.post(f'{BASE}/notes/{self.note_a.id}/star/')
        self.client.post(f'{BASE}/notes/{self.note_a.id}/archive/')
        nb_a2 = Notebook.objects.create(subject=self.sub_a, name='NB A2')
        self.client.post(f'{BASE}/notes/{self.note_a.id}/move/', {'notebook': str(nb_a2.id)}, format='json')
        self.assertEqual(NoteVersion.objects.count(), 0)

    def test_33_version_numbers_increment(self):
        self.auth_a()
        self.client.patch(f'{BASE}/notes/{self.note_a.id}/', {'title': 'Title 2'}, format='json')
        self.client.patch(f'{BASE}/notes/{self.note_a.id}/', {'title': 'Title 3'}, format='json')
        self.assertEqual(NoteVersion.objects.count(), 2)
        v1 = NoteVersion.objects.get(version_number=1)
        v2 = NoteVersion.objects.get(version_number=2)
        self.assertEqual(v1.title, 'Note A')
        self.assertEqual(v2.title, 'Title 2')

    def test_34_list_own_versions(self):
        self.auth_a()
        self.client.patch(f'{BASE}/notes/{self.note_a.id}/', {'title': 'Title 2'}, format='json')
        res = self.client.get(f'{BASE}/notes/{self.note_a.id}/versions/')
        self.assertEqual(len(res.data['results']), 1)

    def test_35_cannot_access_other_user_version(self):
        self.auth_b()
        self.client.patch(f'{BASE}/notes/{self.note_b.id}/', {'title': 'Title B2'}, format='json')
        v_id = NoteVersion.objects.first().id
        self.auth_a()
        res = self.client.get(f'{BASE}/versions/{v_id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_36_37_restore_version(self):
        self.auth_a()
        self.client.patch(f'{BASE}/notes/{self.note_a.id}/', {'title': 'Title 2'}, format='json')
        v_id = NoteVersion.objects.first().id
        res = self.client.post(f'{BASE}/versions/{v_id}/restore/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.note_a.refresh_from_db()
        self.assertEqual(self.note_a.title, 'Note A')
        self.assertEqual(NoteVersion.objects.count(), 2)

class StudyMetadataTests(Phase4TestBase):
    def test_38_39_40_study_metadata_works(self):
        self.auth_a()
        res = self.client.patch(f'{BASE}/notes/{self.note_a.id}/', {
            'is_study_material': True,
            'difficulty': 'BEGINNER',
            'estimated_read_time': 10
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['difficulty'], 'BEGINNER')

    def test_41_42_filtering_works(self):
        self.auth_a()
        self.client.patch(f'{BASE}/notes/{self.note_a.id}/', {
            'is_study_material': True,
            'difficulty': 'BEGINNER'
        }, format='json')
        res = self.client.get(f'{BASE}/notes/?study_material=true')
        self.assertEqual(len(res.data['results']), 1)
        res = self.client.get(f'{BASE}/notes/?difficulty=BEGINNER')
        self.assertEqual(len(res.data['results']), 1)

