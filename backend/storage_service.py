"""Emergent object storage helpers (sync HTTP API wrapped for FastAPI use).

Contract per playbook:
- init_storage() once at startup, holds a process-wide storage_key
- put_object(path, data, content_type) -> {path,size,etag}
- get_object(path) -> (bytes, content_type)
"""
import os
import logging
import threading
import requests

logger = logging.getLogger("school_connect.storage")

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = os.environ.get("APP_NAME", "school-connect")

_storage_key: str | None = None
_lock = threading.Lock()


def _emergent_key() -> str:
    return os.environ["EMERGENT_LLM_KEY"]


def init_storage() -> str | None:
    global _storage_key
    if _storage_key:
        return _storage_key
    with _lock:
        if _storage_key:
            return _storage_key
        try:
            resp = requests.post(
                f"{STORAGE_URL}/init",
                json={"emergent_key": _emergent_key()},
                timeout=30,
            )
            resp.raise_for_status()
            _storage_key = resp.json()["storage_key"]
            logger.info("Object storage initialized")
            return _storage_key
        except Exception as e:  # noqa: BLE001
            logger.exception("Storage init failed: %s", e)
            return None


def _refresh_and_retry(method, *args, **kwargs):
    global _storage_key
    _storage_key = None
    init_storage()
    return method(*args, **kwargs)


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise RuntimeError("Storage not initialized")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if resp.status_code == 403:
        # storage_key expired — re-init once
        global _storage_key
        _storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    if not key:
        raise RuntimeError("Storage not initialized")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    if resp.status_code == 403:
        global _storage_key
        _storage_key = None
        key = init_storage()
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=60,
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
