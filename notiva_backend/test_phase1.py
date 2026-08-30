"""
Phase 1 API Test Script
Run with: python test_phase1.py
Django dev server must be running on port 8000.
"""

import urllib.request
import urllib.error
import json
import sys

BASE = "http://localhost:8000/api/v1"
PASS = "[PASS]"
FAIL = "[FAIL]"


def post(path, data, token=None):
    body = json.dumps(data).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(BASE + path, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def get(path, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(BASE + path, headers=headers)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def patch(path, data, token=None):
    body = json.dumps(data).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(BASE + path, data=body, headers=headers, method="PATCH")
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def check(label, condition, detail=""):
    if condition:
        print(f"  {PASS}  {label}")
    else:
        print(f"  {FAIL}  {label} | {detail}")
    return condition


results = []

# ------------------------------------------------------------------
# TEST 1: Registration
# ------------------------------------------------------------------
print("\n=== TEST 1: Register new user ===")
s, d = post("/auth/register/", {
    "email": "phase1test@notiva.dev",
    "username": "phase1user",
    "password": "SecurePass@123",
    "password2": "SecurePass@123",
    "first_name": "Phase",
    "last_name": "One",
})
results.append(check("Status 201", s == 201, f"got {s}"))
results.append(check("User email in response", d.get("user", {}).get("email") == "phase1test@notiva.dev"))
results.append(check("Access token issued", "access" in d))
results.append(check("Refresh token issued", "refresh" in d))
access_token = d.get("access")
refresh_token = d.get("refresh")

# ------------------------------------------------------------------
# TEST 2: Login
# ------------------------------------------------------------------
print("\n=== TEST 2: Login ===")
s2, d2 = post("/auth/login/", {
    "email": "phase1test@notiva.dev",
    "password": "SecurePass@123",
})
results.append(check("Status 200", s2 == 200, f"got {s2}"))
results.append(check("User in login response", "user" in d2))
results.append(check("Access token on login", "access" in d2))
access_token = d2.get("access", access_token)
refresh_token = d2.get("refresh", refresh_token)

# ------------------------------------------------------------------
# TEST 3: Get current user (/me/)
# ------------------------------------------------------------------
print("\n=== TEST 3: GET /me/ (authenticated) ===")
s3, d3 = get("/auth/me/", token=access_token)
results.append(check("Status 200", s3 == 200, f"got {s3}"))
results.append(check("Email matches", d3.get("email") == "phase1test@notiva.dev"))

# ------------------------------------------------------------------
# TEST 4: /me/ without token should return 401
# ------------------------------------------------------------------
print("\n=== TEST 4: GET /me/ (unauthenticated) ===")
s4, d4 = get("/auth/me/")
results.append(check("Status 401", s4 == 401, f"got {s4}"))

# ------------------------------------------------------------------
# TEST 5: Get profile
# ------------------------------------------------------------------
print("\n=== TEST 5: GET /profile/ ===")
s5, d5 = get("/auth/profile/", token=access_token)
results.append(check("Status 200", s5 == 200, f"got {s5}"))
results.append(check("Default theme is light", d5.get("theme_preference") == "light"))
results.append(check("Email notifications on by default", d5.get("email_notifications") is True))

# ------------------------------------------------------------------
# TEST 6: Update profile (PATCH)
# ------------------------------------------------------------------
print("\n=== TEST 6: PATCH /profile/ ===")
s6, d6 = patch("/auth/profile/", {"display_name": "Phase One Tester", "theme_preference": "dark"}, token=access_token)
results.append(check("Status 200", s6 == 200, f"got {s6}"))
results.append(check("Display name updated", d6.get("display_name") == "Phase One Tester"))
results.append(check("Theme updated to dark", d6.get("theme_preference") == "dark"))

# ------------------------------------------------------------------
# TEST 7: Token refresh
# ------------------------------------------------------------------
print("\n=== TEST 7: POST /token/refresh/ ===")
s7, d7 = post("/auth/token/refresh/", {"refresh": refresh_token})
results.append(check("Status 200", s7 == 200, f"got {s7}"))
results.append(check("New access token returned", "access" in d7))
new_access = d7.get("access", access_token)
new_refresh = d7.get("refresh", refresh_token)

# ------------------------------------------------------------------
# TEST 8: Change password
# ------------------------------------------------------------------
print("\n=== TEST 8: POST /change-password/ ===")
s8, d8 = post("/auth/change-password/", {
    "old_password": "SecurePass@123",
    "new_password": "NewSecure@456",
    "new_password2": "NewSecure@456",
}, token=new_access)
results.append(check("Status 200", s8 == 200, f"got {s8}  | {d8}"))

# ------------------------------------------------------------------
# TEST 9: Login with new password
# ------------------------------------------------------------------
print("\n=== TEST 9: Login with new password ===")
s9, d9 = post("/auth/login/", {
    "email": "phase1test@notiva.dev",
    "password": "NewSecure@456",
})
results.append(check("Status 200 with new password", s9 == 200, f"got {s9}"))
final_access = d9.get("access")
final_refresh = d9.get("refresh")

# ------------------------------------------------------------------
# TEST 10: Wrong password should fail
# ------------------------------------------------------------------
print("\n=== TEST 10: Login with wrong password ===")
s10, d10 = post("/auth/login/", {
    "email": "phase1test@notiva.dev",
    "password": "WrongPassword!",
})
results.append(check("Status 401 on wrong password", s10 == 401, f"got {s10}"))

# ------------------------------------------------------------------
# TEST 11: Duplicate email registration
# ------------------------------------------------------------------
print("\n=== TEST 11: Duplicate email registration ===")
s11, d11 = post("/auth/register/", {
    "email": "phase1test@notiva.dev",
    "username": "anotheruser",
    "password": "SecurePass@123",
    "password2": "SecurePass@123",
})
results.append(check("Status 400 on duplicate email", s11 == 400, f"got {s11}"))

# ------------------------------------------------------------------
# TEST 12: Logout (blacklist refresh token)
# ------------------------------------------------------------------
print("\n=== TEST 12: POST /logout/ ===")
s12, d12 = post("/auth/logout/", {"refresh": final_refresh}, token=final_access)
results.append(check("Status 200 on logout", s12 == 200, f"got {s12} | {d12}"))

# ------------------------------------------------------------------
# TEST 13: Use blacklisted token should fail
# ------------------------------------------------------------------
print("\n=== TEST 13: Use blacklisted refresh token ===")
s13, d13 = post("/auth/token/refresh/", {"refresh": final_refresh})
results.append(check("Status 401 on blacklisted token", s13 == 401, f"got {s13}"))

# ------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------
passed = sum(results)
total = len(results)
print(f"\n{'='*50}")
print(f"Results: {passed}/{total} checks passed")
if passed == total:
    print("All Phase 1 API tests PASSED.")
else:
    print(f"WARNING: {total - passed} check(s) failed.")
    sys.exit(1)
