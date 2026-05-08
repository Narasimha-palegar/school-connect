import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { ArrowLeft } from "lucide-react";

const IMAGES = [
    "/assets/images/login_1.png",
    "/assets/images/login_2.png",
    "/assets/images/login_3.png",
    "/assets/images/login_4.png"
];

export default function Login() {
    const [step, setStep] = useState("email"); // 'email' | 'otp'
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [busy, setBusy] = useState(false);
    const [imageIndex, setImageIndex] = useState(0);
    const { login } = useAuth();
    const nav = useNavigate();

    useEffect(() => {
        const interval = setInterval(() => {
            setImageIndex((prev) => (prev + 1) % IMAGES.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const requestOtp = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            await api.post("/auth/login-request", { email });
            toast.success("We've emailed you a 6-digit code");
            setStep("otp");
        } catch (err) {
            toast.error(formatApiError(err.response?.data?.detail, "Could not send code"));
        } finally { setBusy(false); }
    };

    const verifyOtp = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const { data } = await api.post("/auth/login-verify", { email, otp });
            login(data.token, data.user);
            toast.success(`Welcome, ${data.user.name}`);
            nav(`/${data.user.role}`);
        } catch (err) {
            toast.error(formatApiError(err.response?.data?.detail, "Invalid code"));
        } finally { setBusy(false); }
    };

    const resend = async () => {
        try {
            await api.post("/auth/login-request", { email });
            toast.success("New code sent");
        } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    };

    const inputCls = "h-12 w-full bg-white border border-hair rounded-lg px-4 text-ink focus:border-[#DF5C3D] focus:ring-2 focus:ring-[#DF5C3D]/20 outline-none transition-all";

    return (
        <div className="flex min-h-screen bg-canvas">
            <div className="hidden lg:flex lg:w-1/2 relative bg-[#214A39] items-center justify-center p-12 overflow-hidden">
                {IMAGES.map((img, idx) => (
                    <img
                        key={img}
                        src={img}
                        alt="Education environment"
                        className={`absolute max-w-lg w-full object-contain transition-opacity duration-1000 ease-in-out ${
                            idx === imageIndex ? "opacity-100" : "opacity-0"
                        }`}
                    />
                ))}
                <div className="absolute bottom-12 left-12 right-12 text-white z-10">
                    <div className="text-xs uppercase tracking-[0.2em] opacity-80 mb-2">School Connect</div>
                    <div className="font-display font-black text-3xl tracking-tight leading-tight max-w-md">
                        One platform for administrators, teachers and parents.
                    </div>
                </div>
                {/* Dots indicator */}
                <div className="absolute bottom-6 flex gap-2">
                    {IMAGES.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                idx === imageIndex ? "w-6 bg-white" : "w-1.5 bg-white/40"
                            }`}
                        />
                    ))}
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white lg:bg-transparent">
                <div className="w-full max-w-md">
                    <div className="mb-10">
                        <div className="text-sm uppercase tracking-[0.2em] text-ink-muted mb-2">
                            {step === "email" ? "Sign in" : "Verify"}
                        </div>
                        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter text-ink">
                            {step === "email" ? "Welcome back." : "Enter your code."}
                        </h1>
                        <p className="text-ink-muted mt-3">
                            {step === "email"
                                ? "Enter your school email — we'll send you a one-time code."
                                : (
                                    <>We just emailed a 6-digit code to <strong className="text-ink">{email}</strong>.</>
                                )}
                        </p>
                    </div>

                    {step === "email" ? (
                        <form onSubmit={requestOtp} className="space-y-5" data-testid="login-email-form">
                            <div>
                                <label className="text-sm font-medium text-ink mb-2 block">Email</label>
                                <input
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    data-testid="login-email-input"
                                    className={inputCls}
                                    placeholder="you@school.com"
                                    autoFocus
                                />
                            </div>
                            <button
                                disabled={busy}
                                data-testid="login-submit-button"
                                className="w-full h-12 bg-[#DF5C3D] hover:bg-[#C74B2F] text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-60"
                            >
                                {busy ? "Sending code…" : "Send sign-in code"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={verifyOtp} className="space-y-5" data-testid="login-otp-form">
                            <div>
                                <label className="text-sm font-medium text-ink mb-2 block">6-digit code</label>
                                <input
                                    required
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                    data-testid="login-otp-input"
                                    className="h-14 w-full bg-white border border-hair rounded-lg px-4 text-center font-mono text-2xl tracking-[0.5em] outline-none focus:border-[#DF5C3D] focus:ring-2 focus:ring-[#DF5C3D]/20"
                                    autoFocus
                                />
                            </div>
                            <button
                                disabled={busy || otp.length < 6}
                                data-testid="login-verify-button"
                                className="w-full h-12 bg-[#DF5C3D] hover:bg-[#C74B2F] text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-60"
                            >
                                {busy ? "Signing in…" : "Sign in"}
                            </button>
                            <div className="flex items-center justify-between text-sm">
                                <button type="button" onClick={() => { setStep("email"); setOtp(""); }}
                                    data-testid="login-change-email"
                                    className="inline-flex items-center gap-1 text-ink-muted hover:text-ink">
                                    <ArrowLeft className="h-3 w-3" /> Use a different email
                                </button>
                                <button type="button" onClick={resend} data-testid="login-resend-otp"
                                    className="text-[#DF5C3D] hover:underline">Resend code</button>
                            </div>
                        </form>
                    )}

                    <div className="mt-10 p-4 bg-[#F2C55C]/20 rounded-xl text-sm" data-testid="demo-credentials">
                        <div className="font-semibold text-ink mb-2">Demo accounts (passwordless)</div>
                        <ul className="space-y-1 text-ink-muted">
                            <li>narasimha.palegar.07@gmail.com — Admin</li>
                            <li>teacher@school.com — Teacher</li>
                            <li>parent@school.com — Parent</li>
                        </ul>
                        <div className="text-xs text-ink-muted mt-2">
                            All sign-in codes are routed to the admin's inbox during sandbox testing.
                        </div>
                    </div>
                </div>
            </div>
            <Toaster position="top-right" />
        </div>
    );
}
