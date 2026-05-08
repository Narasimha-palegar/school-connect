import { useEffect, useState } from "react";
import DashboardLayout, { PageHeader, EmptyState } from "@/components/DashboardLayout";
import api from "@/api";

function useChildren() {
    const [children, setChildren] = useState([]);
    const [selected, setSelected] = useState(null);
    useEffect(() => {
        api.get("/parent/children").then((r) => {
            setChildren(r.data);
            if (r.data.length) setSelected(r.data[0]);
        });
    }, []);
    return { children, selected, setSelected };
}

function ChildPicker({ children, selected, setSelected }) {
    if (children.length <= 1) return null;
    return (
        <div className="flex gap-3 mb-6">
            {children.map((c) => (
                <button key={c.id} onClick={() => setSelected(c)}
                    className={`px-4 py-2 rounded-lg border-2 ${selected?.id === c.id ? "border-[#DF5C3D] bg-white" : "border-hair bg-white"}`}>
                    {c.name}
                </button>
            ))}
        </div>
    );
}

export function ParentAttendance() {
    const { children, selected, setSelected } = useChildren();
    const [data, setData] = useState(null);

    useEffect(() => {
        if (!selected) return;
        api.get(`/parent/child/${selected.id}/attendance`).then((r) => setData(r.data));
    }, [selected]);

    return (
        <DashboardLayout>
            <PageHeader title="Attendance" subtitle={selected ? `${selected.name}'s attendance history` : ""} />
            <ChildPicker children={children} selected={selected} setSelected={setSelected} />
            {!data ? <EmptyState title="Loading…" /> : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white border border-hair rounded-xl p-5"><div className="text-xs uppercase tracking-widest text-ink-muted">Total</div><div className="font-display font-black text-3xl text-ink mt-1">{data.summary.total}</div></div>
                        <div className="bg-[#E8F5E9] border border-[#2E7D32]/20 rounded-xl p-5"><div className="text-xs uppercase tracking-widest text-[#2E7D32]">Present</div><div className="font-display font-black text-3xl text-[#2E7D32] mt-1">{data.summary.present}</div></div>
                        <div className="bg-[#FFF3E0] border border-[#ED6C02]/20 rounded-xl p-5"><div className="text-xs uppercase tracking-widest text-[#ED6C02]">Late</div><div className="font-display font-black text-3xl text-[#ED6C02] mt-1">{data.summary.late}</div></div>
                        <div className="bg-[#FFEBEE] border border-[#D32F2F]/20 rounded-xl p-5"><div className="text-xs uppercase tracking-widest text-[#D32F2F]">Absent</div><div className="font-display font-black text-3xl text-[#D32F2F] mt-1">{data.summary.absent}</div></div>
                    </div>
                    <div className="bg-white border border-hair rounded-xl overflow-hidden">
                        <table className="w-full" data-testid="parent-attendance-table">
                            <thead><tr className="bg-[#F7F6F3] text-left text-sm text-ink-muted"><th className="py-3 px-4 font-semibold">Date</th><th className="py-3 px-4 font-semibold">Status</th></tr></thead>
                            <tbody>
                                {data.records.slice(0, 60).map((r) => (
                                    <tr key={r.id} className="border-t border-hair">
                                        <td className="py-3 px-4 font-mono text-sm">{r.date}</td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${r.status === "present" ? "bg-[#E8F5E9] text-[#2E7D32]" : r.status === "late" ? "bg-[#FFF3E0] text-[#ED6C02]" : "bg-[#FFEBEE] text-[#D32F2F]"}`}>{r.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </DashboardLayout>
    );
}

export function ParentHomework() {
    const { children, selected, setSelected } = useChildren();
    const [items, setItems] = useState([]);
    useEffect(() => { if (selected) api.get(`/parent/child/${selected.id}/homework`).then((r) => setItems(r.data)); }, [selected]);
    return (
        <DashboardLayout>
            <PageHeader title="Homework" subtitle={selected ? `For ${selected.name}` : ""} />
            <ChildPicker children={children} selected={selected} setSelected={setSelected} />
            {items.length === 0 ? <EmptyState title="No homework assigned" /> : (
                <div className="space-y-4" data-testid="parent-homework-list">
                    {items.map((h) => (
                        <div key={h.id} className="bg-white border border-hair rounded-xl p-6" data-testid={`parent-hw-${h.id}`}>
                            <div className="text-xs uppercase tracking-widest text-[#DF5C3D] font-semibold">{h.subject}</div>
                            <h3 className="font-display font-bold text-xl text-ink mt-1">{h.title}</h3>
                            <p className="text-ink-muted mt-2">{h.description}</p>
                            <div className="text-xs text-ink-muted mt-3">Due {h.due_date}</div>
                        </div>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}

export function ParentTimetable() {
    const { children, selected, setSelected } = useChildren();
    const [items, setItems] = useState([]);
    useEffect(() => { if (selected) api.get(`/parent/child/${selected.id}/timetable`).then((r) => setItems(r.data)); }, [selected]);
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const grid = {};
    items.forEach((it) => {
        grid[it.day] = grid[it.day] || {};
        grid[it.day][it.period] = it;
    });
    const maxP = Math.max(6, ...items.map((i) => i.period || 0));
    return (
        <DashboardLayout>
            <PageHeader title="Timetable" subtitle={selected ? `${selected.name} — Class ${selected.class_name}-${selected.section}` : ""} />
            <ChildPicker children={children} selected={selected} setSelected={setSelected} />
            {items.length === 0 ? <EmptyState title="No timetable available" /> : (
                <div className="bg-white border border-hair rounded-xl overflow-auto">
                    <table className="w-full min-w-[720px]" data-testid="parent-timetable">
                        <thead>
                            <tr className="bg-[#F7F6F3] text-left text-sm text-ink-muted">
                                <th className="py-3 px-4 font-semibold">Day</th>
                                {Array.from({ length: maxP }, (_, i) => <th key={i} className="py-3 px-4 font-semibold">P{i + 1}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {days.map((day) => (
                                <tr key={day} className="border-t border-hair">
                                    <td className="py-3 px-4 font-medium">{day}</td>
                                    {Array.from({ length: maxP }, (_, i) => {
                                        const cell = grid[day]?.[i + 1];
                                        return <td key={i} className="py-3 px-4 text-sm">{cell ? cell.subject : "—"}</td>;
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </DashboardLayout>
    );
}

export function ParentResults() {
    const { children, selected, setSelected } = useChildren();
    const [items, setItems] = useState([]);
    useEffect(() => { if (selected) api.get(`/parent/child/${selected.id}/results`).then((r) => setItems(r.data)); }, [selected]);
    return (
        <DashboardLayout>
            <PageHeader title="Test Results" subtitle={selected ? `${selected.name}'s academic performance` : ""} />
            <ChildPicker children={children} selected={selected} setSelected={setSelected} />
            {items.length === 0 ? <EmptyState title="No results yet" /> : (
                <div className="bg-white border border-hair rounded-xl overflow-hidden">
                    <table className="w-full" data-testid="parent-results-table">
                        <thead><tr className="bg-[#F7F6F3] text-left text-sm text-ink-muted"><th className="py-3 px-4 font-semibold">Subject</th><th className="py-3 px-4 font-semibold">Test</th><th className="py-3 px-4 font-semibold">Score</th><th className="py-3 px-4 font-semibold">Remarks</th></tr></thead>
                        <tbody>
                            {items.map((r) => (
                                <tr key={r.id} className="border-t border-hair">
                                    <td className="py-3 px-4">{r.subject}</td>
                                    <td className="py-3 px-4 font-medium">{r.test_name}</td>
                                    <td className="py-3 px-4 font-display font-bold text-[#214A39]">{r.score}/{r.max_score}</td>
                                    <td className="py-3 px-4 text-sm text-ink-muted">{r.remarks || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </DashboardLayout>
    );
}
