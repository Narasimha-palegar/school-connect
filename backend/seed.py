"""Idempotent seed: admin (passwordless) + demo teacher/parent + sample data."""
import os
import uuid
from datetime import datetime, timezone, timedelta
from database import get_db


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _ensure_user(db, email: str, name: str, role: str, phone: str = "") -> dict:
    """Idempotent — re-syncs name/phone/role on every startup. Passwordless (OTP login)."""
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "phone": phone, "role": role}, "$unset": {"password_hash": "", "verified": ""}},
        )
        existing.update({"name": name, "phone": phone, "role": role})
        existing.pop("password_hash", None)
        return existing
    user = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "role": role,
        "phone": phone,
        "created_at": _now_iso(),
    }
    await db.users.insert_one(user.copy())
    return user


async def run_seed():
    db = get_db()

    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.students.create_index("id", unique=True)
    await db.students.create_index("roll_no")
    await db.attendance.create_index([("student_id", 1), ("date", 1)])
    await db.otp_codes.create_index("email")

    # Remove deprecated default admin if present (we now use the env-configured admin email)
    new_admin_email = os.environ.get("ADMIN_EMAIL", "admin@school.com").lower()
    if new_admin_email != "admin@school.com":
        await db.users.delete_one({"email": "admin@school.com", "role": "admin"})

    admin = await _ensure_user(
        db, new_admin_email,
        os.environ.get("ADMIN_NAME", "Principal"), "admin", "+1-555-0100",
    )
    teacher = await _ensure_user(
        db, os.environ.get("DEMO_TEACHER_EMAIL", "teacher@school.com").lower(),
        os.environ.get("DEMO_TEACHER_NAME", "Jane Wilson"), "teacher", "+1-555-0200",
    )
    await _ensure_user(
        db, os.environ.get("DEMO_PARENT_EMAIL", "parent@school.com").lower(),
        os.environ.get("DEMO_PARENT_NAME", "John Doe"), "parent", "+1-555-0300",
    )

    # Extra teachers
    await _ensure_user(db, "michael.okafor@school.com", "Michael Okafor", "teacher", "+1-555-0201")
    await _ensure_user(db, "priya.sharma@school.com", "Priya Sharma", "teacher", "+1-555-0202")
    await _ensure_user(db, "david.kim@school.com", "David Kim", "teacher", "+1-555-0203")

    # Teacher profiles
    teacher_profiles = [
        {"email": "teacher@school.com", "subject": "Mathematics", "classes": ["5-A", "5-B", "6-A"]},
        {"email": "michael.okafor@school.com", "subject": "Science", "classes": ["5-A", "6-A", "6-B"]},
        {"email": "priya.sharma@school.com", "subject": "English", "classes": ["5-A", "5-B", "6-A", "6-B"]},
        {"email": "david.kim@school.com", "subject": "History", "classes": ["5-B", "6-A"]},
    ]
    for tp in teacher_profiles:
        await db.teacher_profiles.update_one(
            {"email": tp["email"]},
            {"$set": {**tp, "updated_at": _now_iso()}},
            upsert=True,
        )

    # Students
    if await db.students.count_documents({}) == 0:
        students = [
            ("Alex Doe", "5A-01", "5", "A", "parent@school.com", "M"),
            ("Emma Chen", "5A-02", "5", "A", "emma.parent@school.com", "F"),
            ("Liam Patel", "5A-03", "5", "A", "liam.parent@school.com", "M"),
            ("Sophia Garcia", "5A-04", "5", "A", "sophia.parent@school.com", "F"),
            ("Noah Johnson", "5A-05", "5", "A", "noah.parent@school.com", "M"),
            ("Ava Williams", "5A-06", "5", "A", "ava.parent@school.com", "F"),
            ("Mia Thompson", "5B-01", "5", "B", "mia.parent@school.com", "F"),
            ("James Wilson", "5B-02", "5", "B", "james.parent@school.com", "M"),
            ("Isabella Brown", "5B-03", "5", "B", "isabella.parent@school.com", "F"),
            ("Ethan Davis", "5B-04", "5", "B", "ethan.parent@school.com", "M"),
            ("Olivia Martinez", "6A-01", "6", "A", "olivia.parent@school.com", "F"),
            ("Lucas Taylor", "6A-02", "6", "A", "lucas.parent@school.com", "M"),
            ("Charlotte Anderson", "6A-03", "6", "A", "charlotte.parent@school.com", "F"),
        ]
        docs = []
        for name, roll, cls, sec, pemail, gender in students:
            docs.append({
                "id": str(uuid.uuid4()), "name": name, "roll_no": roll,
                "class_name": cls, "section": sec, "parent_email": pemail,
                "gender": gender, "dob": "2013-05-15", "created_at": _now_iso(),
            })
        await db.students.insert_many(docs)

    # Auto-ensure parent users exist for every student.parent_email (so they can OTP-login)
    student_parents = await db.students.find({"parent_email": {"$exists": True, "$ne": None}}, {"_id": 0, "parent_email": 1, "name": 1}).to_list(2000)
    for sp in student_parents:
        pemail = (sp.get("parent_email") or "").lower()
        if not pemail:
            continue
        existing = await db.users.find_one({"email": pemail}, {"_id": 0})
        if not existing:
            child_name = sp.get("name", "")
            parent_display = f"Parent of {child_name}" if child_name else "Parent"
            await db.users.insert_one({
                "id": str(uuid.uuid4()), "name": parent_display,
                "email": pemail, "role": "parent", "phone": "",
                "created_at": _now_iso(),
            })

    five_a = await db.students.find({"class_name": "5", "section": "A"}, {"_id": 0}).to_list(100)
    if five_a and await db.attendance.count_documents({}) == 0:
        today = datetime.now(timezone.utc).date()
        import random
        random.seed(42)
        statuses = ["present"] * 6 + ["absent", "late"]
        for days_ago in range(14):
            d = (today - timedelta(days=days_ago)).isoformat()
            for s in five_a:
                await db.attendance.insert_one({
                    "id": str(uuid.uuid4()), "student_id": s["id"],
                    "class_name": s["class_name"], "section": s["section"],
                    "date": d, "status": random.choice(statuses),
                    "marked_by": teacher["email"], "created_at": _now_iso(),
                })

    if await db.homework.count_documents({}) == 0:
        hws = [
            {"class_name": "5", "section": "A", "subject": "Mathematics", "title": "Fractions Practice",
             "description": "Complete exercises 4.1 to 4.5 on page 62.",
             "due_date": (datetime.now(timezone.utc).date() + timedelta(days=3)).isoformat()},
            {"class_name": "5", "section": "A", "subject": "English", "title": "Book Report",
             "description": "Write a 1-page report on 'Charlotte's Web'.",
             "due_date": (datetime.now(timezone.utc).date() + timedelta(days=7)).isoformat()},
            {"class_name": "5", "section": "A", "subject": "Science", "title": "Plant Observation",
             "description": "Observe and sketch 5 local plants.",
             "due_date": (datetime.now(timezone.utc).date() + timedelta(days=5)).isoformat()},
        ]
        for hw in hws:
            await db.homework.insert_one({"id": str(uuid.uuid4()), **hw, "assigned_by": teacher["email"], "created_at": _now_iso()})

    if await db.announcements.count_documents({}) == 0:
        anns = [
            {"title": "Annual Sports Day on March 15", "content": "Students should arrive by 8:00 AM in sports uniform.", "audience": "all"},
            {"title": "Parent-Teacher Meeting", "content": "PTM scheduled for Saturday, 10 AM to 1 PM.", "audience": "parents"},
            {"title": "Mid-Term Exam Schedule Released", "content": "Please check notice board for the schedule.", "audience": "all"},
        ]
        for a in anns:
            await db.announcements.insert_one({"id": str(uuid.uuid4()), **a, "created_by": admin["email"], "created_at": _now_iso()})

    if await db.events.count_documents({}) == 0:
        evs = [
            {"title": "Annual Sports Day", "description": "Track & field events", "date": (datetime.now(timezone.utc).date() + timedelta(days=30)).isoformat(), "location": "Main Ground"},
            {"title": "Science Fair", "description": "Student projects exhibition", "date": (datetime.now(timezone.utc).date() + timedelta(days=45)).isoformat(), "location": "Auditorium"},
        ]
        for e in evs:
            await db.events.insert_one({"id": str(uuid.uuid4()), **e, "created_by": admin["email"], "created_at": _now_iso()})

    if await db.lost_found.count_documents({}) == 0:
        items = [
            {"item_name": "Blue Water Bottle", "description": "Hydro Flask, stickers on it", "location": "Cafeteria", "type": "lost", "status": "open"},
            {"item_name": "Red Backpack", "description": "Jansport with name tag 'M. Lee'", "location": "Playground", "type": "found", "status": "open"},
        ]
        for it in items:
            await db.lost_found.insert_one({"id": str(uuid.uuid4()), **it, "reported_by": teacher["email"], "reported_by_name": teacher["name"], "created_at": _now_iso()})

    if await db.performance.count_documents({}) == 0:
        alex = await db.students.find_one({"roll_no": "5A-01"}, {"_id": 0})
        if alex:
            perfs = [
                {"subject": "Mathematics", "test_name": "Unit Test 1", "score": 42, "max_score": 50, "remarks": "Good effort."},
                {"subject": "English", "test_name": "Spelling Bee", "score": 18, "max_score": 20, "remarks": "Excellent vocabulary."},
                {"subject": "Science", "test_name": "Quiz 1", "score": 15, "max_score": 20, "remarks": "Review photosynthesis."},
                {"subject": "Mathematics", "test_name": "Unit Test 2", "score": 45, "max_score": 50, "remarks": "Steady improvement."},
            ]
            for p in perfs:
                await db.performance.insert_one({"id": str(uuid.uuid4()), "student_id": alex["id"], **p, "added_by": teacher["email"], "date": _now_iso()})

    if await db.timetable.count_documents({}) == 0:
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        cycle = [
            ["Mathematics", "English", "Science", "History", "Art", "PE"],
            ["English", "Mathematics", "History", "Science", "Music", "Library"],
            ["Science", "History", "Mathematics", "English", "PE", "Art"],
            ["History", "Science", "English", "Mathematics", "Library", "Music"],
            ["Mathematics", "English", "Science", "History", "Art", "PE"],
        ]
        for i, day in enumerate(days):
            for p, subj in enumerate(cycle[i]):
                await db.timetable.insert_one({
                    "id": str(uuid.uuid4()), "class_name": "5", "section": "A",
                    "day": day, "period": p + 1, "subject": subj,
                    "teacher_email": teacher["email"], "created_at": _now_iso(),
                })

    if await db.notes.count_documents({}) == 0:
        notes = [
            {"class_name": "5", "section": "A", "subject": "Mathematics", "title": "Fractions Summary",
             "content": "A fraction represents a part of a whole. Numerator (top) and Denominator (bottom)."},
            {"class_name": "5", "section": "A", "subject": "Science", "title": "Photosynthesis Notes",
             "content": "Photosynthesis: plants use sunlight, water, and CO2 to make glucose and oxygen."},
        ]
        for n in notes:
            await db.notes.insert_one({"id": str(uuid.uuid4()), **n, "uploaded_by": teacher["email"], "created_at": _now_iso()})
