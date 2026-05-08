"""Teacher routes: classes, students, attendance, homework, notes, performance."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from models import (
    MarkAttendanceRequest, HomeworkCreate, NoteCreate, PerformanceCreate,
    StudentCreate, StudentUpdate,
)
from auth_utils import require_roles

router = APIRouter(prefix="/teacher", tags=["teacher"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/my-classes")
async def my_classes(current=Depends(require_roles("teacher"))):
    db = get_db()
    profile = await db.teacher_profiles.find_one({"email": current["email"]}, {"_id": 0})
    classes = (profile or {}).get("classes", [])
    result = []
    for c in classes:
        # "5-A" -> class_name=5, section=A
        if "-" in c:
            cn, sec = c.split("-", 1)
        else:
            cn, sec = c, ""
        count = await db.students.count_documents({"class_name": cn, "section": sec})
        result.append({"class": c, "class_name": cn, "section": sec, "student_count": count})
    return {"subject": (profile or {}).get("subject", ""), "classes": result}


@router.get("/students")
async def students_in_class(class_name: str, section: str, _=Depends(require_roles("teacher"))):
    db = get_db()
    return await db.students.find({"class_name": class_name, "section": section}, {"_id": 0}).to_list(500)


# ------------- Teacher-side Student CRUD (per user request) -------------
async def _ensure_parent_user(db, parent_email: str | None, parent_name: str | None, child_name: str | None):
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


@router.post("/students/create")
async def teacher_create_student(req: StudentCreate, current=Depends(require_roles("teacher"))):
    db = get_db()
    profile = await db.teacher_profiles.find_one({"email": current["email"]}, {"_id": 0})
    classes = (profile or {}).get("classes", [])
    target = f"{req.class_name}-{req.section}"
    if classes and target not in classes:
        raise HTTPException(status_code=403, detail=f"You can only add students to your assigned classes: {', '.join(classes)}")
    student = {"id": str(uuid.uuid4()), **req.model_dump(), "created_at": _now_iso()}
    await db.students.insert_one(student.copy())
    student.pop("_id", None)
    await _ensure_parent_user(db, req.parent_email, req.parent_name, req.name)
    return student


@router.put("/students/{student_id}")
async def teacher_update_student(student_id: str, req: StudentUpdate, current=Depends(require_roles("teacher"))):
    db = get_db()
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    profile = await db.teacher_profiles.find_one({"email": current["email"]}, {"_id": 0})
    classes = (profile or {}).get("classes", [])
    if classes and f"{student['class_name']}-{student['section']}" not in classes:
        raise HTTPException(status_code=403, detail="Student not in your assigned classes")
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if updates:
        await db.students.update_one({"id": student_id}, {"$set": updates})
    if req.parent_email:
        await _ensure_parent_user(db, req.parent_email, req.parent_name, student.get("name"))
    return {"message": "Updated"}


@router.delete("/students/{student_id}")
async def teacher_delete_student(student_id: str, current=Depends(require_roles("teacher"))):
    db = get_db()
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    profile = await db.teacher_profiles.find_one({"email": current["email"]}, {"_id": 0})
    classes = (profile or {}).get("classes", [])
    if classes and f"{student['class_name']}-{student['section']}" not in classes:
        raise HTTPException(status_code=403, detail="Student not in your assigned classes")
    await db.students.delete_one({"id": student_id})
    return {"message": "Deleted"}


@router.post("/attendance")
async def mark_attendance(req: MarkAttendanceRequest, current=Depends(require_roles("teacher"))):
    db = get_db()
    # Delete any existing records for the date/class/section
    await db.attendance.delete_many({
        "date": req.date,
        "class_name": req.class_name,
        "section": req.section,
    })
    docs = []
    for r in req.records:
        docs.append({
            "id": str(uuid.uuid4()),
            "student_id": r.student_id,
            "class_name": req.class_name,
            "section": req.section,
            "date": req.date,
            "status": r.status,
            "marked_by": current["email"],
            "created_at": _now_iso(),
        })
    if docs:
        await db.attendance.insert_many(docs)
    return {"message": f"Attendance marked for {len(docs)} students", "count": len(docs)}


@router.get("/attendance")
async def get_attendance(class_name: str, section: str, date: str, _=Depends(require_roles("teacher"))):
    db = get_db()
    return await db.attendance.find(
        {"class_name": class_name, "section": section, "date": date}, {"_id": 0}
    ).to_list(500)


# ------- Homework -------
@router.post("/homework")
async def create_homework(req: HomeworkCreate, current=Depends(require_roles("teacher"))):
    db = get_db()
    doc = {"id": str(uuid.uuid4()), **req.model_dump(), "assigned_by": current["email"], "created_at": _now_iso()}
    await db.homework.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@router.get("/homework")
async def list_homework(current=Depends(require_roles("teacher"))):
    db = get_db()
    return await db.homework.find({"assigned_by": current["email"]}, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.delete("/homework/{hw_id}")
async def delete_homework(hw_id: str, current=Depends(require_roles("teacher"))):
    db = get_db()
    res = await db.homework.delete_one({"id": hw_id, "assigned_by": current["email"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Homework not found")
    return {"message": "Deleted"}


# ------- Notes -------
@router.post("/notes")
async def create_note(req: NoteCreate, current=Depends(require_roles("teacher"))):
    db = get_db()
    doc = {"id": str(uuid.uuid4()), **req.model_dump(), "uploaded_by": current["email"], "created_at": _now_iso()}
    await db.notes.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@router.get("/notes")
async def list_notes(current=Depends(require_roles("teacher"))):
    db = get_db()
    return await db.notes.find({"uploaded_by": current["email"]}, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.delete("/notes/{note_id}")
async def delete_note(note_id: str, current=Depends(require_roles("teacher"))):
    db = get_db()
    res = await db.notes.delete_one({"id": note_id, "uploaded_by": current["email"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Deleted"}


# ------- Performance -------
@router.post("/performance")
async def add_performance(req: PerformanceCreate, current=Depends(require_roles("teacher"))):
    db = get_db()
    doc = {"id": str(uuid.uuid4()), **req.model_dump(), "added_by": current["email"], "date": _now_iso()}
    await db.performance.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@router.get("/performance/{student_id}")
async def student_performance(student_id: str, _=Depends(require_roles("teacher"))):
    db = get_db()
    return await db.performance.find({"student_id": student_id}, {"_id": 0}).sort("date", -1).to_list(500)
