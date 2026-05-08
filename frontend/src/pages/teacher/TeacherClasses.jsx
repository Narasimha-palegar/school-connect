import { useEffect, useState } from "react";
import DashboardLayout, { PageHeader, EmptyState } from "@/components/DashboardLayout";
import api from "@/api";

export default function TeacherClasses() {
    const [data, setData] = useState(null);
    const [students, setStudents] = useState([]);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        api.get("/teacher/my-classes").then((r) => setData(r.data));
    }, []);

    useEffect(() => {
        if (!selected) return;
        api.get("/teacher/students", { params: selected }).then((r) => setStudents(r.data));
    }, [selected]);

    return (
        <DashboardLayout>
            <PageHeader title="My Classes" subtitle={data?.subject ? `Subject: ${data.subject}` : "Your assigned classes."} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8" data-testid="classes-grid">
                {(data?.classes || []).map((c) => {
                    const active = selected && selected.class_name === c.class_name && selected.section === c.section;
                    return (
                        <button key={c.class} onClick={() => setSelected({ class_name: c.class_name, section: c.section })}
                            data-testid={`class-tile-${c.class}`}
                            className={`p-5 rounded-xl border-2 text-left transition-all ${active ? "border-[#DF5C3D] bg-white shadow-md" : "border-hair bg-white hover:border-ink"}`}>
                            <div className="font-display font-bold text-2xl text-ink">Class {c.class}</div>
                            <div className="text-sm text-ink-muted mt-1">{c.student_count} students</div>
                        </button>
                    );
                })}
            </div>

            {!selected ? (
                <EmptyState title="Select a class to view students" />
            ) : (
                <div className="bg-white border border-hair rounded-xl overflow-hidden">
                    <table className="w-full" data-testid="students-list-table">
                        <thead>
                            <tr className="bg-[#F7F6F3] text-left text-sm text-ink-muted">
                                <th className="py-3 px-4 font-semibold">Roll</th>
                                <th className="py-3 px-4 font-semibold">Name</th>
                                <th className="py-3 px-4 font-semibold">Gender</th>
                                <th className="py-3 px-4 font-semibold">Parent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((s) => (
                                <tr key={s.id} className="border-t border-hair">
                                    <td className="py-3 px-4 font-mono text-sm">{s.roll_no}</td>
                                    <td className="py-3 px-4 font-medium">{s.name}</td>
                                    <td className="py-3 px-4">{s.gender}</td>
                                    <td className="py-3 px-4 text-sm text-ink-muted">{s.parent_email || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </DashboardLayout>
    );
}
