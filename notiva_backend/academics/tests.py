"""
Phase 2 tests for the academics app.

Tests cover:
    1.  User A creates a Semester successfully
    2.  User A only sees their own Semesters
    3.  User B cannot access User A's Semester detail (404)
    4.  User B cannot update User A's Semester (404)
    5.  User B cannot delete User A's Semester (404)
    6.  User A creates a Subject under their own Semester
    7.  User B cannot create a Subject under User A's Semester (400)
    8.  User A filters Subjects by ?semester_id=
    9.  User B gets empty list using User A's semester_id
    10. User A creates a Notebook under their own Subject
    11. User B cannot create a Notebook under User A's Subject (400)
    12. User A filters Notebooks by ?subject_id=
    13. User B gets empty list using User A's subject_id
    14. Duplicate Semester name for same user is rejected (400)
    15. Duplicate Subject name in same Semester is rejected (400)
    16. Duplicate Notebook name in same Subject is rejected (400)
    17. Deleting a Semester cascades to its Subjects and Notebooks

Each test uses Django's APITestCase with JWT tokens obtained through
the real /api/v1/auth/login/ endpoint.
"""

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from .models import Semester, Subject, Notebook

User = get_user_model()

BASE = '/api/v1'


class AcademicsTestBase(APITestCase):
    """
    Base class that creates two isolated users (user_a and user_b)
    and sets JWT tokens for each. All test classes inherit from this.
    """

    def setUp(self):
        # Create User A
        self.user_a = User.objects.create_user(
            email='usera@test.com',
            username='usera',
            password='TestPass@123',
        )
        # Create User B
        self.user_b = User.objects.create_user(
            email='userb@test.com',
            username='userb',
            password='TestPass@123',
        )
        # Obtain tokens
        self.token_a = self._get_token('usera@test.com', 'TestPass@123')
        self.token_b = self._get_token('userb@test.com', 'TestPass@123')

    def _get_token(self, email, password):
        response = self.client.post(
            f'{BASE}/auth/login/',
            {'email': email, 'password': password},
            format='json',
        )
        return response.data['access']

    def auth_a(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_a}')

    def auth_b(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_b}')

    def clear_auth(self):
        self.client.credentials()


# ===========================================================================
# TEST 1-5: Semester isolation
# ===========================================================================

class SemesterOwnershipTests(AcademicsTestBase):

    def test_01_user_a_creates_semester(self):
        """Test 1: User A can create a Semester successfully."""
        self.auth_a()
        response = self.client.post(
            f'{BASE}/academics/semesters/',
            {'name': 'Semester 3', 'academic_year': '2024-25'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Semester 3')
        self.assertEqual(Semester.objects.filter(owner=self.user_a).count(), 1)

    def test_02_user_a_only_sees_own_semesters(self):
        """Test 2: User A only sees their own semesters, not User B's."""
        # Create semesters for both users
        Semester.objects.create(owner=self.user_a, name='A-Sem1')
        Semester.objects.create(owner=self.user_b, name='B-Sem1')

        self.auth_a()
        response = self.client.get(f'{BASE}/academics/semesters/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [s['name'] for s in response.data['results']]
        self.assertIn('A-Sem1', names)
        self.assertNotIn('B-Sem1', names)

    def test_03_user_b_cannot_access_user_a_semester_detail(self):
        """Test 3: User B gets 404 on User A's semester detail URL."""
        sem_a = Semester.objects.create(owner=self.user_a, name='A-Private-Sem')
        self.auth_b()
        response = self.client.get(f'{BASE}/academics/semesters/{sem_a.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_04_user_b_cannot_update_user_a_semester(self):
        """Test 4: User B gets 404 when trying to PATCH User A's semester."""
        sem_a = Semester.objects.create(owner=self.user_a, name='A-Update-Sem')
        self.auth_b()
        response = self.client.patch(
            f'{BASE}/academics/semesters/{sem_a.id}/',
            {'name': 'Hijacked'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        # Verify the name was NOT changed
        sem_a.refresh_from_db()
        self.assertEqual(sem_a.name, 'A-Update-Sem')

    def test_05_user_b_cannot_delete_user_a_semester(self):
        """Test 5: User B gets 404 when trying to DELETE User A's semester."""
        sem_a = Semester.objects.create(owner=self.user_a, name='A-Delete-Sem')
        self.auth_b()
        response = self.client.delete(f'{BASE}/academics/semesters/{sem_a.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        # Semester still exists
        self.assertTrue(Semester.objects.filter(pk=sem_a.pk).exists())


# ===========================================================================
# TEST 6-9: Subject isolation and cascading filter
# ===========================================================================

class SubjectOwnershipTests(AcademicsTestBase):

    def setUp(self):
        super().setUp()
        self.sem_a = Semester.objects.create(owner=self.user_a, name='A-Semester')
        self.sem_b = Semester.objects.create(owner=self.user_b, name='B-Semester')

    def test_06_user_a_creates_subject_under_own_semester(self):
        """Test 6: User A creates a Subject under their own Semester."""
        self.auth_a()
        response = self.client.post(
            f'{BASE}/academics/subjects/',
            {'semester': str(self.sem_a.id), 'name': 'Data Structures', 'code': 'CS301'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Data Structures')
        self.assertEqual(Subject.objects.filter(semester=self.sem_a).count(), 1)

    def test_07_user_b_cannot_create_subject_under_user_a_semester(self):
        """Test 7: User B gets 400 when posting a Subject with User A's semester ID."""
        self.auth_b()
        response = self.client.post(
            f'{BASE}/academics/subjects/',
            {'semester': str(self.sem_a.id), 'name': 'Injected Subject'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # No subject should have been created under sem_a
        self.assertEqual(Subject.objects.filter(semester=self.sem_a).count(), 0)

    def test_08_user_a_filters_subjects_by_semester(self):
        """Test 8: User A can filter Subjects using ?semester_id=."""
        Subject.objects.create(semester=self.sem_a, name='Math')
        Subject.objects.create(semester=self.sem_a, name='Physics')
        Subject.objects.create(semester=self.sem_b, name='History')

        self.auth_a()
        response = self.client.get(
            f'{BASE}/academics/subjects/?semester_id={self.sem_a.id}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [s['name'] for s in response.data['results']]
        self.assertIn('Math', names)
        self.assertIn('Physics', names)
        self.assertNotIn('History', names)

    def test_09_user_b_cannot_use_user_a_semester_id_for_subjects(self):
        """Test 9: User B using User A's semester_id gets an empty result."""
        Subject.objects.create(semester=self.sem_a, name='Secret Subject')
        self.auth_b()
        response = self.client.get(
            f'{BASE}/academics/subjects/?semester_id={self.sem_a.id}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)


# ===========================================================================
# TEST 10-13: Notebook isolation and cascading filter
# ===========================================================================

class NotebookOwnershipTests(AcademicsTestBase):

    def setUp(self):
        super().setUp()
        self.sem_a = Semester.objects.create(owner=self.user_a, name='A-Semester')
        self.sem_b = Semester.objects.create(owner=self.user_b, name='B-Semester')
        self.sub_a = Subject.objects.create(semester=self.sem_a, name='A-Subject')
        self.sub_b = Subject.objects.create(semester=self.sem_b, name='B-Subject')

    def test_10_user_a_creates_notebook_under_own_subject(self):
        """Test 10: User A creates a Notebook under their own Subject."""
        self.auth_a()
        response = self.client.post(
            f'{BASE}/academics/notebooks/',
            {'subject': str(self.sub_a.id), 'name': 'Unit 1'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Unit 1')
        self.assertEqual(Notebook.objects.filter(subject=self.sub_a).count(), 1)

    def test_11_user_b_cannot_create_notebook_under_user_a_subject(self):
        """Test 11: User B gets 400 when posting a Notebook with User A's subject ID."""
        self.auth_b()
        response = self.client.post(
            f'{BASE}/academics/notebooks/',
            {'subject': str(self.sub_a.id), 'name': 'Injected Notebook'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Notebook.objects.filter(subject=self.sub_a).count(), 0)

    def test_12_user_a_filters_notebooks_by_subject(self):
        """Test 12: User A filters Notebooks using ?subject_id=."""
        Notebook.objects.create(subject=self.sub_a, name='Chapter 1')
        Notebook.objects.create(subject=self.sub_a, name='Chapter 2')
        Notebook.objects.create(subject=self.sub_b, name='Other Chapter')

        self.auth_a()
        response = self.client.get(
            f'{BASE}/academics/notebooks/?subject_id={self.sub_a.id}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [n['name'] for n in response.data['results']]
        self.assertIn('Chapter 1', names)
        self.assertIn('Chapter 2', names)
        self.assertNotIn('Other Chapter', names)

    def test_13_user_b_cannot_use_user_a_subject_id_for_notebooks(self):
        """Test 13: User B using User A's subject_id gets an empty result."""
        Notebook.objects.create(subject=self.sub_a, name='Secret Notebook')
        self.auth_b()
        response = self.client.get(
            f'{BASE}/academics/notebooks/?subject_id={self.sub_a.id}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)


# ===========================================================================
# TEST 14-16: Duplicate name validation
# ===========================================================================

class DuplicateValidationTests(AcademicsTestBase):

    def setUp(self):
        super().setUp()
        self.sem_a = Semester.objects.create(owner=self.user_a, name='Sem-A')
        self.sub_a = Subject.objects.create(semester=self.sem_a, name='Sub-A')
        self.nb_a = Notebook.objects.create(subject=self.sub_a, name='NB-A')

    def test_14_duplicate_semester_name_rejected(self):
        """Test 14: Creating a Semester with a duplicate name is rejected."""
        self.auth_a()
        response = self.client.post(
            f'{BASE}/academics/semesters/',
            {'name': 'Sem-A'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_15_duplicate_subject_name_in_same_semester_rejected(self):
        """Test 15: Duplicate Subject name within the same Semester is rejected."""
        self.auth_a()
        response = self.client.post(
            f'{BASE}/academics/subjects/',
            {'semester': str(self.sem_a.id), 'name': 'Sub-A'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_16_duplicate_notebook_name_in_same_subject_rejected(self):
        """Test 16: Duplicate Notebook name within the same Subject is rejected."""
        self.auth_a()
        response = self.client.post(
            f'{BASE}/academics/notebooks/',
            {'subject': str(self.sub_a.id), 'name': 'NB-A'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_14b_different_users_may_share_semester_name(self):
        """Bonus: Different users CAN have semesters with the same name."""
        self.auth_b()
        response = self.client.post(
            f'{BASE}/academics/semesters/',
            {'name': 'Sem-A'},  # Same name as User A's — allowed
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


# ===========================================================================
# TEST 17: Cascade deletion
# ===========================================================================

class CascadeDeleteTests(AcademicsTestBase):

    def test_17_deleting_semester_cascades_to_subjects_and_notebooks(self):
        """Test 17: Deleting a Semester removes its Subjects and Notebooks."""
        sem = Semester.objects.create(owner=self.user_a, name='Delete-Me')
        sub1 = Subject.objects.create(semester=sem, name='Sub1')
        sub2 = Subject.objects.create(semester=sem, name='Sub2')
        Notebook.objects.create(subject=sub1, name='NB1')
        Notebook.objects.create(subject=sub1, name='NB2')
        Notebook.objects.create(subject=sub2, name='NB3')

        # Also create data for User B to ensure it is NOT deleted
        sem_b = Semester.objects.create(owner=self.user_b, name='B-Sem')
        sub_b = Subject.objects.create(semester=sem_b, name='B-Sub')
        Notebook.objects.create(subject=sub_b, name='B-NB')

        self.auth_a()
        response = self.client.delete(f'{BASE}/academics/semesters/{sem.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['deleted_subjects'], 2)
        self.assertEqual(response.data['deleted_notebooks'], 3)

        # Verify User A's data is gone
        self.assertFalse(Semester.objects.filter(pk=sem.pk).exists())
        self.assertFalse(Subject.objects.filter(pk=sub1.pk).exists())
        self.assertFalse(Subject.objects.filter(pk=sub2.pk).exists())
        self.assertEqual(Notebook.objects.filter(subject__semester=sem).count(), 0)

        # Verify User B's data is completely untouched
        self.assertTrue(Semester.objects.filter(pk=sem_b.pk).exists())
        self.assertTrue(Subject.objects.filter(pk=sub_b.pk).exists())
        self.assertEqual(Notebook.objects.filter(subject=sub_b).count(), 1)
