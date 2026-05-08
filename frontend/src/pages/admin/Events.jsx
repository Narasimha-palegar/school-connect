import { useCallback, useEffect, useState } from "react";
import DashboardLayout, { PageHeader, EmptyState } from "@/components/DashboardLayout";
import { Plus, Trash2 } from "lucide-react";
import api, { formatApiError } from "@/api";
import { toast } from "sonner";

export default function Events() {
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ title: "", description: "", date: "", location: "" });

    const load = useCallback(() => api.get("/events").then((r) => setItems(r.data)), []);
    useEffect(() => { load(); }, [load]);

    const submit = async (e) => {
        e.preventDefault();
        try {
            await api.post("/events", form); toast.success("Event created");
            setOpen(false); setForm({ title: "", description: "", date: "", location: "" }); load();
        } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    };
    const remove = async (id) => {
        if (!window.confirm("Delete?")) return;
        await api.delete(`/events/${id}`); toast.success("Deleted"); load();
    };

    const inputCls = "h-11 w-full bg-white border border-hair rounded-lg px-4 outline-none focus:border-[#DF5C3D]";

    return (
        <DashboardLayout>
            <PageHeader title="Events" subtitle="School events and important dates."
                action={<button onClick={() => setOpen(true)} data-testid="add-event-button" className="inline-flex items-center gap-2 bg-[#DF5C3D] hover:bg-[#C74B2F] text-white rounded-lg px-5 h-11 font-medium"><Plus className="h-4 w-4" /> New event</button>} />
            {items.length === 0 ? <EmptyState title="No events yet" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="events-grid">
                    {items.map((e) => (
                        <div key={e.id} className="bg-white border border-hair rounded-xl p-6" data-testid={`event-${e.id}`}>
                            <div className="text-xs uppercase tracking-widest text-[#DF5C3D] font-semibold">{e.date}</div>
                            <h3 className="font-display font-bold text-xl text-ink mt-1">{e.title}</h3>
                            <p className="text-ink-muted mt-2 text-sm">{e.description}</p>
                            {e.location && <div className="text-xs text-ink-muted mt-3">@ {e.location}</div>}
                            <button onClick={() => remove(e.id)} className="mt-3 text-ink-muted hover:text-[#D32F2F] text-sm inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remove</button>
                        </div>
                    ))}
                </div>
            )}
            {open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setOpen(false)}>
                    <div className="bg-white rounded-2xl p-8 w-full max-w-lg" onClick={(ev) => ev.stopPropagation()}>
                        <h3 className="font-display font-bold text-2xl text-ink mb-4">New event</h3>
                        <form onSubmit={submit} className="space-y-3">
                            <input required placeholder="Title" value={form.title} onChange={(ev) => setForm({ ...form, title: ev.target.value })} className={inputCls} data-testid="event-title-input" />
                            <textarea required rows={3} placeholder="Description" value={form.description} onChange={(ev) => setForm({ ...form, description: ev.target.value })} className="w-full bg-white border border-hair rounded-lg px-4 py-3 outline-none focus:border-[#DF5C3D]" data-testid="event-description-input" />
                            <input required type="date" value={form.date} onChange={(ev) => setForm({ ...form, date: ev.target.value })} className={inputCls} data-testid="event-date-input" />
                            <input placeholder="Location" value={form.location} onChange={(ev) => setForm({ ...form, location: ev.target.value })} className={inputCls} />
                            <div className="flex gap-2 justify-end pt-2">
                                <button type="button" onClick={() => setOpen(false)} className="h-11 px-5 rounded-lg border-2 border-hair">Cancel</button>
                                <button type="submit" data-testid="event-submit-button" className="h-11 px-5 rounded-lg bg-[#DF5C3D] hover:bg-[#C74B2F] text-white font-medium">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
