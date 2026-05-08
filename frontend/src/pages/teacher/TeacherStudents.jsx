import { useCallback, useEffect, useState } from "react";
import DashboardLayout, { PageHeader, EmptyState } from "@/components/DashboardLayout";
import { Plus, Trash2 } from "lucide-react";
import api, { formatApiError } from "@/api";
import { toast } from "sonner";

const empty = { name: "", roll_no: "", class_name: "", section: "", parent_email: "", dob: "", gender: "M" };

export default function TeacherStudents() {
    const [classes, setClasses] = useState([]);
    const [selected, setSelected] = useState(null);
    const [students, setStudents] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(empty);

    useEffect(() => {
        api.get("/teacher/my-classes").then((r) => {
            setClasses(r.data.classes);
            if (r.data.classes.length) setSelected(r.data.classes[0]);
        });
    }, []);

    const load = useCallback(() => {
        if (!selected) return;
        api.get("/teacher/students", { params: { class_name: selected.class_name, section: selected.section } })
            .then((r) => setStudents(r.data));
    }, [selected]);

    useEffect(() => { load(); }, [load]);

    const submit = async (e) => {
        e.preventDefault();
        try {
            await api.post("/teacher/students/create", {
                ...form,
                class_name: selected.class_name,
                section: selected.section,
            });
            toast.success("Student added");
            setOpen(false); setForm(empty); load();
        } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    };

    const remove = async (id) => {
        if (!window.confirm("Remove this student?")) return;
        try { await api.delete(`/teacher/students/${id}`); toast.success("Deleted"); load(); }
        catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    };

    const inputCls = "h-11 w-full bg-white border border-hair rounded-lg px-4 outline-none focus:border-[#DF5C3D]";

    return (
        <DashboardLayout>
            <PageHeader title="Students" subtitle="Add and manage students in your assigned classes."
                action={selected && (
                    <button onClick={() => setOpen(true)} data-testid="teacher-add-student-button"
                        className="inline-flex items-center gap-2 bg-[#DF5C3D] hover:bg-[#C74B2F] text-white rounded-lg px-5 h-11 font-medium shadow-sm">
                        <Plus className="h-4 w-4" /> Add student to {selected.class}
                    </button>
                )} />

            <div className="flex gap-2 mb-6 flex-wrap" data-testid="teacher-students-classes">
                {classes.map((c) => {
                    const active = selected && selected.class === c.class;
                    return (
                        <button key={c.class} onClick={() => setSelected(c)}
                            data-testid={`teacher-class-tab-${c.class}`}
                            className={`px-4 py-2 rounded-lg border-2 ${active ? "border-[#DF5C3D] bg-white shadow-sm" : "border-hair bg-white hover:border-ink"}`}>
                            <span className="font-display font-bold text-ink">Class {c.class}</span>
                            <span className="text-xs text-ink-muted ml-2">({c.student_count})</span>
                        </button>
                    );
                })}
            </div>

            {!selected || students.length === 0 ? (
                <EmptyState title="No students in this class" subtitle={selected ? `Add the first student to Class ${selected.class}.` : "Select a class above."} />
            ) : (
                <div className="bg-white border border-hair rounded-xl overflow-hidden">
                    <table className="w-full" data-testid="teacher-students-table">
                        <thead>
                            <tr className="bg-[#F7F6F3] text-left text-sm text-ink-muted">
                                <th className="py-3 px-4 font-semibold">Roll</th>
                                <th className="py-3 px-4 font-semibold">Name</th>
                                <th className="py-3 px-4 font-semibold">Gender</th>
                                <th className="py-3 px-4 font-semibold">Parent</th>
                                <th className="py-3 px-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((s) => (
                                <tr key={s.id} className="border-t border-hair hover:bg-[#F9F9F8]" data-testid={`teacher-student-row-${s.id}`}>
                                    <td className="py-3 px-4 font-mono text-sm">{s.roll_no}</td>
                                    <td className="py-3 px-4 font-medium">{s.name}</td>
                                    <td className="py-3 px-4">{s.gender}</td>
                                    <td className="py-3 px-4 text-sm text-ink-muted">{s.parent_email || "—"}</td>
                                    <td className="py-3 px-4 text-right">
                                        <button onClick={() => remove(s.id)} className="inline-flex p-2 text-ink-muted hover:text-[#D32F2F]" data-testid={`teacher-delete-student-${s.id}`}>
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {open && selected && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setOpen(false)}>
                    <div className="bg-white rounded-2xl p-8 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-display font-bold text-2xl text-ink mb-1">Add student</h3>
                        <p className="text-sm text-ink-muted mb-4">To Class {selected.class}</p>
                        <form onSubmit={submit} className="space-y-3">
                            <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} data-testid="teacher-student-name-input" />
                            <input required placeholder="Roll no (e.g. 5A-07)" value={form.roll_no} onChange={(e) => setForm({ ...form, roll_no: e.target.value })} className={inputCls} data-testid="teacher-student-roll-input" />
                            <input placeholder="Parent email" type="email" value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} className={inputCls} data-testid="teacher-student-parent-input" />
                            <div className="grid grid-cols-2 gap-3">
                                <input placeholder="DOB (YYYY-MM-DD)" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} className={inputCls} />
                                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={inputCls} data-testid="teacher-student-gender-select">
                                    <option value="M">Male</option>
                                    <option value="F">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <button type="button" onClick={() => setOpen(false)} className="h-11 px-5 rounded-lg border-2 border-hair">Cancel</button>
                                <button type="submit" data-testid="teacher-student-submit-button" className="h-11 px-5 rounded-lg bg-[#DF5C3D] hover:bg-[#C74B2F] text-white font-medium">Add student</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
