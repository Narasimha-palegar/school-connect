import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import TeacherManagement from "@/pages/admin/TeacherManagement";
import StudentManagement from "@/pages/admin/StudentManagement";
import AttendanceReports from "@/pages/admin/AttendanceReports";
import Events from "@/pages/admin/Events";
import TeacherDashboard from "@/pages/teacher/TeacherDashboard";
import TeacherClasses from "@/pages/teacher/TeacherClasses";
import TeacherStudents from "@/pages/teacher/TeacherStudents";
import MarkAttendance from "@/pages/teacher/MarkAttendance";
import { TeacherHomework, TeacherNotes } from "@/pages/teacher/TeacherCrud";
import ParentDashboard from "@/pages/parent/ParentDashboard";
import {
    ParentAttendance, ParentHomework, ParentTimetable, ParentResults,
} from "@/pages/parent/ParentPages";
import Announcements from "@/pages/Announcements";
import LostAndFound from "@/pages/LostAndFound";
import Profile from "@/pages/Profile";
import "@/App.css";

function Protected({ roles, children }) {
    return <ProtectedRoute roles={roles}>{children}</ProtectedRoute>;
}

export default function App() {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />

                {/* Admin */}
                <Route path="/admin" element={<Protected roles={["admin"]}><AdminDashboard /></Protected>} />
                <Route path="/admin/teachers" element={<Protected roles={["admin"]}><TeacherManagement /></Protected>} />
                <Route path="/admin/students" element={<Protected roles={["admin"]}><StudentManagement /></Protected>} />
                <Route path="/admin/attendance" element={<Protected roles={["admin"]}><AttendanceReports /></Protected>} />
                <Route path="/admin/announcements" element={<Protected roles={["admin"]}><Announcements /></Protected>} />
                <Route path="/admin/events" element={<Protected roles={["admin"]}><Events /></Protected>} />

                {/* Teacher */}
                <Route path="/teacher" element={<Protected roles={["teacher"]}><TeacherDashboard /></Protected>} />
                <Route path="/teacher/classes" element={<Protected roles={["teacher"]}><TeacherClasses /></Protected>} />
                <Route path="/teacher/students" element={<Protected roles={["teacher"]}><TeacherStudents /></Protected>} />
                <Route path="/teacher/attendance" element={<Protected roles={["teacher"]}><MarkAttendance /></Protected>} />
                <Route path="/teacher/homework" element={<Protected roles={["teacher"]}><TeacherHomework /></Protected>} />
                <Route path="/teacher/notes" element={<Protected roles={["teacher"]}><TeacherNotes /></Protected>} />
                <Route path="/teacher/announcements" element={<Protected roles={["teacher"]}><Announcements /></Protected>} />

                {/* Parent */}
                <Route path="/parent" element={<Protected roles={["parent"]}><ParentDashboard /></Protected>} />
                <Route path="/parent/attendance" element={<Protected roles={["parent"]}><ParentAttendance /></Protected>} />
                <Route path="/parent/homework" element={<Protected roles={["parent"]}><ParentHomework /></Protected>} />
                <Route path="/parent/timetable" element={<Protected roles={["parent"]}><ParentTimetable /></Protected>} />
                <Route path="/parent/results" element={<Protected roles={["parent"]}><ParentResults /></Protected>} />

                {/* Shared */}
                <Route path="/announcements" element={<Protected><Announcements /></Protected>} />
                <Route path="/lost-found" element={<Protected><LostAndFound /></Protected>} />
                <Route path="/profile" element={<Protected><Profile /></Protected>} />

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </AuthProvider>
    );
}
