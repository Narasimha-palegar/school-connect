import { useCallback, useEffect, useState } from "react";
import DashboardLayout, { PageHeader, EmptyState } from "@/components/DashboardLayout";
import { Plus, Trash2, Pencil } from "lucide-react";
import api, { formatApiError } from "@/api";
import { toast } from "sonner";

const empty = { name: "", email: "", phone: "", subject: "", classes: "" };

export default function TeacherManagement() {
    const [teachers, setTeachers] = useState([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(empty);

    const load = useCallback(() => api.get("/admin/teachers").then((r) => setTeachers(r.data)), []);
    useEffect(() => { load(); }, [load]);

    const submit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                const { email: _em, ...edit } = form;
                const payload = { ...edit, classes: form.classes.split(",").map((s) => s.trim()).filter(Boolean) };
                await api.put(`/admin/teachers/${editing}`, payload);
                toast.success("Teacher updated");
            } else {
                const payload = { ...form, classes: form.classes.split(",").map((s) => s.trim()).filter(Boolean) };
                await api.post("/admin/teachers", payload);
                toast.success("Teacher added — they can sign in with their email via OTP");
            }
            setOpen(false); setEditing(null); setForm(empty); load();
        } catch (err) {
            toast.error(formatApiError(err.response?.data?.detail));
        }
    };

    const startEdit = (t) => {
        setEditing(t.id);
        setForm({ name: t.name, email: t.email, phone: t.phone || "",
            subject: t.subject || "", classes: (t.classes || []).join(", ") });
        setOpen(true);
    };

    const remove = async (id) => {
        if (!window.confirm("Delete this teacher?")) return;
        await api.delete(`/admin/teachers/${id}`);
        toast.success("Deleted"); load();
    };

    const inputCls = "h-11 w-full bg-white border border-hair rounded-lg px-4 outline-none focus:border-[#DF5C3D] focus:ring-2 focus:ring-[#DF5C3D]/20";

    return (
        <DashboardLayout>
            <PageHeader
                title="Teachers"
                subtitle="Manage faculty members and class assignments."
                action={
                    <button
                        onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}
                        data-testid="add-teacher-button"
                        className="inline-flex items-center gap-2 bg-[#DF5C3D] hover:bg-[#C74B2F] text-white rounded-lg px-5 h-11 font-medium shadow-sm"
                    >
                        <Plus className="h-4 w-4" /> Add teacher
                    </button>
                }
            />

            {teachers.length === 0 ? (
                <EmptyState title="No teachers yet" subtitle="Add your first teacher to get started." />
            ) : (
                <div className="bg-white border border-hair rounded-xl overflow-hidden">
                    <table className="w-full" data-testid="teachers-table">
                        <thead>
                            <tr className="bg-[#F7F6F3] text-left text-sm text-ink-muted">
                                <th className="py-3 px-4 font-semibold">Name</th>
                                <th className="py-3 px-4 font-semibold">Email</th>
                                <th className="py-3 px-4 font-semibold">Subject</th>
                                <th className="py-3 px-4 font-semibold">Classes</th>
                                <th className="py-3 px-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teachers.map((t) => (
                                <tr key={t.id} className="border-t border-hair hover:bg-[#F9F9F8]" data-testid={`teacher-row-${t.id}`}>
                                    <td className="py-4 px-4 font-medium text-ink">{t.name}</td>
                                    <td className="py-4 px-4 text-ink-muted">{t.email}</td>
                                    <td className="py-4 px-4">{t.subject || "—"}</td>
                                    <td className="py-4 px-4 text-sm">{(t.classes || []).join(", ") || "—"}</td>
                                    <td className="py-4 px-4 text-right">
                                        <button onClick={() => startEdit(t)} data-testid={`edit-teacher-${t.id}`} className="inline-flex p-2 text-ink-muted hover:text-[#214A39]"><Pencil className="h-4 w-4" /></button>
                                        <button onClick={() => remove(t.id)} data-testid={`delete-teacher-${t.id}`} className="inline-flex p-2 text-ink-muted hover:text-[#D32F2F]"><Trash2 className="h-4 w-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setOpen(false)}>
                    <div className="bg-white rounded-2xl p-8 w-full max-w-lg" onClick={(e) => e.stopPropagation()} data-testid="teacher-modal">
                        <h3 className="font-display font-bold text-2xl text-ink mb-4">{editing ? "Edit teacher" : "New teacher"}</h3>
                        <form onSubmit={submit} className="space-y-3">
                            <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} data-testid="teacher-name-input" />
                            <input required type="email" placeholder="Email" value={form.email} disabled={!!editing} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls + (editing ? " opacity-60" : "")} data-testid="teacher-email-input" />
                            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
                            <input placeholder="Subject (e.g. Mathematics)" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputCls} data-testid="teacher-subject-input" />
                            <input placeholder="Classes comma-separated (e.g. 5-A, 5-B)" value={form.classes} onChange={(e) => setForm({ ...form, classes: e.target.value })} className={inputCls} data-testid="teacher-classes-input" />
                            <p className="text-xs text-ink-muted">Teachers sign in with their email via a one-time code — no password required.</p>                            <div className="flex gap-2 justify-end pt-2">
                                <button type="button" onClick={() => setOpen(false)} className="h-11 px-5 rounded-lg border-2 border-hair text-ink">Cancel</button>
                                <button type="submit" data-testid="teacher-submit-button" className="h-11 px-5 rounded-lg bg-[#DF5C3D] hover:bg-[#C74B2F] text-white font-medium">{editing ? "Save" : "Create"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
