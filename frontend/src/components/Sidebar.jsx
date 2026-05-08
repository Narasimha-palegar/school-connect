import { NavLink, useNavigate } from "react-router-dom";
import {
    LayoutDashboard, Users, GraduationCap, CalendarCheck, Megaphone,
    FileText, ClipboardList, Search, User, LogOut, School,
    Briefcase, Trophy, CalendarDays,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const MENUS = {
    admin: [
        { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
        { to: "/admin/teachers", icon: Briefcase, label: "Teachers" },
        { to: "/admin/students", icon: GraduationCap, label: "Students" },
        { to: "/admin/attendance", icon: CalendarCheck, label: "Attendance" },
        { to: "/admin/announcements", icon: Megaphone, label: "Announcements" },
        { to: "/admin/events", icon: CalendarDays, label: "Events" },
        { to: "/lost-found", icon: Search, label: "Lost & Found" },
        { to: "/profile", icon: User, label: "Profile" },
    ],
    teacher: [
        { to: "/teacher", icon: LayoutDashboard, label: "Dashboard", end: true },
        { to: "/teacher/classes", icon: Users, label: "My Classes" },
        { to: "/teacher/students", icon: GraduationCap, label: "Students" },
        { to: "/teacher/attendance", icon: CalendarCheck, label: "Attendance" },
        { to: "/teacher/homework", icon: ClipboardList, label: "Homework" },
        { to: "/teacher/notes", icon: FileText, label: "Notes" },
        { to: "/teacher/announcements", icon: Megaphone, label: "Announcements" },
        { to: "/lost-found", icon: Search, label: "Lost & Found" },
        { to: "/profile", icon: User, label: "Profile" },
    ],
    parent: [
        { to: "/parent", icon: LayoutDashboard, label: "Dashboard", end: true },
        { to: "/parent/attendance", icon: CalendarCheck, label: "Attendance" },
        { to: "/parent/homework", icon: ClipboardList, label: "Homework" },
        { to: "/parent/timetable", icon: CalendarDays, label: "Timetable" },
        { to: "/parent/results", icon: Trophy, label: "Results" },
        { to: "/announcements", icon: Megaphone, label: "Announcements" },
        { to: "/lost-found", icon: Search, label: "Lost & Found" },
        { to: "/profile", icon: User, label: "Profile" },
    ],
};

export default function Sidebar({ className, onNavigate }) {
    const { user, logout } = useAuth();
    const nav = useNavigate();
    const items = MENUS[user.role] || [];

    const handleLogout = () => {
        logout();
        nav("/login");
    };

    return (
        <aside
            className={cn("bg-sidebar border-r border-hair flex flex-col z-40", className)}
            data-testid="app-sidebar"
        >
            <div className="px-6 py-6 border-b border-hair flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg brand-gradient flex items-center justify-center text-white shadow-sm">
                    <School className="h-5 w-5" />
                </div>
                <div>
                    <div className="font-display font-black text-ink text-lg leading-none">
                        School Connect
                    </div>
                    <div className="text-xs uppercase tracking-widest text-ink-muted mt-1">
                        {user.role}
                    </div>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 space-y-1">
                {items.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={onNavigate}
                        data-testid={`nav-${item.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3 px-4 py-2.5 mx-3 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-white text-[#DF5C3D] shadow-sm border-l-4 border-[#DF5C3D]"
                                    : "text-ink-muted hover:bg-[#E5E4E0] hover:text-ink"
                            )
                        }
                    >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-hair">
                <div className="flex items-center gap-3 mb-3 px-2">
                    <div className="h-9 w-9 rounded-full bg-[#214A39] text-white flex items-center justify-center font-semibold text-sm">
                        {user.name?.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink truncate">{user.name}</div>
                        <div className="text-xs text-ink-muted truncate">{user.email}</div>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    data-testid="logout-button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-muted hover:text-[#DF5C3D] hover:bg-white rounded-lg transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    Sign out
                </button>
            </div>
        </aside>
    );
}
