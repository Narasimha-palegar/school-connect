import { useCallback, useEffect, useState } from "react";
import DashboardLayout, { PageHeader, EmptyState } from "@/components/DashboardLayout";
import api from "@/api";

export default function AttendanceReports() {
    const [records, setRecords] = useState([]);
    const [filter, setFilter] = useState({ class_name: "", section: "" });

    const load = useCallback(() => {
        const params = {};
        if (filter.class_name) params.class_name = filter.class_name;
        if (filter.section) params.section = filter.section;
        api.get("/admin/attendance-report", { params }).then((r) => setRecords(r.data));
    }, [filter]);

    useEffect(() => { load(); }, [load]);

    const inputCls = "h-11 bg-white border border-hair rounded-lg px-4 outline-none focus:border-[#DF5C3D]";

    return (
        <DashboardLayout>
            <PageHeader title="Attendance Reports" subtitle="All recorded attendance across the school." />
            <div className="flex gap-3 mb-6">
                <input placeholder="Class" value={filter.class_name}
                    onChange={(e) => setFilter({ ...filter, class_name: e.target.value })}
                    className={inputCls + " w-28"} data-testid="att-filter-class" />
                <input placeholder="Section" value={filter.section}
                    onChange={(e) => setFilter({ ...filter, section: e.target.value })}
                    className={inputCls + " w-28"} data-testid="att-filter-section" />
                <button onClick={load} data-testid="att-apply-filter"
                    className="h-11 px-5 rounded-lg bg-[#214A39] text-white font-medium">Filter</button>
            </div>
            {records.length === 0 ? <EmptyState title="No attendance records" /> : (
                <div className="bg-white border border-hair rounded-xl overflow-hidden">
                    <table className="w-full" data-testid="attendance-report-table">
                        <thead>
                            <tr className="bg-[#F7F6F3] text-left text-sm text-ink-muted">
                                <th className="py-3 px-4 font-semibold">Date</th>
                                <th className="py-3 px-4 font-semibold">Roll</th>
                                <th className="py-3 px-4 font-semibold">Student</th>
                                <th className="py-3 px-4 font-semibold">Class</th>
                                <th className="py-3 px-4 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.slice(0, 500).map((r) => (
                                <tr key={r.id} className="border-t border-hair">
                                    <td className="py-3 px-4 font-mono text-sm">{r.date}</td>
                                    <td className="py-3 px-4 font-mono text-sm text-ink-muted">{r.roll_no}</td>
                                    <td className="py-3 px-4 font-medium">{r.student_name}</td>
                                    <td className="py-3 px-4">{r.class_name}-{r.section}</td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                            r.status === "present" ? "bg-[#E8F5E9] text-[#2E7D32]" :
                                            r.status === "late" ? "bg-[#FFF3E0] text-[#ED6C02]" :
                                            "bg-[#FFEBEE] text-[#D32F2F]"
                                        }`}>{r.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </DashboardLayout>
    );
}
