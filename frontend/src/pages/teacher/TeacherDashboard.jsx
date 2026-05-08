import { useEffect, useState } from "react";
import DashboardLayout, { PageHeader, StatCard } from "@/components/DashboardLayout";
import { Users, BookOpen, ClipboardList, CalendarCheck } from "lucide-react";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";

export default function TeacherDashboard() {
    const { user } = useAuth();
    const [classes, setClasses] = useState(null);
    const [homework, setHomework] = useState([]);
    const [notes, setNotes] = useState([]);

    useEffect(() => {
        api.get("/teacher/my-classes").then((r) => setClasses(r.data));
        api.get("/teacher/homework").then((r) => setHomework(r.data));
        api.get("/teacher/notes").then((r) => setNotes(r.data));
    }, []);

    const totalStudents = classes?.classes.reduce((s, c) => s + c.student_count, 0) || 0;

    return (
        <DashboardLayout>
            <PageHeader title={`Hello, ${user.name.split(" ")[0]}`} subtitle={classes?.subject ? `Teaching ${classes.subject}` : ""} testid="teacher-dashboard-header" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Classes" value={classes?.classes.length || 0} icon={BookOpen} accent="primary" />
                <StatCard label="Total Students" value={totalStudents} icon={Users} accent="secondary" />
                <StatCard label="Homework Posted" value={homework.length} icon={ClipboardList} accent="green" />
                <StatCard label="Notes Uploaded" value={notes.length} icon={CalendarCheck} accent="accent" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <div className="bg-white border border-hair rounded-xl p-6">
                    <h3 className="font-display font-bold text-xl text-ink mb-4">Your classes</h3>
                    <div className="space-y-2" data-testid="my-classes-list">
                        {(classes?.classes || []).map((c) => (
                            <Link to={`/teacher/attendance?class=${c.class_name}&section=${c.section}`} key={c.class} className="flex items-center justify-between p-4 rounded-lg bg-[#F7F6F3] hover:bg-[#F0EFEA] transition-colors" data-testid={`class-card-${c.class}`}>
                                <div>
                                    <div className="font-display font-bold text-lg text-ink">Class {c.class}</div>
                                    <div className="text-sm text-ink-muted">{c.student_count} students</div>
                                </div>
                                <div className="text-[#DF5C3D] font-medium">Mark attendance →</div>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="bg-white border border-hair rounded-xl p-6">
                    <h3 className="font-display font-bold text-xl text-ink mb-4">Recent homework</h3>
                    {homework.length === 0 ? (
                        <p className="text-ink-muted text-sm">No homework posted yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {homework.slice(0, 5).map((h) => (
                                <div key={h.id} className="p-3 border-l-4 border-[#DF5C3D] bg-[#F7F6F3] rounded">
                                    <div className="font-medium text-ink">{h.title}</div>
                                    <div className="text-xs text-ink-muted">Class {h.class_name}-{h.section} · Due {h.due_date}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
