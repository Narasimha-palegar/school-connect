"""Shared routes: announcements, events, lost-and-found, profile."""
import asyncio
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from models import AnnouncementCreate, EventCreate, LostFoundCreate, LostFoundUpdate, ProfileUpdate
from auth_utils import get_current_user, require_roles
from email_service import send_lost_found_notification
from storage_service import get_object

logger = logging.getLogger("school_connect.shared")

router = APIRouter(tags=["shared"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ------- Announcements -------
@router.get("/announcements")
async def list_announcements(current=Depends(get_current_user)):
    db = get_db()
    role = current["role"]
    # Audience filter
    if role == "admin":
        q = {}
    elif role == "teacher":
        q = {"audience": {"$in": ["all", "teachers"]}}
    else:  # parent
        q = {"audience": {"$in": ["all", "parents", "students"]}}
    return await db.announcements.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)


@router.post("/announcements")
async def create_announcement(req: AnnouncementCreate, current=Depends(require_roles("admin", "teacher"))):
    db = get_db()
    doc = {"id": str(uuid.uuid4()), **req.model_dump(), "created_by": current["email"], "created_at": _now_iso()}
    await db.announcements.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@router.delete("/announcements/{ann_id}")
async def delete_announcement(ann_id: str, current=Depends(require_roles("admin", "teacher"))):
    db = get_db()
    q = {"id": ann_id}
    if current["role"] != "admin":
        q["created_by"] = current["email"]
    res = await db.announcements.delete_one(q)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return {"message": "Deleted"}


# ------- Events -------
@router.get("/events")
async def list_events(_=Depends(get_current_user)):
    db = get_db()
    return await db.events.find({}, {"_id": 0}).sort("date", 1).to_list(200)


@router.post("/events")
async def create_event(req: EventCreate, current=Depends(require_roles("admin"))):
    db = get_db()
    doc = {"id": str(uuid.uuid4()), **req.model_dump(), "created_by": current["email"], "created_at": _now_iso()}
    await db.events.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@router.delete("/events/{ev_id}")
async def delete_event(ev_id: str, _=Depends(require_roles("admin"))):
    db = get_db()
    res = await db.events.delete_one({"id": ev_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Deleted"}


# ------- Lost & Found -------
@router.get("/lost-found")
async def list_lost_found(_=Depends(get_current_user)):
    db = get_db()
    return await db.lost_found.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


@router.post("/lost-found")
async def create_lost_found(req: LostFoundCreate, current=Depends(get_current_user)):
    db = get_db()
    doc = {
        "id": str(uuid.uuid4()),
        **req.model_dump(),
        "status": "open",
        "reported_by": current["email"],
        "reported_by_name": current.get("name", ""),
        "created_at": _now_iso(),
    }
    await db.lost_found.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@router.put("/lost-found/{item_id}")
async def update_lost_found(item_id: str, req: LostFoundUpdate, current=Depends(get_current_user)):
    db = get_db()
    item = await db.lost_found.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    # Only admin or teacher can update someone else's report; reporter can also update their own
    if (
        current["role"] not in ("admin", "teacher")
        and item.get("reported_by") != current["email"]
    ):
        raise HTTPException(status_code=403, detail="Not allowed")
    prev_status = item.get("status", "open")
    await db.lost_found.update_one({"id": item_id}, {"$set": {"status": req.status}})

    # Notify the original reporter when their item is claimed/resolved (state transition only)
    if req.status in ("claimed", "resolved") and prev_status != req.status:
        reporter_email = item.get("reported_by")
        reporter = await db.users.find_one({"email": reporter_email}, {"_id": 0}) if reporter_email else None
        reporter_name = (reporter or {}).get("name") or item.get("reported_by_name") or "there"

        # Try to load the uploaded image for inline embedding (best-effort; never blocks response)
        image_bytes, image_mime = None, "image/jpeg"
        image_path = item.get("image_path")
        if image_path:
            try:
                file_doc = await db.files.find_one({"storage_path": image_path, "is_deleted": False}, {"_id": 0})
                image_bytes, image_mime = await asyncio.to_thread(get_object, image_path)
                if file_doc and file_doc.get("content_type"):
                    image_mime = file_doc["content_type"]
            except Exception as e:  # noqa: BLE001
                logger.warning("Could not fetch image for lost-found email: %s", e)

        if reporter_email:
            await send_lost_found_notification(
                email=reporter_email,
                reporter_name=reporter_name,
                item_name=item.get("item_name", ""),
                description=item.get("description", ""),
                location=item.get("location", ""),
                status=req.status,
                resolver_name=current.get("name", ""),
                resolver_email=current.get("email", ""),
                image_bytes=image_bytes,
                image_mime=image_mime,
            )
    return {"message": "Updated"}


@router.delete("/lost-found/{item_id}")
async def delete_lost_found(item_id: str, current=Depends(get_current_user)):
    db = get_db()
    item = await db.lost_found.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if current["role"] != "admin" and item.get("reported_by") != current["email"]:
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.lost_found.delete_one({"id": item_id})
    return {"message": "Deleted"}


# ------- Profile -------
@router.put("/profile")
async def update_profile(req: ProfileUpdate, current=Depends(get_current_user)):
    db = get_db()
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"id": current["id"]}, {"$set": updates})
    user = await db.users.find_one({"id": current["id"]}, {"_id": 0, "password_hash": 0})
    return user
