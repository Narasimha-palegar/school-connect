import { useCallback, useEffect, useState } from "react";
import DashboardLayout, { PageHeader, EmptyState } from "@/components/DashboardLayout";
import { Plus, Trash2, Pencil } from "lucide-react";
import api, { formatApiError } from "@/api";
import { toast } from "sonner";

const empty = { name: "", roll_no: "", class_name: "", section: "", parent_email: "", dob: "", gender: "M" };

export default function StudentManagement() {
    const [students, setStudents] = useState([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(empty);
    const [filter, setFilter] = useState("");

    const load = useCallback(() => api.get("/admin/students").then((r) => setStudents(r.data)), []);
    useEffect(() => { load(); }, [load]);

    const submit = async (e) => {
        e.preventDefault();
        try {
            if (editing) { await api.put(`/admin/students/${editing}`, form); toast.success("Student updated"); }
            else { await api.post("/admin/students", form); toast.success("Student added"); }
            setOpen(false); setEditing(null); setForm(empty); load();
        } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    };

    const startEdit = (s) => {
        setEditing(s.id);
        setForm({ name: s.name, roll_no: s.roll_no, class_name: s.class_name, section: s.section,
            parent_email: s.parent_email || "", dob: s.dob || "", gender: s.gender || "M" });
        setOpen(true);
    };
    const remove = async (id) => {
        if (!window.confirm("Delete this student?")) return;
        await api.delete(`/admin/students/${id}`); toast.success("Deleted"); load();
    };

    const filtered = students.filter((s) => {
        const q = filter.toLowerCase();
        return !q || s.name.toLowerCase().includes(q) || s.roll_no.toLowerCase().includes(q) || `${s.class_name}-${s.section}`.includes(q);
    });

    const inputCls = "h-11 w-full bg-white border border-hair rounded-lg px-4 outline-none focus:border-[#DF5C3D] focus:ring-2 focus:ring-[#DF5C3D]/20";

    return (
        <DashboardLayout>
            <PageHeader
                title="Students"
                subtitle={`${students.length} enrolled across all classes.`}
                action={
                    <button onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}
                        data-testid="add-student-button"
                        className="inline-flex items-center gap-2 bg-[#DF5C3D] hover:bg-[#C74B2F] text-white rounded-lg px-5 h-11 font-medium shadow-sm">
                        <Plus className="h-4 w-4" /> Add student
                    </button>
                }
            />

            <input placeholder="Search by name, roll or class (e.g. 5-A)…" value={filter}
                onChange={(e) => setFilter(e.target.value)}
                data-testid="student-search-input"
                className="h-11 w-full md:w-96 bg-white border border-hair rounded-lg px-4 mb-6 outline-none focus:border-[#DF5C3D]" />

            {filtered.length === 0 ? (
                <EmptyState title="No students found" />
            ) : (
                <div className="bg-white border border-hair rounded-xl overflow-hidden">
                    <table className="w-full" data-testid="students-table">
                        <thead>
                            <tr className="bg-[#F7F6F3] text-left text-sm text-ink-muted">
                                <th className="py-3 px-4 font-semibold">Roll</th>
                                <th className="py-3 px-4 font-semibold">Name</th>
                                <th className="py-3 px-4 font-semibold">Class</th>
                                <th className="py-3 px-4 font-semibold">Parent</th>
                                <th className="py-3 px-4 font-semibold">Gender</th>
                                <th className="py-3 px-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((s) => (
                                <tr key={s.id} className="border-t border-hair hover:bg-[#F9F9F8]" data-testid={`student-row-${s.id}`}>
                                    <td className="py-4 px-4 font-mono text-sm text-ink-muted">{s.roll_no}</td>
                                    <td className="py-4 px-4 font-medium text-ink">{s.name}</td>
                                    <td className="py-4 px-4">{s.class_name}-{s.section}</td>
                                    <td className="py-4 px-4 text-sm text-ink-muted">{s.parent_email || "—"}</td>
                                    <td className="py-4 px-4">{s.gender}</td>
                                    <td className="py-4 px-4 text-right">
                                        <button onClick={() => startEdit(s)} className="inline-flex p-2 text-ink-muted hover:text-[#214A39]"><Pencil className="h-4 w-4" /></button>
                                        <button onClick={() => remove(s.id)} className="inline-flex p-2 text-ink-muted hover:text-[#D32F2F]"><Trash2 className="h-4 w-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setOpen(false)}>
                    <div className="bg-white rounded-2xl p-8 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-display font-bold text-2xl text-ink mb-4">{editing ? "Edit student" : "New student"}</h3>
                        <form onSubmit={submit} className="space-y-3">
                            <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} data-testid="student-name-input" />
                            <input required placeholder="Roll no" value={form.roll_no} onChange={(e) => setForm({ ...form, roll_no: e.target.value })} className={inputCls} data-testid="student-roll-input" />
                            <div className="grid grid-cols-2 gap-3">
                                <input required placeholder="Class (e.g. 5)" value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} className={inputCls} data-testid="student-class-input" />
                                <input required placeholder="Section (e.g. A)" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className={inputCls} data-testid="student-section-input" />
                            </div>
                            <input placeholder="Parent email" type="email" value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} className={inputCls} />
                            <div className="grid grid-cols-2 gap-3">
                                <input placeholder="DOB (YYYY-MM-DD)" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} className={inputCls} />
                                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={inputCls}>
                                    <option value="M">Male</option>
                                    <option value="F">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <button type="button" onClick={() => setOpen(false)} className="h-11 px-5 rounded-lg border-2 border-hair">Cancel</button>
                                <button type="submit" data-testid="student-submit-button" className="h-11 px-5 rounded-lg bg-[#DF5C3D] hover:bg-[#C74B2F] text-white font-medium">{editing ? "Save" : "Create"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
