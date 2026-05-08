import { useEffect, useState } from "react";
import DashboardLayout, { PageHeader, StatCard, EmptyState } from "@/components/DashboardLayout";
import { Users, GraduationCap, Briefcase, School as SchoolIcon } from "lucide-react";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
    PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";

const COLORS = ["#DF5C3D", "#214A39", "#F2C55C", "#4A7A64", "#E88D77"];

export default function AdminDashboard() {
    const { user } = useAuth();
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get("/admin/analytics").then((r) => setData(r.data)).catch(() => setData(false));
    }, []);

    return (
        <DashboardLayout>
            <PageHeader
                title={`Welcome, ${user.name.split(" ")[0]}`}
                subtitle="A snapshot of your school's activity today."
                testid="admin-dashboard-header"
            />

            {data === null ? (
                <div className="text-ink-muted">Loading analytics…</div>
            ) : !data ? (
                <EmptyState title="Unable to load analytics" />
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard testid="stat-students" label="Students" value={data.totals.students} icon={GraduationCap} accent="primary" />
                        <StatCard testid="stat-teachers" label="Teachers" value={data.totals.teachers} icon={Briefcase} accent="secondary" />
                        <StatCard testid="stat-parents" label="Parents" value={data.totals.parents} icon={Users} accent="green" />
                        <StatCard testid="stat-classes" label="Classes" value={data.totals.classes} icon={SchoolIcon} accent="accent" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                        <div className="lg:col-span-2 bg-white border border-hair rounded-xl p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-display font-bold text-xl text-ink">Attendance trend</h3>
                                    <p className="text-sm text-ink-muted">% present, last 7 days</p>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={data.attendance_trend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E4E0" />
                                    <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke="#575652" fontSize={12} />
                                    <YAxis domain={[0, 100]} stroke="#575652" fontSize={12} />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E4E0" }} />
                                    <Line type="monotone" dataKey="present_pct" stroke="#DF5C3D" strokeWidth={3} dot={{ fill: "#DF5C3D", r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white border border-hair rounded-xl p-6">
                            <h3 className="font-display font-bold text-xl text-ink mb-4">Gender split</h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={data.gender_distribution.filter((g) => g.count > 0)}
                                        dataKey="count"
                                        nameKey="label"
                                        innerRadius={50}
                                        outerRadius={90}
                                        paddingAngle={2}
                                    >
                                        {data.gender_distribution.map((g, i) => (
                                            <Cell key={g.label} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white border border-hair rounded-xl p-6 mt-6">
                        <h3 className="font-display font-bold text-xl text-ink mb-4">Students per class</h3>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={data.class_distribution}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E4E0" />
                                <XAxis dataKey="label" stroke="#575652" fontSize={12} />
                                <YAxis stroke="#575652" fontSize={12} />
                                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E4E0" }} />
                                <Bar dataKey="count" fill="#214A39" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}
        </DashboardLayout>
    );
}
