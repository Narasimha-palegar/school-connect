"""School Connect — FastAPI server entry point."""
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / '.env')

import os  # noqa: E402
import logging  # noqa: E402
from fastapi import FastAPI, APIRouter  # noqa: E402
from starlette.middleware.cors import CORSMiddleware  # noqa: E402

from database import get_db, close_db  # noqa: E402
from routes.auth import router as auth_router  # noqa: E402
from routes.admin import router as admin_router  # noqa: E402
from routes.teacher import router as teacher_router  # noqa: E402
from routes.parent import router as parent_router  # noqa: E402
from routes.shared import router as shared_router  # noqa: E402
from routes.files import router as files_router  # noqa: E402
from seed import run_seed  # noqa: E402
from storage_service import init_storage  # noqa: E402

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("school_connect")

app = FastAPI(title="School Connect API", version="1.0.0")

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"app": "School Connect", "status": "ok"}


@api_router.get("/health")
async def health():
    return {"status": "healthy"}


api_router.include_router(auth_router)
api_router.include_router(admin_router)
api_router.include_router(teacher_router)
api_router.include_router(parent_router)
api_router.include_router(shared_router)
api_router.include_router(files_router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    _ = get_db()
    try:
        await run_seed()
        logger.info("Seed completed")
    except Exception as e:
        logger.exception("Seed failed: %s", e)
    try:
        init_storage()
    except Exception as e:
        logger.exception("Storage init failed (non-fatal): %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    await close_db()
