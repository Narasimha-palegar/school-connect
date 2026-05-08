import { useCallback, useEffect, useState } from "react";
import DashboardLayout, { PageHeader, EmptyState } from "@/components/DashboardLayout";
import AuthImage from "@/components/AuthImage";
import { Plus, Search as SearchIcon, Upload, X, Trash2 } from "lucide-react";
import api, { formatApiError } from "@/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const emptyForm = { item_name: "", description: "", location: "", type: "lost", image_path: null };

export default function LostAndFound() {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

    const load = useCallback(() => api.get("/lost-found").then((r) => setItems(r.data)), []);
    useEffect(() => { load(); }, [load]);

    const onPickImage = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error("Image too large (max 5 MB)"); return; }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const { data } = await api.post("/files/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
            setForm((f) => ({ ...f, image_path: data.path }));
            setPreviewUrl(URL.createObjectURL(file));
            toast.success("Image uploaded");
        } catch (err) { toast.error(formatApiError(err.response?.data?.detail, "Upload failed")); }
        finally { setUploading(false); }
    };

    const submit = async (e) => {
        e.preventDefault();
        try {
            await api.post("/lost-found", form);
            toast.success("Reported"); resetForm(); load();
        } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    };

    const resetForm = () => {
        setOpen(false);
        setForm(emptyForm);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
    };

    const updateStatus = async (id, status) => {
        try {
            await api.put(`/lost-found/${id}`, { status });
            toast.success(status === "claimed" ? "Marked as claimed — reporter notified by email" : "Marked resolved — reporter notified");
            load();
        } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    };

    const deleteItem = async (id) => {
        if (!window.confirm("Are you sure you want to delete this report?")) return;
        try {
            await api.delete(`/lost-found/${id}`);
            toast.success("Deleted");
            load();
        } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    };

    const inputCls = "h-11 w-full bg-white border border-hair rounded-lg px-4 outline-none focus:border-[#DF5C3D]";

    return (
        <DashboardLayout>
            <PageHeader
                title="Lost & Found"
                subtitle="Report or find misplaced items around campus. Reporters get an email when their item is claimed."
                action={
                    <button onClick={() => setOpen(true)} data-testid="add-lf-button"
                        className="inline-flex items-center gap-2 bg-[#DF5C3D] hover:bg-[#C74B2F] text-white rounded-lg px-5 h-11 font-medium">
                        <Plus className="h-4 w-4" /> Report item
                    </button>
                }
            />
            {items.length === 0 ? <EmptyState title="Nothing reported yet" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="lf-grid">
                    {items.map((it) => {
                        const canEdit = user.role === "admin" || user.role === "teacher" || it.reported_by === user.email;
                        const canDelete = user.role === "admin" || it.reported_by === user.email;
                        return (
                            <div key={it.id} className="bg-white border border-hair rounded-xl overflow-hidden flex flex-col" data-testid={`lf-item-${it.id}`}>
                                {it.image_path && (
                                    <AuthImage path={it.image_path} alt={it.item_name} className="w-full h-44 object-cover" />
                                )}
                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <SearchIcon className="h-4 w-4 text-ink-muted" />
                                        <span className={`text-xs uppercase tracking-widest font-semibold ${it.type === "lost" ? "text-[#D32F2F]" : "text-[#2E7D32]"}`}>{it.type}</span>
                                        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${it.status === "resolved" ? "bg-[#E8F5E9] text-[#2E7D32]" : it.status === "claimed" ? "bg-[#FFF3E0] text-[#ED6C02]" : "bg-[#E1F5FE] text-[#0288D1]"}`}>{it.status}</span>
                                    </div>
                                    <h3 className="font-display font-bold text-xl text-ink mt-2">{it.item_name}</h3>
                                    <p className="text-ink-muted text-sm mt-1">{it.description}</p>
                                    <div className="text-xs text-ink-muted mt-3">@ {it.location} · by {it.reported_by_name || it.reported_by}</div>
                                    
                                    <div className="mt-auto pt-4 flex items-center justify-between">
                                        <div className="flex gap-2">
                                            {canEdit && it.status !== "resolved" && (
                                                <>
                                                    {it.status !== "claimed" && (
                                                        <button onClick={() => updateStatus(it.id, "claimed")}
                                                            data-testid={`lf-claim-${it.id}`}
                                                            className="text-xs px-3 py-1.5 rounded-full bg-[#FFF3E0] text-[#ED6C02] hover:bg-[#FFE0B2] font-medium">
                                                            Mark claimed
                                                        </button>
                                                    )}
                                                    <button onClick={() => updateStatus(it.id, "resolved")}
                                                        data-testid={`lf-resolve-${it.id}`}
                                                        className="text-xs px-3 py-1.5 rounded-full bg-[#214A39] text-white font-medium hover:bg-[#1A3A2C]">
                                                        Resolve
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        {canDelete && (
                                            <button onClick={() => deleteItem(it.id)}
                                                className="p-1.5 text-ink-muted hover:text-[#D32F2F] hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete report"
                                                data-testid={`lf-delete-${it.id}`}>
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={resetForm}>
                    <div className="bg-white rounded-2xl p-8 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-display font-bold text-2xl text-ink mb-4">Report an item</h3>
                        <form onSubmit={submit} className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                {["lost", "found"].map((t) => (
                                    <button type="button" key={t} onClick={() => setForm({ ...form, type: t })}
                                        data-testid={`lf-type-${t}`}
                                        className={`h-11 rounded-lg border-2 font-medium uppercase text-xs tracking-widest ${form.type === t ? "bg-[#214A39] text-white border-[#214A39]" : "border-hair"}`}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                            <input required placeholder="Item name" value={form.item_name}
                                onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                                className={inputCls} data-testid="lf-name-input" />
                            <textarea required rows={3} placeholder="Description"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                className="w-full bg-white border border-hair rounded-lg px-4 py-3 outline-none focus:border-[#DF5C3D]"
                                data-testid="lf-desc-input" />
                            <input required placeholder="Last seen location"
                                value={form.location}
                                onChange={(e) => setForm({ ...form, location: e.target.value })}
                                className={inputCls} data-testid="lf-location-input" />

                            {/* Image upload */}
                            <div>
                                <label className="text-sm font-medium text-ink mb-2 block">Photo (optional)</label>
                                {previewUrl ? (
                                    <div className="relative">
                                        <img src={previewUrl} alt="Preview" className="w-full h-44 object-cover rounded-lg border border-hair" />
                                        <button type="button" onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setForm({ ...form, image_path: null }); }}
                                            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/95 border border-hair flex items-center justify-center hover:bg-white"
                                            data-testid="lf-image-remove">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex items-center justify-center gap-2 h-24 border-2 border-dashed border-hair rounded-lg cursor-pointer hover:border-[#DF5C3D] hover:bg-[#F7F6F3] transition-colors">
                                        <Upload className="h-4 w-4 text-ink-muted" />
                                        <span className="text-sm text-ink-muted">{uploading ? "Uploading…" : "Click to upload (JPEG/PNG, max 5 MB)"}</span>
                                        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onPickImage}
                                            disabled={uploading} className="hidden" data-testid="lf-image-input" />
                                    </label>
                                )}
                            </div>

                            <div className="flex gap-2 justify-end pt-2">
                                <button type="button" onClick={resetForm} className="h-11 px-5 rounded-lg border-2 border-hair">Cancel</button>
                                <button type="submit" disabled={uploading} data-testid="lf-submit-button"
                                    className="h-11 px-5 rounded-lg bg-[#DF5C3D] hover:bg-[#C74B2F] text-white font-medium disabled:opacity-60">
                                    Report
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
