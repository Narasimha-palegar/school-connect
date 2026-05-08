"""Auth routes: passwordless OTP login.

Flow:
  POST /auth/login-request   { email }            -> sends OTP email, returns {message}
  POST /auth/login-verify    { email, otp }       -> returns {token, user}
  GET  /auth/me                                   -> current user
"""
import random
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from models import LoginOtpRequest, LoginVerifyRequest, UserOut
from auth_utils import create_access_token, get_current_user
from email_service import send_login_otp

router = APIRouter(prefix="/auth", tags=["auth"])

OTP_TTL_MIN = 10


def _now():
    return datetime.now(timezone.utc)


def _gen_otp() -> str:
    return f"{random.randint(100000, 999999)}"


async def _create_otp(email: str, purpose: str) -> str:
    db = get_db()
    code = _gen_otp()
    await db.otp_codes.insert_one({
        "id": str(uuid.uuid4()),
        "email": email,
        "code": code,
        "purpose": purpose,
        "expires_at": (_now() + timedelta(minutes=OTP_TTL_MIN)).isoformat(),
        "used": False,
        "created_at": _now().isoformat(),
    })
    return code


def _user_public(user: dict) -> dict:
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "phone": user.get("phone"),
        "created_at": user.get("created_at"),
    }


@router.post("/login-request")
async def login_request(req: LoginOtpRequest):
    db = get_db()
    email = req.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise HTTPException(
            status_code=404,
            detail="No account found for this email. Please ask your school admin to add you.",
        )
    otp = await _create_otp(email, "login")
    await send_login_otp(email, user.get("name", ""), otp, role=user.get("role", ""))
    return {"message": "We've emailed you a 6-digit code. It expires in 10 minutes.", "email": email}


@router.post("/login-verify")
async def login_verify(req: LoginVerifyRequest):
    db = get_db()
    email = req.email.lower()
    rec = await db.otp_codes.find_one(
        {"email": email, "code": req.otp, "used": False, "purpose": "login"},
        {"_id": 0},
        sort=[("created_at", -1)],
    )
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid or already-used OTP")
    if datetime.fromisoformat(rec["expires_at"]) < _now():
        raise HTTPException(status_code=400, detail="OTP expired — please request a new one")
    await db.otp_codes.update_one({"id": rec["id"]}, {"$set": {"used": True}})
    user = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    token = create_access_token(user["id"], user["email"], user["role"])
    return {"token": token, "user": _user_public(user)}


@router.get("/me", response_model=UserOut)
async def me(current_user: dict = Depends(get_current_user)):
    return _user_public(current_user)
