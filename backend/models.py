"""Pydantic request/response models."""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, timezone
import uuid


def _uuid() -> str:
    return str(uuid.uuid4())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# --- Auth (passwordless OTP login) ---
class LoginOtpRequest(BaseModel):
    email: EmailStr


class LoginVerifyRequest(BaseModel):
    email: EmailStr
    otp: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    created_at: Optional[str] = None


class AuthResponse(BaseModel):
    token: str
    user: UserOut


# --- Admin: Teachers (no password — they log in with OTP) ---
class TeacherCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: Optional[str] = None
    classes: List[str] = []


class TeacherUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    subject: Optional[str] = None
    classes: Optional[List[str]] = None


# --- Admin: Students ---
class StudentCreate(BaseModel):
    name: str
    roll_no: str
    class_name: str
    section: str
    parent_email: Optional[EmailStr] = None
    parent_name: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    roll_no: Optional[str] = None
    class_name: Optional[str] = None
    section: Optional[str] = None
    parent_email: Optional[EmailStr] = None
    parent_name: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None


# --- Attendance ---
class AttendanceRecord(BaseModel):
    student_id: str
    status: Literal["present", "absent", "late"]


class MarkAttendanceRequest(BaseModel):
    class_name: str
    section: str
    date: str
    records: List[AttendanceRecord]


# --- Homework ---
class HomeworkCreate(BaseModel):
    class_name: str
    section: str
    subject: str
    title: str
    description: str
    due_date: str


# --- Notes ---
class NoteCreate(BaseModel):
    class_name: str
    section: str
    subject: str
    title: str
    content: str


# --- Announcements ---
class AnnouncementCreate(BaseModel):
    title: str
    content: str
    audience: Literal["all", "teachers", "parents", "students"] = "all"


# --- Events ---
class EventCreate(BaseModel):
    title: str
    description: str
    date: str
    location: Optional[str] = None


# --- Lost & Found ---
class LostFoundCreate(BaseModel):
    item_name: str
    description: str
    location: str
    type: Literal["lost", "found"] = "lost"
    image_path: Optional[str] = None


class LostFoundUpdate(BaseModel):
    status: Literal["open", "claimed", "resolved"]


# --- Performance ---
class PerformanceCreate(BaseModel):
    student_id: str
    subject: str
    test_name: str
    score: float
    max_score: float
    remarks: Optional[str] = None


# --- Profile ---
class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
