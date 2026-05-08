import { useState } from "react";
import DashboardLayout, { PageHeader } from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/api";
import { toast } from "sonner";

export default function Profile() {
    const { user, setUser } = useAuth();
    const [form, setForm] = useState({ name: user.name || "", phone: user.phone || "" });
    const [busy, setBusy] = useState(false);

    const save = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const { data } = await api.put("/profile", form);
            setUser(data);
            toast.success("Profile updated");
        } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
        finally { setBusy(false); }
    };

    const inputCls = "h-12 w-full bg-white border border-hair rounded-lg px-4 outline-none focus:border-[#DF5C3D] focus:ring-2 focus:ring-[#DF5C3D]/20";

    return (
        <DashboardLayout>
            <PageHeader title="Profile" subtitle="Your account information." />

            <div className="max-w-xl bg-white border border-hair rounded-xl p-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-16 w-16 rounded-full brand-gradient text-white flex items-center justify-center font-display font-black text-2xl">
                        {user.name?.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                        <div className="font-display font-bold text-xl text-ink">{user.name}</div>
                        <div className="text-sm text-ink-muted">{user.email}</div>
                        <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest bg-[#F2C55C]/30 text-[#8a6a1e] font-semibold">{user.role}</span>
                    </div>
                </div>

                <form onSubmit={save} className="space-y-4" data-testid="profile-form">
                    <div>
                        <label className="text-sm font-medium text-ink mb-2 block">Full name</label>
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} data-testid="profile-name-input" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-ink mb-2 block">Phone</label>
                        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} data-testid="profile-phone-input" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-ink mb-2 block">Email</label>
                        <input value={user.email} disabled className={inputCls + " opacity-60"} />
                    </div>
                    <button disabled={busy} data-testid="profile-save-button" className="h-12 px-6 rounded-lg bg-[#DF5C3D] hover:bg-[#C74B2F] text-white font-medium disabled:opacity-60">
                        {busy ? "Saving…" : "Save changes"}
                    </button>
                </form>
            </div>
        </DashboardLayout>
    );
}
