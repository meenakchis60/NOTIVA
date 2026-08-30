from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

User = get_user_model()
BASE = '/api/v1/auth'

class AuthTests(APITestCase):
    def test_01_register(self):
        res = self.client.post(f'{BASE}/register/', {
            "email": "phase1test@notiva.dev",
            "username": "phase1user",
            "password": "SecurePass@123",
            "password2": "SecurePass@123",
            "first_name": "Phase",
            "last_name": "One",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['user']['email'], "phase1test@notiva.dev")
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)

    def test_02_login(self):
        User.objects.create_user(email="phase1test@notiva.dev", username="phase1user", password="SecurePass@123")
        res = self.client.post(f'{BASE}/login/', {
            "email": "phase1test@notiva.dev",
            "password": "SecurePass@123",
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("user", res.data)
        self.assertIn("access", res.data)

    def test_03_me_authenticated(self):
        user = User.objects.create_user(email="phase1test@notiva.dev", username="phase1user", password="SecurePass@123")
        self.client.force_authenticate(user=user)
        res = self.client.get(f'{BASE}/me/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['email'], "phase1test@notiva.dev")

    def test_04_me_unauthenticated(self):
        res = self.client.get(f'{BASE}/me/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_05_profile_get(self):
        user = User.objects.create_user(email="phase1test@notiva.dev", username="phase1user", password="SecurePass@123")
        self.client.force_authenticate(user=user)
        res = self.client.get(f'{BASE}/profile/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['theme_preference'], "light")
        self.assertTrue(res.data['email_notifications'])

    def test_06_profile_patch(self):
        user = User.objects.create_user(email="phase1test@notiva.dev", username="phase1user", password="SecurePass@123")
        self.client.force_authenticate(user=user)
        res = self.client.patch(f'{BASE}/profile/', {"display_name": "Phase One Tester", "theme_preference": "dark"}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['display_name'], "Phase One Tester")
        self.assertEqual(res.data['theme_preference'], "dark")

    def test_07_token_refresh(self):
        user = User.objects.create_user(email="phase1test@notiva.dev", username="phase1user", password="SecurePass@123")
        res = self.client.post(f'{BASE}/login/', {"email": "phase1test@notiva.dev", "password": "SecurePass@123"})
        refresh = res.data['refresh']
        res2 = self.client.post(f'{BASE}/token/refresh/', {"refresh": refresh})
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertIn("access", res2.data)

    def test_08_change_password(self):
        user = User.objects.create_user(email="phase1test@notiva.dev", username="phase1user", password="SecurePass@123")
        self.client.force_authenticate(user=user)
        res = self.client.post(f'{BASE}/change-password/', {
            "old_password": "SecurePass@123",
            "new_password": "NewSecure@456",
            "new_password2": "NewSecure@456"
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        # Test login with new password
        res_login = self.client.post(f'{BASE}/login/', {"email": "phase1test@notiva.dev", "password": "NewSecure@456"})
        self.assertEqual(res_login.status_code, status.HTTP_200_OK)

    def test_10_wrong_password(self):
        User.objects.create_user(email="phase1test@notiva.dev", username="phase1user", password="SecurePass@123")
        res = self.client.post(f'{BASE}/login/', {"email": "phase1test@notiva.dev", "password": "WrongPassword!"})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_11_duplicate_email(self):
        User.objects.create_user(email="phase1test@notiva.dev", username="phase1user", password="SecurePass@123")
        res = self.client.post(f'{BASE}/register/', {
            "email": "phase1test@notiva.dev",
            "username": "anotheruser",
            "password": "SecurePass@123",
            "password2": "SecurePass@123",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_12_logout(self):
        user = User.objects.create_user(email="phase1test@notiva.dev", username="phase1user", password="SecurePass@123")
        res_login = self.client.post(f'{BASE}/login/', {"email": "phase1test@notiva.dev", "password": "SecurePass@123"})
        refresh = res_login.data['refresh']
        access = res_login.data['access']

        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + access)
        res = self.client.post(f'{BASE}/logout/', {"refresh": refresh})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res2 = self.client.post(f'{BASE}/token/refresh/', {"refresh": refresh})
        self.assertEqual(res2.status_code, status.HTTP_401_UNAUTHORIZED)
