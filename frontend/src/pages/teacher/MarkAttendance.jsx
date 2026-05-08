import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout, { PageHeader, EmptyState } from "@/components/DashboardLayout";
import api, { formatApiError } from "@/api";
import { toast } from "sonner";

export default function MarkAttendance() {
    const [params] = useSearchParams();
    const [classes, setClasses] = useState([]);
    const [selected, setSelected] = useState({ class_name: params.get("class") || "", section: params.get("section") || "" });
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [students, setStudents] = useState([]);
    const [statuses, setStatuses] = useState({}); // student_id -> status

    useEffect(() => {
        api.get("/teacher/my-classes").then((r) => setClasses(r.data.classes));
    }, []);

    useEffect(() => {
        if (!selected.class_name || !selected.section) return;
        api.get("/teacher/students", { params: selected }).then((r) => {
            setStudents(r.data);
            setStatuses(Object.fromEntries(r.data.map((s) => [s.id, "present"])));
        });
        api.get("/teacher/attendance", { params: { ...selected, date } }).then((r) => {
            if (r.data.length > 0) {
                setStatuses((prev) => {
                    const m = { ...prev };
                    r.data.forEach((a) => { m[a.student_id] = a.status; });
                    return m;
                });
            }
        });
    }, [selected, date]);

    const save = async () => {
        try {
            const records = Object.entries(statuses).map(([student_id, status]) => ({ student_id, status }));
            await api.post("/teacher/attendance", { ...selected, date, records });
            toast.success("Attendance saved");
        } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    };

    const setStatus = (id, s) => setStatuses({ ...statuses, [id]: s });

    return (
        <DashboardLayout>
            <PageHeader title="Mark Attendance" subtitle="Select class and date, then mark each student." />

            <div className="flex flex-col sm:flex-row gap-3 mb-6" data-testid="attendance-controls">
                <select value={`${selected.class_name}-${selected.section}`} onChange={(e) => {
                    const [cn, sec] = e.target.value.split("-");
                    setSelected({ class_name: cn || "", section: sec || "" });
                }} className="h-11 bg-white border border-hair rounded-lg px-4 outline-none focus:border-[#DF5C3D]" data-testid="att-class-select">
                    <option value="-">Select class</option>
                    {classes.map((c) => <option key={c.class} value={c.class}>Class {c.class}</option>)}
                </select>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 bg-white border border-hair rounded-lg px-4 outline-none focus:border-[#DF5C3D]" data-testid="att-date-input" />
                <button onClick={save} disabled={students.length === 0} data-testid="att-save-button" className="h-11 px-6 rounded-lg bg-[#DF5C3D] hover:bg-[#C74B2F] text-white font-medium disabled:opacity-60 ml-auto">Save attendance</button>
            </div>

            {students.length === 0 ? (
                <EmptyState title="Select a class to begin" />
            ) : (
                <div className="bg-white border border-hair rounded-xl overflow-hidden">
                    <table className="w-full" data-testid="attendance-mark-table">
                        <thead>
                            <tr className="bg-[#F7F6F3] text-left text-sm text-ink-muted">
                                <th className="py-3 px-4 font-semibold">Roll</th>
                                <th className="py-3 px-4 font-semibold">Student</th>
                                <th className="py-3 px-4 font-semibold text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((s) => (
                                <tr key={s.id} className="border-t border-hair" data-testid={`att-row-${s.id}`}>
                                    <td className="py-3 px-4 font-mono text-sm text-ink-muted">{s.roll_no}</td>
                                    <td className="py-3 px-4 font-medium text-ink">{s.name}</td>
                                    <td className="py-3 px-4">
                                        <div className="flex gap-2 justify-end">
                                            {["present", "absent", "late"].map((opt) => {
                                                const active = statuses[s.id] === opt;
                                                const color = opt === "present" ? "bg-[#2E7D32] text-white" : opt === "absent" ? "bg-[#D32F2F] text-white" : "bg-[#ED6C02] text-white";
                                                return (
                                                    <button key={opt} onClick={() => setStatus(s.id, opt)}
                                                        data-testid={`att-${s.id}-${opt}`}
                                                        className={`px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider transition-all ${active ? color : "bg-[#F7F6F3] text-ink-muted hover:bg-[#E5E4E0]"}`}>
                                                        {opt}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </DashboardLayout>
    );
}
