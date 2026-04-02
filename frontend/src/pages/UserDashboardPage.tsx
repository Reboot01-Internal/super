import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";

type ProfileSummary = {
  user: {
    full_name: string;
    role: string;
  };
  supervisor?: {
    assigned_students_overall: number;
    boards: { id: number; name: string; students_count: number }[];
  };
  student?: {
    boards: { id: number; name: string }[];
    supervisors: { id: number; full_name: string }[];
  };
  tasks: {
    total: number;
    done: number;
    left: number;
    progress_pct: number;
  };
};

function BoardsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PeopleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20v-1.5A3.5 3.5 0 0 0 17 15.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15.5 4.7a3.5 3.5 0 0 1 0 6.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TasksIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="4" width="14" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 4.5h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DoneIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M8.5 12.5 10.8 14.8 15.8 9.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function UserDashboardPage() {
  const { isSupervisor } = useAuth();
  const [data, setData] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await apiFetch("/admin/profile/summary");
        if (!alive) return;
        setData(res);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to load dashboard");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const cards = useMemo(() => {
    const boardsCount = isSupervisor ? data?.supervisor?.boards?.length || 0 : data?.student?.boards?.length || 0;
    const peopleCount = isSupervisor ? data?.supervisor?.assigned_students_overall || 0 : data?.student?.supervisors?.length || 0;
    return [
      { label: "Boards", value: boardsCount, tone: "border-[#6d5efc]/20 bg-[#f3f1ff] text-[#6d5efc]", icon: <BoardsIcon size={15} /> },
      { label: isSupervisor ? "Students" : "Supervisors", value: peopleCount, tone: "border-sky-200 bg-sky-50 text-sky-700", icon: <PeopleIcon size={15} /> },
      { label: "Tasks", value: data?.tasks?.total || 0, tone: "border-amber-200 bg-amber-50 text-amber-700", icon: <TasksIcon size={15} /> },
      { label: "Done", value: data?.tasks?.done || 0, tone: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: <DoneIcon size={15} /> },
    ];
  }, [data, isSupervisor]);

  const focusItems = useMemo(() => {
    if (isSupervisor) {
      return [
        { label: "Assigned students", value: data?.supervisor?.assigned_students_overall || 0 },
        { label: "Open tasks", value: data?.tasks?.left || 0 },
        { label: "Task progress", value: `${data?.tasks?.progress_pct || 0}%` },
      ];
    }
    return [
      { label: "Supervisors", value: data?.student?.supervisors?.length || 0 },
      { label: "Open tasks", value: data?.tasks?.left || 0 },
      { label: "Task progress", value: `${data?.tasks?.progress_pct || 0}%` },
    ];
  }, [data, isSupervisor]);

  return (
    <AdminLayout active="dashboard" title="Dashboard" subtitle="A quick overview of your workspace and progress.">
      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${card.tone}`}>
                {card.icon}
              </div>
              <div className="mt-4 text-[28px] font-black tracking-[-0.04em] text-slate-900">{loading ? "..." : card.value}</div>
              <div className="mt-1 text-[13px] font-bold text-slate-500">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="text-[20px] font-black tracking-[-0.03em] text-slate-900">
            {loading ? "Loading..." : `Welcome, ${data?.user?.full_name || "there"}`}
          </div>
          <div className="mt-2 text-[14px] font-semibold text-slate-500">
            {isSupervisor
              ? "The most important numbers in your workspace, all in one place."
              : "A simple overview of your boards, supervisors, and task progress."}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {focusItems.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-[12px] font-black uppercase tracking-[0.14em] text-slate-400">{item.label}</div>
                <div className="mt-2 text-[24px] font-black tracking-[-0.03em] text-slate-900">
                  {loading ? "..." : item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
