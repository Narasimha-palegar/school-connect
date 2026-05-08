# School Connect

A modern, full-stack school management system built with FastAPI + React + MongoDB. Three role-based dashboards (Admin, Teacher, Parent), JWT authentication, OTP verification, and a clean Chivo/Work Sans design system.

## Quick start

The app is already running under supervisor on this Emergent environment. Simply open the preview URL and sign in with one of the demo accounts below.

| Role    | Email              | Password   |
|---------|--------------------|------------|
| Admin   | admin@school.com   | admin123   |
| Teacher | teacher@school.com | teacher123 |
| Parent  | parent@school.com  | parent123  |

## Architecture

```
/app
├─ backend/
│  ├─ server.py          FastAPI entry, CORS, startup seed
│  ├─ database.py        MongoDB (Motor) client
│  ├─ auth_utils.py      bcrypt, JWT helpers, role dependencies
│  ├─ models.py          Pydantic request/response models
│  ├─ seed.py            Idempotent seed data
│  ├─ routes/
│  │  ├─ auth.py         /api/auth/*
│  │  ├─ admin.py        /api/admin/*
│  │  ├─ teacher.py      /api/teacher/*
│  │  ├─ parent.py       /api/parent/*
│  │  └─ shared.py       /api/announcements, /api/events, /api/lost-found, /api/profile
│  └─ tests/
│     └─ backend_test.py  32-test pytest regression suite
└─ frontend/
   └─ src/
      ├─ api.js           axios with Authorization interceptor
      ├─ context/AuthContext.jsx
      ├─ components/      Sidebar, DashboardLayout, ProtectedRoute, StatCard, EmptyState
      └─ pages/
         ├─ Login / Signup / VerifyOtp / ForgotPassword
         ├─ admin/        AdminDashboard, TeacherManagement, StudentManagement, AttendanceReports, Events
         ├─ teacher/      TeacherDashboard, TeacherClasses, MarkAttendance, TeacherCrud
         ├─ parent/       ParentDashboard, ParentPages (Attendance/Homework/Timetable/Results)
         └─ Announcements, LostAndFound, Profile
```

## API surface (all routes under `/api`)

### Auth
- `POST /auth/register` — teacher/parent signup, returns mocked `otp_debug`
- `POST /auth/verify-otp` — returns `{token, user}` on success
- `POST /auth/resend-otp`
- `POST /auth/login`
- `GET  /auth/me`
- `POST /auth/forgot-password`, `POST /auth/reset-password`

### Admin (role: admin)
- `GET  /admin/analytics` — totals, 7-day attendance trend, class & gender distribution
- `GET/POST/PUT/DELETE /admin/teachers[...]`
- `GET/POST/PUT/DELETE /admin/students[...]`
- `GET  /admin/attendance-report?class_name=&section=`

### Teacher (role: teacher)
- `GET  /teacher/my-classes` — classes assigned with student counts
- `GET  /teacher/students?class_name=&section=`
- `POST /teacher/attendance` — replaces records for date+class
- `GET  /teacher/attendance?class_name=&section=&date=`
- `GET/POST/DELETE /teacher/homework`
- `GET/POST/DELETE /teacher/notes`
- `POST /teacher/performance`, `GET /teacher/performance/{student_id}`

### Parent (role: parent)
- `GET /parent/children`
- `GET /parent/child/{student_id}/{attendance|homework|results|timetable|notes}`

### Shared (any authenticated user)
- `GET/POST/DELETE /announcements` (audience-filtered)
- `GET/POST/DELETE /events` (admin writes)
- `GET/POST/PUT/DELETE /lost-found`
- `PUT /profile`

## Seed data (idempotent)

Runs automatically on backend startup. Demo user names/roles are always restored to .env values on restart, so profile-edit tests can't permanently drift the demo identity.

- 3 demo accounts above + 3 extra teachers (Michael Okafor, Priya Sharma, David Kim)
- 13 students across classes 5-A, 5-B, 6-A
- 14 days of attendance history for 5-A
- 3 homework items, 3 announcements, 2 events, 2 lost-found items
- Weekly timetable for class 5-A, performance records for Alex Doe

## Key design decisions

- **JWT in localStorage** — tradeoff for MVP simplicity vs. httpOnly cookies; P2 roadmap item
- **OTP verification is MOCKED** — backend returns `otp_debug` in response body; frontend shows the code. Swap in Resend/SendGrid once an API key is provided
- **Public signup restricted to teacher/parent** — admins must be created by an existing admin
- **UUID string IDs**, ISO-8601 datetime strings, `_id` always excluded from responses
- **Design**: Chivo (display) + Work Sans (body), terracotta `#DF5C3D` + pine-green `#214A39` palette, 3D illustrations on auth

## Testing

```bash
cd /app/backend && pytest tests/backend_test.py -v
```

Current state: **32/32 backend tests passing**, frontend end-to-end flows verified by testing agent for all 3 roles.

## Environment variables

Backend (`/app/backend/.env`): `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `JWT_SECRET`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `DEMO_TEACHER_*`, `DEMO_PARENT_*`.

Frontend (`/app/frontend/.env`): `REACT_APP_BACKEND_URL` (pre-configured, do not modify).

## Roadmap

- **P1** — Wire real OTP email (Resend/SendGrid key pending), brute-force lockout on login, admin-side password reset for teachers
- **P2** — Move JWT to httpOnly cookie, file uploads (homework attachments, profile picture), in-app notification bell
- **P3** — Multi-school tenancy, fee management, transport tracking
"# school-connect-two" 
