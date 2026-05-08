# School Connect — Product Requirements

## Original Problem Statement
Build a complete full-stack web application called "School Connect" — a role-based school management system with three dashboards (Admin, Teacher, Parent). Secure login with JWT, OTP email verification, forgot-password flow, full CRUD for students/teachers/attendance/homework/announcements/events/lost-and-found/performance, analytics charts on the Admin dashboard, sidebar navigation, responsive layout.

## Tech Stack
- Backend: FastAPI + Motor (async MongoDB)
- Frontend: React + Tailwind + shadcn + recharts
- Auth: JWT Bearer (localStorage), bcrypt password hashing
- Email: **Resend** (real emails for forgot-password OTP + Lost & Found notifications)
- Object storage: Emergent Object Storage (Lost & Found item photos)

## User Personas
- **Admin / Principal** — manages teachers, students, school analytics, announcements, events
- **Teacher** — manages assigned classes, marks attendance, adds students, assigns homework, uploads notes, posts announcements
- **Parent** — views child's attendance/homework/timetable/results, school announcements, lost & found

## Architecture
```
/app/backend
  server.py            FastAPI entry, /api prefix, CORS, startup seed + storage init
  database.py          Motor client
  auth_utils.py        bcrypt, JWT, get_current_user, require_roles dep
  models.py            Pydantic request/response models (LostFoundCreate.image_path)
  email_service.py     Resend async wrapper + OTP/lost-found email templates
  storage_service.py   Emergent object storage helpers (init/put/get)
  seed.py              Idempotent seed (demo accounts always restored — name + password)
  routes/
    auth.py            register (teacher/parent only), verify-otp, login, forgot/reset (real email)
    admin.py           teachers CRUD, students CRUD, analytics, attendance-report
    teacher.py         my-classes, students CRUD (own classes only), attendance, homework, notes, performance
    parent.py          children, child attendance/homework/results/timetable/notes
    shared.py          announcements, events, lost-found (with image + email-on-status), profile
    files.py           POST /upload (multipart image), GET /{path} (Bearer or ?auth= query)

/app/frontend/src
  api.js               axios instance w/ Authorization interceptor
  context/AuthContext.jsx
  components/
    Sidebar             role-based menu (teacher now has Students item)
    DashboardLayout, ProtectedRoute, StatCard, EmptyState, PageHeader
    AuthImage           authenticated <img> via blob fetch
  pages/
    Login (signup link removed) / VerifyOtp / ForgotPassword (no debug OTP)
    admin/AdminDashboard, TeacherManagement, StudentManagement, AttendanceReports, Events
    teacher/TeacherDashboard, TeacherClasses, TeacherStudents, MarkAttendance, TeacherCrud
    parent/ParentDashboard, ParentPages
    Announcements, LostAndFound (image upload + claim/resolve), Profile
```

## Seed Accounts (idempotent — name + password restored on every restart)
| Role    | Email                 | Password    |
|---------|-----------------------|-------------|
| Admin   | admin@school.com      | admin123    |
| Teacher | teacher@school.com    | teacher123  |
| Parent  | parent@school.com     | parent123   |

Parent is linked to child "Alex Doe" (Class 5-A, roll 5A-01).

## What's Been Implemented (as of Feb 2026)

### Iteration 1 (initial MVP)
- ✅ JWT auth (bcrypt), register → mocked OTP → verify → login, forgot/reset
- ✅ Role-based route guards (frontend `ProtectedRoute` + backend `require_roles`)
- ✅ Public signup restricted to teacher/parent
- ✅ Admin Dashboard with 4 stat cards + 3 recharts
- ✅ Admin teachers/students CRUD, attendance reports
- ✅ Teacher dashboard, classes, mark-attendance UI, homework + notes CRUD, performance
- ✅ Parent dashboard with child switcher; attendance/homework/timetable/results pages
- ✅ Announcements (audience-filtered), events, lost & found, profile
- ✅ Idempotent seed: 3 demo accounts, 13 students, 5 teachers, 14 days attendance
- ✅ Design per design_guidelines.json (Chivo + Work Sans, terracotta + pine-green)

### Iteration 2 (this turn)
- ✅ **Real Resend emails** for forgot-password OTP and lost-found notifications (via `re_MqPzz...` API key)
- ✅ Sandbox redirect (`onboarding@resend.dev` only delivers to `narasimha.palegar.07@gmail.com`) auto-handled by `_sandbox_to()`
- ✅ HTML email templates (Chivo-styled) for signup OTP, password reset OTP, lost-found claimed/resolved
- ✅ **Removed "Create an account"** link from Login + entire `/signup` route
- ✅ **Teacher can now create/edit/delete students** in their own assigned classes (403 for unassigned classes)
- ✅ New `/teacher/students` page with class-tab switcher and add-student modal
- ✅ **Lost & Found image upload** via Emergent Object Storage (5 MB cap, JPEG/PNG/WebP/GIF)
- ✅ `AuthImage` component fetches images as authenticated blobs
- ✅ **Email reporter on status change** to `claimed` or `resolved` (state-transition guard prevents duplicate sends)
- ✅ Demo-account passwords now also seed-idempotent — reset-password tests cannot lock out demo logins
- ✅ **47/47 backend tests passing** (32 regression + 15 new for email/storage/teacher-students/lost-found-image)

## Key Endpoints (added in iter 2)

```
POST   /api/files/upload                multipart, JWT-protected
GET    /api/files/{path}                Bearer or ?auth= for <img>
POST   /api/teacher/students/create     teacher creates in assigned class
PUT    /api/teacher/students/{id}       teacher edits in assigned class
DELETE /api/teacher/students/{id}       teacher removes in assigned class
PUT    /api/lost-found/{id}             status update + email-on-claim/resolve
```

## Email Behaviour

- **Signup OTP** — sent on `POST /auth/register` and `POST /auth/resend-otp`. (Public signup is currently unlinked from UI per user request, so this rarely fires.)
- **Password reset OTP** — sent on `POST /auth/forgot-password`. Real email; no `otp_debug` returned.
- **Lost & Found notification** — sent when admin/teacher transitions a report from `open` → `claimed` or `open` → `resolved`. Includes item name, description, last-seen location, and pickup location ("School Front Office").

In Resend sandbox (sender `onboarding@resend.dev`), all messages are auto-redirected to `RESEND_OWNER_EMAIL` (`narasimha.palegar.07@gmail.com`). To send to real recipients, verify a domain at resend.com/domains and update `SENDER_EMAIL` in `.env`.

## Roadmap

### P1
- Verify a real domain in Resend so emails reach actual recipients (currently only the owner sees them)
- Brute-force lockout on `/api/auth/login` (5 fails → 15 min cool-down)
- Admin "reset password" button for teachers/parents
- Forward-only state-transition guard on Lost & Found status (resolved → claimed should be blocked)

### P2
- httpOnly cookie JWT instead of localStorage
- File attachments on Homework + Announcements (using same storage_service)
- Notification bell with unread count
- Stream-and-abort large upload pre-check (currently buffers to memory before size check)

### P3
- Multi-school tenancy
- Fee management module
- Transport / bus tracking
- SMS fallback when email bounces

## Known Trade-offs / Mocks
- **Resend sandbox mode** — only delivers to RESEND_OWNER_EMAIL until a domain is verified
- **JWT in localStorage** — XSS-exposed; documented P2
- **Lost-found pickup location** is a hardcoded "School Front Office" in the email — could be customised per item later

## Next Action Items
1. Verify your school domain at resend.com/domains and update `SENDER_EMAIL` so parents/teachers receive emails directly
2. Optional: send signup welcome emails when admin creates a teacher / a parent account
3. Add forward-only Lost & Found state-machine guard
