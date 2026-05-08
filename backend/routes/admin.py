"""Admin routes: teachers/students CRUD, analytics, attendance reports."""
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from models import TeacherCreate, TeacherUpdate, StudentCreate, StudentUpdate
from auth_utils import require_roles

router = APIRouter(prefix="/admin", tags=["admin"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _ensure_parent_user(db, parent_email: str | None, parent_name: str | None, child_name: str | None):
    """Auto-create a parent user (passwordless) for a student's parent_email so they can OTP-login."""
    if not parent_email:
        return
    pemail = parent_email.lower()
    existing = await db.users.find_one({"email": pemail}, {"_id": 0})
    if existing:
        return
    display = parent_name or (f"Parent of {child_name}" if child_name else "Parent")
    await db.users.insert_one({
        "id": str(uuid.uuid4()),
        "name": display,
        "email": pemail,
        "role": "parent",
        "phone": "",
        "created_at": _now_iso(),
    })


# ------------- Analytics -------------
@router.get("/analytics")
async def analytics(_=Depends(require_roles("admin"))):
    db = get_db()
    total_students = await db.students.count_documents({})
    total_teachers = await db.users.count_documents({"role": "teacher"})
    total_parents = await db.users.count_documents({"role": "parent"})
    total_classes = len(await db.students.distinct("class_name"))

    # Attendance trend — last 7 days, % present
    today = datetime.now(timezone.utc).date()
    trend = []
    for days_ago in range(6, -1, -1):
        d = (today - timedelta(days=days_ago)).isoformat()
        total = await db.attendance.count_documents({"date": d})
        present = await db.attendance.count_documents({"date": d, "status": "present"})
        pct = round((present / total * 100), 1) if total > 0 else 0
        trend.append({"date": d, "present_pct": pct, "total": total, "present": present})

    # Class-wise student distribution
    pipeline = [
        {"$group": {"_id": {"class_name": "$class_name", "section": "$section"}, "count": {"$sum": 1}}},
        {"$sort": {"_id.class_name": 1, "_id.section": 1}},
    ]
    class_dist = []
    async for row in db.students.aggregate(pipeline):
        class_dist.append({
            "label": f"Class {row['_id']['class_name']}-{row['_id']['section']}",
            "count": row["count"],
        })

    # Gender distribution
    gender_counts = {"M": 0, "F": 0, "Other": 0}
    async for s in db.students.find({}, {"_id": 0, "gender": 1}):
        g = s.get("gender", "Other")
        gender_counts[g] = gender_counts.get(g, 0) + 1

    return {
        "totals": {
            "students": total_students,
            "teachers": total_teachers,
            "parents": total_parents,
            "classes": total_classes,
        },
        "attendance_trend": trend,
        "class_distribution": class_dist,
        "gender_distribution": [
            {"label": "Boys", "count": gender_counts.get("M", 0)},
            {"label": "Girls", "count": gender_counts.get("F", 0)},
            {"label": "Other", "count": gender_counts.get("Other", 0)},
        ],
    }


# ------------- Teachers CRUD -------------
@router.get("/teachers")
async def list_teachers(_=Depends(require_roles("admin"))):
    db = get_db()
    users = await db.users.find({"role": "teacher"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    # enrich with teacher_profiles
    for u in users:
        p = await db.teacher_profiles.find_one({"email": u["email"]}, {"_id": 0})
        u["subject"] = (p or {}).get("subject", "")
        u["classes"] = (p or {}).get("classes", [])
    return users


@router.post("/teachers")
async def create_teacher(req: TeacherCreate, _=Depends(require_roles("admin"))):
    db = get_db()
    email = req.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already exists")
    user = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "email": email,
        "role": "teacher",
        "phone": req.phone,
        "created_at": _now_iso(),
    }
    await db.users.insert_one(user.copy())
    await db.teacher_profiles.update_one(
        {"email": email},
        {"$set": {"email": email, "subject": req.subject or "", "classes": req.classes, "updated_at": _now_iso()}},
        upsert=True,
    )
    user["subject"] = req.subject or ""
    user["classes"] = req.classes
    return user


@router.put("/teachers/{teacher_id}")
async def update_teacher(teacher_id: str, req: TeacherUpdate, _=Depends(require_roles("admin"))):
    db = get_db()
    user = await db.users.find_one({"id": teacher_id, "role": "teacher"}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Teacher not found")
    user_updates = {k: v for k, v in {"name": req.name, "phone": req.phone}.items() if v is not None}
    if user_updates:
        await db.users.update_one({"id": teacher_id}, {"$set": user_updates})
    profile_updates = {}
    if req.subject is not None:
        profile_updates["subject"] = req.subject
    if req.classes is not None:
        profile_updates["classes"] = req.classes
    if profile_updates:
        profile_updates["updated_at"] = _now_iso()
        await db.teacher_profiles.update_one({"email": user["email"]}, {"$set": profile_updates}, upsert=True)
    return {"message": "Updated"}


@router.delete("/teachers/{teacher_id}")
async def delete_teacher(teacher_id: str, _=Depends(require_roles("admin"))):
    db = get_db()
    user = await db.users.find_one({"id": teacher_id, "role": "teacher"}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Teacher not found")
    await db.users.delete_one({"id": teacher_id})
    await db.teacher_profiles.delete_one({"email": user["email"]})
    return {"message": "Deleted"}


# ------------- Students CRUD -------------
@router.get("/students")
async def list_students(_=Depends(require_roles("admin"))):
    db = get_db()
    return await db.students.find({}, {"_id": 0}).to_list(2000)


@router.post("/students")
async def create_student(req: StudentCreate, _=Depends(require_roles("admin"))):
    db = get_db()
    student = {
        "id": str(uuid.uuid4()),
        **req.model_dump(),
        "created_at": _now_iso(),
    }
    await db.students.insert_one(student.copy())
    student.pop("_id", None)
    await _ensure_parent_user(db, req.parent_email, req.parent_name, req.name)
    return student


@router.put("/students/{student_id}")
async def update_student(student_id: str, req: StudentUpdate, _=Depends(require_roles("admin"))):
    db = get_db()
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        return {"message": "Nothing to update"}
    res = await db.students.update_one({"id": student_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    if req.parent_email:
        student = await db.students.find_one({"id": student_id}, {"_id": 0})
        await _ensure_parent_user(db, req.parent_email, req.parent_name, (student or {}).get("name"))
    return {"message": "Updated"}


@router.delete("/students/{student_id}")
async def delete_student(student_id: str, _=Depends(require_roles("admin"))):
    db = get_db()
    res = await db.students.delete_one({"id": student_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"message": "Deleted"}


# ------------- Attendance reports -------------
@router.get("/attendance-report")
async def attendance_report(class_name: str | None = None, section: str | None = None, _=Depends(require_roles("admin"))):
    db = get_db()
    q = {}
    if class_name:
        q["class_name"] = class_name
    if section:
        q["section"] = section
    records = await db.attendance.find(q, {"_id": 0}).sort("date", -1).to_list(1000)
    # Enrich with student names
    ids = list({r["student_id"] for r in records})
    students = await db.students.find({"id": {"$in": ids}}, {"_id": 0, "id": 1, "name": 1, "roll_no": 1}).to_list(2000)
    smap = {s["id"]: s for s in students}
    for r in records:
        r["student_name"] = smap.get(r["student_id"], {}).get("name", "")
        r["roll_no"] = smap.get(r["student_id"], {}).get("roll_no", "")
    return records
