"""Iteration 3 regression: passwordless OTP login + cascading parent auto-create + lost-found email.

Covers:
- /auth/login-request + /auth/login-verify (passwordless)
- Deprecated endpoints removed
- /admin/teachers without password
- /admin/students auto-creates parent
- /teacher/students/create auto-creates parent
- /admin/students update creates parent
- /lost-found claim email
- Seed idempotency / no password_hash / no admin@school.com
"""
import os
import uuid
import time
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "school_connect")

ADMIN_EMAIL = "narasimha.palegar.07@gmail.com"
TEACHER_EMAIL = "narasimha9663020@gmail.com"
PARENT_EMAIL = "parent@school.com"


@pytest.fixture(scope="session")
def db():
    # Testing from external host — the container's MONGO_URL points to localhost
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


def _latest_otp(db, email, purpose="login"):
    return db.otp_codes.find_one(
        {"email": email.lower(), "purpose": purpose, "used": False},
        sort=[("created_at", -1)],
    )


def _login(db, email):
    r = requests.post(f"{API}/auth/login-request", json={"email": email}, timeout=20)
    assert r.status_code == 200, f"login-request failed: {r.status_code} {r.text}"
    time.sleep(0.3)
    otp_doc = _latest_otp(db, email)
    assert otp_doc, f"No OTP found for {email}"
    r2 = requests.post(f"{API}/auth/login-verify", json={"email": email, "otp": otp_doc["code"]}, timeout=20)
    assert r2.status_code == 200, f"login-verify failed: {r2.status_code} {r2.text}"
    data = r2.json()
    return data["token"], data["user"]


@pytest.fixture(scope="session")
def admin_token(db):
    token, _ = _login(db, ADMIN_EMAIL)
    return token


@pytest.fixture(scope="session")
def teacher_token(db):
    token, _ = _login(db, TEACHER_EMAIL)
    return token


# ----- Auth: login-request -----
class TestLoginRequest:
    def test_known_user_returns_message(self, db):
        r = requests.post(f"{API}/auth/login-request", json={"email": ADMIN_EMAIL}, timeout=20)
        assert r.status_code == 200
        body = r.json()
        assert "emailed" in body.get("message", "").lower()
        assert body.get("email") == ADMIN_EMAIL.lower()
        # verify OTP stored
        otp = _latest_otp(db, ADMIN_EMAIL)
        assert otp is not None
        assert otp["purpose"] == "login"
        assert otp["used"] is False
        assert len(otp["code"]) == 6

    def test_unknown_email_returns_404(self):
        r = requests.post(f"{API}/auth/login-request", json={"email": f"noone_{uuid.uuid4().hex[:6]}@nowhere.com"}, timeout=20)
        assert r.status_code == 404
        assert "no account found" in r.json()["detail"].lower()


# ----- Auth: login-verify -----
class TestLoginVerify:
    def test_valid_otp_returns_token_and_user(self, db):
        email = TEACHER_EMAIL
        requests.post(f"{API}/auth/login-request", json={"email": email}, timeout=20)
        time.sleep(0.3)
        otp = _latest_otp(db, email)
        r = requests.post(f"{API}/auth/login-verify", json={"email": email, "otp": otp["code"]}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d.get("token")
        assert d["user"]["email"] == email
        assert d["user"]["role"] == "teacher"
        assert "password_hash" not in d["user"]

    def test_reuse_of_otp_rejected(self, db):
        email = PARENT_EMAIL
        requests.post(f"{API}/auth/login-request", json={"email": email}, timeout=20)
        time.sleep(0.3)
        otp = _latest_otp(db, email)
        r1 = requests.post(f"{API}/auth/login-verify", json={"email": email, "otp": otp["code"]}, timeout=20)
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/auth/login-verify", json={"email": email, "otp": otp["code"]}, timeout=20)
        assert r2.status_code == 400
        assert "invalid" in r2.json()["detail"].lower() or "used" in r2.json()["detail"].lower()

    def test_expired_otp_returns_400(self, db):
        email = f"expired_{uuid.uuid4().hex[:6]}@school.com"
        # Pre-create the user so login-request would succeed, but we inject directly.
        db.users.insert_one({
            "id": str(uuid.uuid4()), "name": "Expiry Test", "email": email,
            "role": "parent", "phone": "", "created_at": datetime.now(timezone.utc).isoformat(),
        })
        past = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
        db.otp_codes.insert_one({
            "id": str(uuid.uuid4()), "email": email, "code": "000000",
            "purpose": "login", "expires_at": past, "used": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        r = requests.post(f"{API}/auth/login-verify", json={"email": email, "otp": "000000"}, timeout=20)
        assert r.status_code == 400
        assert "expired" in r.json()["detail"].lower()
        # cleanup
        db.users.delete_one({"email": email})
        db.otp_codes.delete_many({"email": email})


# ----- /auth/me -----
class TestAuthMe:
    def test_me_returns_admin_user(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL.lower()
        assert d["role"] == "admin"


# ----- Deprecated endpoints -----
class TestDeprecated:
    @pytest.mark.parametrize("path,method,body", [
        ("/auth/register", "POST", {"email": "x@x.com", "password": "x"}),
        ("/auth/verify-otp", "POST", {"email": "x@x.com", "otp": "123456"}),
        ("/auth/resend-otp", "POST", {"email": "x@x.com"}),
        ("/auth/login", "POST", {"email": "x@x.com", "password": "x"}),
        ("/auth/forgot-password", "POST", {"email": "x@x.com"}),
        ("/auth/reset-password", "POST", {"email": "x@x.com", "otp": "x", "new_password": "x"}),
    ])
    def test_removed(self, path, method, body):
        r = requests.request(method, f"{API}{path}", json=body, timeout=20)
        assert r.status_code in (404, 405), f"{path} -> {r.status_code}"


# ----- Admin: teachers without password -----
class TestTeacherCreateNoPassword:
    def test_create_teacher_no_password(self, db, admin_token):
        email = f"test_teacher_{uuid.uuid4().hex[:6]}@school.com"
        body = {"name": "TEST Teacher", "email": email, "phone": "+1-555-0001",
                "subject": "Math", "classes": ["5-A"]}
        r = requests.post(f"{API}/admin/teachers", json=body,
                          headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["email"] == email
        # no password_hash persisted
        doc = db.users.find_one({"email": email})
        assert doc is not None
        assert "password_hash" not in doc

        # cleanup
        requests.delete(f"{API}/admin/teachers/{d['id']}",
                        headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)

    def test_create_teacher_ignores_password_field(self, db, admin_token):
        email = f"test_teacher_pw_{uuid.uuid4().hex[:6]}@school.com"
        body = {"name": "TEST Teacher2", "email": email, "phone": "+1-555-0002",
                "subject": "Math", "classes": ["5-A"], "password": "shouldBeIgnored"}
        r = requests.post(f"{API}/admin/teachers", json=body,
                          headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        doc = db.users.find_one({"email": email})
        assert "password_hash" not in doc
        assert "password" not in doc
        requests.delete(f"{API}/admin/teachers/{d['id']}",
                        headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)


# ----- Admin: students auto-parent create -----
class TestStudentParentAutoCreate:
    def test_admin_create_student_auto_creates_parent(self, db, admin_token):
        parent_email = f"test_parent_{uuid.uuid4().hex[:6]}@example.com"
        body = {"name": "TEST Student", "roll_no": f"T{uuid.uuid4().hex[:4]}",
                "class_name": "5", "section": "A", "parent_email": parent_email,
                "parent_name": "Test Parent", "gender": "M", "dob": "2013-01-01"}
        r = requests.post(f"{API}/admin/students", json=body,
                          headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
        assert r.status_code == 200, r.text
        sid = r.json()["id"]
        parent = db.users.find_one({"email": parent_email})
        assert parent is not None
        assert parent["role"] == "parent"
        assert "password_hash" not in parent
        # parent can request OTP
        r2 = requests.post(f"{API}/auth/login-request", json={"email": parent_email}, timeout=20)
        assert r2.status_code == 200
        # cleanup
        requests.delete(f"{API}/admin/students/{sid}",
                        headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
        db.users.delete_one({"email": parent_email})

    def test_admin_update_student_parent_email_creates_parent(self, db, admin_token):
        # create student without parent first
        body = {"name": "TEST Student2", "roll_no": f"T{uuid.uuid4().hex[:4]}",
                "class_name": "5", "section": "A"}
        r = requests.post(f"{API}/admin/students", json=body,
                          headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
        sid = r.json()["id"]
        new_parent = f"test_upd_parent_{uuid.uuid4().hex[:6]}@example.com"
        r2 = requests.put(f"{API}/admin/students/{sid}",
                          json={"parent_email": new_parent, "parent_name": "Upd Parent"},
                          headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
        assert r2.status_code == 200
        parent = db.users.find_one({"email": new_parent})
        assert parent is not None and parent["role"] == "parent"
        # cleanup
        requests.delete(f"{API}/admin/students/{sid}",
                        headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
        db.users.delete_one({"email": new_parent})

    def test_teacher_create_student_auto_parent_and_class_enforcement(self, db, teacher_token):
        parent_email = f"test_tparent_{uuid.uuid4().hex[:6]}@example.com"
        body = {"name": "TEST TStudent", "roll_no": f"T{uuid.uuid4().hex[:4]}",
                "class_name": "5", "section": "A", "parent_email": parent_email}
        r = requests.post(f"{API}/teacher/students/create", json=body,
                          headers={"Authorization": f"Bearer {teacher_token}"}, timeout=20)
        assert r.status_code == 200, r.text
        sid = r.json()["id"]
        assert db.users.find_one({"email": parent_email}) is not None
        # now try a class not assigned to teacher (9-Z)
        body2 = {"name": "TEST TStudent Bad", "roll_no": f"T{uuid.uuid4().hex[:4]}",
                 "class_name": "9", "section": "Z"}
        r2 = requests.post(f"{API}/teacher/students/create", json=body2,
                           headers={"Authorization": f"Bearer {teacher_token}"}, timeout=20)
        assert r2.status_code == 403
        # cleanup
        db.students.delete_one({"id": sid})
        db.users.delete_one({"email": parent_email})


# ----- Seed idempotency -----
class TestSeed:
    def test_no_old_admin(self, db):
        assert db.users.find_one({"email": "admin@school.com"}) is None

    def test_new_admin_exists(self, db):
        u = db.users.find_one({"email": ADMIN_EMAIL.lower()})
        assert u and u["role"] == "admin"
        assert "password_hash" not in u

    def test_demo_users_have_no_password_hash(self, db):
        for em in (ADMIN_EMAIL.lower(), TEACHER_EMAIL, PARENT_EMAIL):
            u = db.users.find_one({"email": em})
            assert u is not None, f"missing {em}"
            assert "password_hash" not in u, f"password_hash still present on {em}"


# ----- Lost & Found email -----
class TestLostFound:
    def test_claim_triggers_email(self, db, admin_token, teacher_token):
        # Pick an existing lost-found item reported by teacher, reset to open
        item = db.lost_found.find_one({"reported_by": TEACHER_EMAIL})
        assert item is not None, "seed missing lost-found item"
        db.lost_found.update_one({"id": item["id"]}, {"$set": {"status": "open"}})
        # admin claims it
        r = requests.put(
            f"{API}/lost-found/{item['id']}",
            json={"status": "claimed"},
            headers={"Authorization": f"Bearer {admin_token}"}, timeout=30,
        )
        assert r.status_code == 200, r.text
        # check log for email line
        time.sleep(2)
        try:
            with open("/var/log/supervisor/backend.err.log") as f:
                log = f.read()[-20000:]
            assert "subject=Your lost item has been found" in log or "subject=Your Lost Item" in log.lower()
        except FileNotFoundError:
            pytest.skip("backend log not accessible from this environment")
