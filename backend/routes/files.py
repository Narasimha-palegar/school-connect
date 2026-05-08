"""File upload + download endpoints (Emergent object storage)."""
import os
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Header, Query, Response
from auth_utils import get_current_user, decode_token
from database import get_db
from storage_service import put_object, get_object, APP_NAME

logger = logging.getLogger("school_connect.files")

router = APIRouter(prefix="/files", tags=["files"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
EXT_BY_TYPE = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}
MAX_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post("/upload")
async def upload(file: UploadFile = File(...), current=Depends(get_current_user)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG/PNG/WebP/GIF images allowed")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 5 MB)")
    ext = EXT_BY_TYPE.get(file.content_type, "bin")
    path = f"{APP_NAME}/uploads/{current['id']}/{uuid.uuid4()}.{ext}"
    try:
        result = await asyncio.to_thread(put_object, path, data, file.content_type)
    except Exception as e:  # noqa: BLE001
        logger.exception("upload failed: %s", e)
        raise HTTPException(status_code=500, detail="Upload failed")

    db = get_db()
    record = {
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "uploaded_by": current["email"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.files.insert_one(record.copy())
    return {"path": result["path"], "size": record["size"]}


@router.get("/{path:path}")
async def download(
    path: str,
    authorization: str | None = Header(None),
    auth: str | None = Query(None),
):
    # Allow Authorization: Bearer <token> OR ?auth=<token> (for <img src>)
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif auth:
        token = auth
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_db()
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, ct = await asyncio.to_thread(get_object, path)
    except Exception as e:  # noqa: BLE001
        logger.exception("download failed: %s", e)
        raise HTTPException(status_code=500, detail="Download failed")
    return Response(content=data, media_type=record.get("content_type", ct))
