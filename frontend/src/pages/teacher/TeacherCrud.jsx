import { useCallback, useEffect, useState } from "react";
import DashboardLayout, { PageHeader, EmptyState } from "@/components/DashboardLayout";
import { Plus, Trash2 } from "lucide-react";
import api, { formatApiError } from "@/api";
import { toast } from "sonner";

function CrudPage({ entity, endpoint, fields, displayFields }) {
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(() => Object.fromEntries(fields.map((f) => [f.name, ""])));

    const load = useCallback(() => api.get(endpoint).then((r) => setItems(r.data)), [endpoint]);
    useEffect(() => { load(); }, [load]);

    const submit = async (e) => {
        e.preventDefault();
        try {
            await api.post(endpoint, form); toast.success(`${entity} posted`);
            setOpen(false);
            setForm(Object.fromEntries(fields.map((f) => [f.name, ""])));
            load();
        } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    };

    const remove = async (id) => {
        if (!window.confirm("Delete?")) return;
        await api.delete(`${endpoint}/${id}`); toast.success("Deleted"); load();
    };

    const inputCls = "h-11 w-full bg-white border border-hair rounded-lg px-4 outline-none focus:border-[#DF5C3D]";

    return (
        <DashboardLayout>
            <PageHeader title={entity + "s"} subtitle={`Manage your ${entity.toLowerCase()}s.`}
                action={<button onClick={() => setOpen(true)} data-testid={`add-${entity.toLowerCase()}-button`} className="inline-flex items-center gap-2 bg-[#DF5C3D] hover:bg-[#C74B2F] text-white rounded-lg px-5 h-11 font-medium"><Plus className="h-4 w-4" /> New {entity.toLowerCase()}</button>} />
            {items.length === 0 ? <EmptyState title={`No ${entity.toLowerCase()}s yet`} /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid={`${entity.toLowerCase()}-list`}>
                    {items.map((it) => (
                        <div key={it.id} className="bg-white border border-hair rounded-xl p-6" data-testid={`${entity.toLowerCase()}-${it.id}`}>
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs uppercase tracking-widest text-[#DF5C3D] font-semibold">{it.subject} · {it.class_name}-{it.section}</div>
                                    <h3 className="font-display font-bold text-xl text-ink mt-1">{it.title}</h3>
                                    <p className="text-ink-muted text-sm mt-2">{displayFields.includes("description") ? it.description : it.content}</p>
                                    {it.due_date && <div className="text-xs text-ink-muted mt-3">Due {it.due_date}</div>}
                                </div>
                                <button onClick={() => remove(it.id)} className="p-2 text-ink-muted hover:text-[#D32F2F]"><Trash2 className="h-4 w-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setOpen(false)}>
                    <div className="bg-white rounded-2xl p-8 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-display font-bold text-2xl text-ink mb-4">New {entity.toLowerCase()}</h3>
                        <form onSubmit={submit} className="space-y-3">
                            {fields.map((f) => (
                                f.type === "textarea" ? (
                                    <textarea key={f.name} required placeholder={f.label} rows={4} value={form[f.name]}
                                        onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                                        data-testid={`${entity.toLowerCase()}-${f.name}-input`}
                                        className="w-full bg-white border border-hair rounded-lg px-4 py-3 outline-none focus:border-[#DF5C3D]" />
                                ) : (
                                    <input key={f.name} required type={f.type || "text"} placeholder={f.label} value={form[f.name]}
                                        onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                                        data-testid={`${entity.toLowerCase()}-${f.name}-input`}
                                        className={inputCls} />
                                )
                            ))}
                            <div className="flex gap-2 justify-end pt-2">
                                <button type="button" onClick={() => setOpen(false)} className="h-11 px-5 rounded-lg border-2 border-hair">Cancel</button>
                                <button type="submit" data-testid={`${entity.toLowerCase()}-submit-button`} className="h-11 px-5 rounded-lg bg-[#DF5C3D] hover:bg-[#C74B2F] text-white font-medium">Post</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

export function TeacherHomework() {
    return <CrudPage entity="Homework" endpoint="/teacher/homework"
        displayFields={["description"]}
        fields={[
            { name: "class_name", label: "Class (e.g. 5)" },
            { name: "section", label: "Section (e.g. A)" },
            { name: "subject", label: "Subject" },
            { name: "title", label: "Title" },
            { name: "description", label: "Description", type: "textarea" },
            { name: "due_date", label: "Due date", type: "date" },
        ]}
    />;
}

export function TeacherNotes() {
    return <CrudPage entity="Note" endpoint="/teacher/notes"
        displayFields={["content"]}
        fields={[
            { name: "class_name", label: "Class" },
            { name: "section", label: "Section" },
            { name: "subject", label: "Subject" },
            { name: "title", label: "Title" },
            { name: "content", label: "Content", type: "textarea" },
        ]}
    />;
}
