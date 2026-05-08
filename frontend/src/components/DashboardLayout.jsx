import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, School } from "lucide-react";
import { useState } from "react";

export default function DashboardLayout({ children }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="min-h-screen bg-canvas">
            {/* Desktop Sidebar */}
            <Sidebar className="w-64 fixed left-0 top-0 h-screen hidden lg:flex" />

            {/* Mobile Header */}
            <header className="lg:hidden h-16 bg-sidebar border-b border-hair flex items-center justify-between px-6 sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-brand flex items-center justify-center text-white">
                        <School className="h-4 w-4" />
                    </div>
                    <span className="font-display font-bold text-ink">School Connect</span>
                </div>
                
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <button className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-[#E5E4E0]">
                            <Menu className="h-5 w-5 text-ink" />
                        </button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-72">
                        <Sidebar className="h-full border-none" onNavigate={() => setOpen(false)} />
                    </SheetContent>
                </Sheet>
            </header>

            {/* Main Content */}
            <main className="ml-0 lg:ml-64 min-h-screen transition-all">
                <div className="p-6 sm:p-10 max-w-[1600px] mx-auto">
                    {children}
                </div>
            </main>
            
            <Toaster position="top-right" />
        </div>
    );
}


export function PageHeader({ title, subtitle, action, testid }) {
    return (
        <div
            data-testid={testid || "page-header"}
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8"
        >
            <div>
                <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tighter text-ink">
                    {title}
                </h1>
                {subtitle && <p className="text-ink-muted mt-2 text-base">{subtitle}</p>}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}

export function StatCard({ label, value, icon: Icon, accent = "primary", testid }) {
    const colors = {
        primary: "bg-[#DF5C3D]/10 text-[#DF5C3D]",
        secondary: "bg-[#214A39]/10 text-[#214A39]",
        accent: "bg-[#F2C55C]/20 text-[#8a6a1e]",
        green: "bg-[#4A7A64]/15 text-[#4A7A64]",
    };
    return (
        <div
            data-testid={testid}
            className="bg-white border border-hair rounded-xl p-6 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all"
        >
            <div className="flex items-start justify-between">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${colors[accent]}`}>
                    {Icon && <Icon className="h-5 w-5" />}
                </div>
            </div>
            <div className="mt-4 font-display font-black text-4xl tracking-tighter text-ink">{value}</div>
            <div className="text-sm uppercase tracking-widest text-ink-muted mt-1">{label}</div>
        </div>
    );
}

export function EmptyState({ title = "Nothing here yet", subtitle, action }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <img
                src="/assets/images/empty_state_illustration.png"
                alt="Empty state"
                className="w-40 h-40 object-contain mb-4 opacity-90"
            />
            <div className="font-display font-bold text-xl text-ink">{title}</div>
            {subtitle && <p className="text-ink-muted mt-2 max-w-sm">{subtitle}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
