"""Parent routes: child data — attendance, homework, results, timetable."""
from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from auth_utils import require_roles

router = APIRouter(prefix="/parent", tags=["parent"])


async def _get_children(email: str):
    db = get_db()
    return await db.students.find({"parent_email": email}, {"_id": 0}).to_list(50)


@router.get("/children")
async def children(current=Depends(require_roles("parent"))):
    return await _get_children(current["email"])


@router.get("/child/{student_id}/attendance")
async def child_attendance(student_id: str, current=Depends(require_roles("parent"))):
    db = get_db()
    child = await db.students.find_one({"id": student_id, "parent_email": current["email"]}, {"_id": 0})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    records = await db.attendance.find({"student_id": student_id}, {"_id": 0}).sort("date", -1).to_list(365)
    total = len(records)
    present = sum(1 for r in records if r["status"] == "present")
    late = sum(1 for r in records if r["status"] == "late")
    absent = sum(1 for r in records if r["status"] == "absent")
    return {
        "student": child,
        "summary": {
            "total": total,
            "present": present,
            "late": late,
            "absent": absent,
            "present_pct": round(present / total * 100, 1) if total else 0,
        },
        "records": records,
    }


@router.get("/child/{student_id}/homework")
async def child_homework(student_id: str, current=Depends(require_roles("parent"))):
    db = get_db()
    child = await db.students.find_one({"id": student_id, "parent_email": current["email"]}, {"_id": 0})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    return await db.homework.find(
        {"class_name": child["class_name"], "section": child["section"]}, {"_id": 0}
    ).sort("due_date", 1).to_list(200)


@router.get("/child/{student_id}/results")
async def child_results(student_id: str, current=Depends(require_roles("parent"))):
    db = get_db()
    child = await db.students.find_one({"id": student_id, "parent_email": current["email"]}, {"_id": 0})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    return await db.performance.find({"student_id": student_id}, {"_id": 0}).sort("date", -1).to_list(200)


@router.get("/child/{student_id}/timetable")
async def child_timetable(student_id: str, current=Depends(require_roles("parent"))):
    db = get_db()
    child = await db.students.find_one({"id": student_id, "parent_email": current["email"]}, {"_id": 0})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    return await db.timetable.find(
        {"class_name": child["class_name"], "section": child["section"]}, {"_id": 0}
    ).sort([("day", 1), ("period", 1)]).to_list(100)


@router.get("/child/{student_id}/notes")
async def child_notes(student_id: str, current=Depends(require_roles("parent"))):
    db = get_db()
    child = await db.students.find_one({"id": student_id, "parent_email": current["email"]}, {"_id": 0})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    return await db.notes.find(
        {"class_name": child["class_name"], "section": child["section"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
