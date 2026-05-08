import { useEffect, useState } from "react";
import DashboardLayout, { PageHeader, StatCard, EmptyState } from "@/components/DashboardLayout";
import { CalendarCheck, ClipboardList, Trophy, CalendarDays } from "lucide-react";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import PerformanceChart from "@/components/PerformanceChart";
import AttendanceChart from "@/components/AttendanceChart";

export default function ParentDashboard() {
    const { user } = useAuth();
    const [children, setChildren] = useState([]);
    const [selected, setSelected] = useState(null);
    const [attendance, setAttendance] = useState(null);
    const [homework, setHomework] = useState([]);
    const [results, setResults] = useState([]);

    useEffect(() => {
        api.get("/parent/children").then((r) => {
            setChildren(r.data);
            if (r.data.length > 0) setSelected(r.data[0]);
        });
    }, []);

    useEffect(() => {
        if (!selected) return;
        api.get(`/parent/child/${selected.id}/attendance`).then((r) => setAttendance(r.data));
        api.get(`/parent/child/${selected.id}/homework`).then((r) => setHomework(r.data));
        api.get(`/parent/child/${selected.id}/results`).then((r) => setResults(r.data));
    }, [selected]);

    return (
        <DashboardLayout>
            <PageHeader title={`Hi, ${user.name.split(" ")[0]}`} subtitle="Keep track of your child's school life." testid="parent-dashboard-header" />

            {children.length === 0 ? (
                <EmptyState title="No child linked yet"
                    subtitle={`We didn't find any student with parent email ${user.email}. Ask the school admin to link your child.`} />
            ) : (
                <>
                    <div className="flex gap-3 mb-8" data-testid="children-selector">
                        {children.map((c) => (
                            <button key={c.id} onClick={() => setSelected(c)}
                                data-testid={`child-tab-${c.id}`}
                                className={`px-5 py-3 rounded-xl border-2 ${selected?.id === c.id ? "border-[#DF5C3D] bg-white" : "border-hair bg-white hover:border-ink"}`}>
                                <div className="font-display font-bold text-ink">{c.name}</div>
                                <div className="text-xs text-ink-muted">Class {c.class_name}-{c.section}</div>
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard label="Attendance %" value={attendance?.summary.present_pct ?? "—"} icon={CalendarCheck} accent="primary" />
                        <StatCard label="Homework due" value={homework.length} icon={ClipboardList} accent="secondary" />
                        <StatCard label="Test records" value={results.length} icon={Trophy} accent="green" />
                        <StatCard label="Days tracked" value={attendance?.summary.total || 0} icon={CalendarDays} accent="accent" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                        <PerformanceChart results={results} />
                        <AttendanceChart attendance={attendance} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                        <div className="bg-white border border-hair rounded-xl p-6">
                            <h3 className="font-display font-bold text-xl text-ink mb-4">Upcoming homework</h3>
                            {homework.length === 0 ? <p className="text-ink-muted text-sm">Nothing pending.</p> : (
                                <div className="space-y-3">
                                    {homework.slice(0, 5).map((h) => (
                                        <div key={h.id} className="p-4 bg-[#F7F6F3] rounded-lg border-l-4 border-[#DF5C3D]" data-testid={`hw-item-${h.id}`}>
                                            <div className="text-xs text-ink-muted uppercase tracking-widest">{h.subject}</div>
                                            <div className="font-medium text-ink mt-1">{h.title}</div>
                                            <div className="text-xs text-ink-muted mt-1">Due {h.due_date}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <Link to="/parent/homework" className="mt-4 inline-block text-[#DF5C3D] text-sm font-medium hover:underline">View all →</Link>
                        </div>

                        <div className="bg-white border border-hair rounded-xl p-6">
                            <h3 className="font-display font-bold text-xl text-ink mb-4">Recent test results</h3>
                            {results.length === 0 ? <p className="text-ink-muted text-sm">No test records yet.</p> : (
                                <div className="space-y-3">
                                    {results.slice(0, 5).map((r) => (
                                        <div key={r.id} className="flex items-center justify-between p-3 bg-[#F7F6F3] rounded-lg">
                                            <div>
                                                <div className="font-medium text-ink">{r.test_name}</div>
                                                <div className="text-xs text-ink-muted">{r.subject}</div>
                                            </div>
                                            <div className="font-display font-bold text-lg text-[#214A39]">{r.score}/{r.max_score}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </DashboardLayout>
    );
}
