import { useCallback, useEffect, useState } from "react";
import DashboardLayout, { PageHeader, EmptyState } from "@/components/DashboardLayout";
import { Plus, Trash2 } from "lucide-react";
import api, { formatApiError } from "@/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function Announcements() {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ title: "", content: "", audience: "all" });

    const load = useCallback(() => api.get("/announcements").then((r) => setItems(r.data)), []);
    useEffect(() => { load(); }, [load]);

    const submit = async (e) => {
        e.preventDefault();
        try {
            await api.post("/announcements", form);
            toast.success("Posted"); setOpen(false); setForm({ title: "", content: "", audience: "all" }); load();
        } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    };

    const remove = async (id) => {
        if (!window.confirm("Delete?")) return;
        try { await api.delete(`/announcements/${id}`); toast.success("Deleted"); load(); }
        catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    };

    const canPost = user.role === "admin" || user.role === "teacher";
    const inputCls = "h-11 w-full bg-white border border-hair rounded-lg px-4 outline-none focus:border-[#DF5C3D]";

    return (
        <DashboardLayout>
            <PageHeader
                title="Announcements"
                subtitle={canPost ? "Post updates for the school community." : "Latest news from your school."}
                action={canPost && (
                    <button onClick={() => setOpen(true)} data-testid="add-announcement-button"
                        className="inline-flex items-center gap-2 bg-[#DF5C3D] hover:bg-[#C74B2F] text-white rounded-lg px-5 h-11 font-medium shadow-sm">
                        <Plus className="h-4 w-4" /> New announcement
                    </button>
                )}
            />

            {items.length === 0 ? (
                <EmptyState title="No announcements yet" />
            ) : (
                <div className="space-y-4" data-testid="announcements-list">
                    {items.map((a) => (
                        <div key={a.id} className="bg-white border border-hair rounded-xl p-6" data-testid={`announcement-${a.id}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-xs uppercase tracking-widest text-[#DF5C3D] font-semibold">{a.audience}</div>
                                    <h3 className="font-display font-bold text-xl text-ink mt-1">{a.title}</h3>
                                    <p className="text-ink-muted mt-2 whitespace-pre-wrap">{a.content}</p>
                                    <div className="text-xs text-ink-muted mt-3">By {a.created_by} · {new Date(a.created_at).toLocaleString()}</div>
                                </div>
                                {canPost && (
                                    <button onClick={() => remove(a.id)} className="p-2 text-ink-muted hover:text-[#D32F2F]" data-testid={`delete-ann-${a.id}`}><Trash2 className="h-4 w-4" /></button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setOpen(false)}>
                    <div className="bg-white rounded-2xl p-8 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-display font-bold text-2xl text-ink mb-4">New announcement</h3>
                        <form onSubmit={submit} className="space-y-3">
                            <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} data-testid="ann-title-input" />
                            <textarea required rows={4} placeholder="Content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="w-full bg-white border border-hair rounded-lg px-4 py-3 outline-none focus:border-[#DF5C3D]" data-testid="ann-content-input" />
                            <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className={inputCls} data-testid="ann-audience-select">
                                <option value="all">All</option>
                                <option value="teachers">Teachers</option>
                                <option value="parents">Parents</option>
                                <option value="students">Students</option>
                            </select>
                            <div className="flex gap-2 justify-end pt-2">
                                <button type="button" onClick={() => setOpen(false)} className="h-11 px-5 rounded-lg border-2 border-hair">Cancel</button>
                                <button type="submit" data-testid="ann-submit-button" className="h-11 px-5 rounded-lg bg-[#DF5C3D] hover:bg-[#C74B2F] text-white font-medium">Post</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
