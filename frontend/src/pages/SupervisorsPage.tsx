import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import AdminLayout from "../components/AdminLayout";

type SupervisorRow = {
  supervisor_user_id: number;
  full_name: string;
  email: string;
  nickname?: string;
  file_id: number;
  created_at: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" stroke="currentColor" strokeWidth="2" />
      <path
        d="M21 21l-4.3-4.3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FolderIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="2" opacity="0.6" />
    </svg>
  );
}

function MailIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6h16v12H4V6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="m4 7 8 6 8-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldCheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 12.5l1.8 1.8L15.8 9.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SupervisorsPage() {
  const nav = useNavigate();

  const [data, setData] = useState<SupervisorRow[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await apiFetch("/admin/supervisors");
      setData(res);
    } catch (e: any) {
      setErr(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return data;
    return data.filter(
      (s) =>
        s.full_name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        (s.nickname || "").toLowerCase().includes(query)
    );
  }, [data, q]);

  const subtitle = useMemo(() => {
    if (loading) return "Loading…";
    if (q.trim()) return `${filtered.length} result(s)`;
    return `${data.length} supervisor(s)`;
  }, [loading, filtered.length, data.length, q]);

  return (
    <AdminLayout
      active="supervisors"
      title="Supervisors"
      subtitle={subtitle}
      right={
        <div className="flex items-center gap-2">
          <button
            className="h-10 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-sm font-extrabold text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100"
            onClick={() => nav("/admin/assign")}
          >
            Assign Students
          </button>
          <button
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-extrabold text-slate-900 hover:border-violet-300 hover:bg-violet-50"
            onClick={() => nav("/admin")}
          >
            Back
          </button>
        </div>
      }
    >
      {/* Search card */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-base font-black text-slate-900">Directory</div>
            <div className="mt-2 text-sm font-semibold text-slate-500">
              Search by name, email, or username, then open the workspace.
            </div>
          </div>

          <div className="flex h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-[0_10px_25px_rgba(15,23,42,0.06)] lg:w-[380px]">
            <span className="text-slate-400" aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:font-semibold placeholder:text-slate-400"
              placeholder="Search by name/email/username..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* List card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.06)]">
        {err && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {err}
          </div>
        )}

        {loading ? (
          <div className="text-sm font-semibold text-slate-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm font-semibold text-slate-500">No supervisors found.</div>
        ) : (
          <div className="grid gap-2.5">
            {filtered.map((s) => (
              <button
                key={s.supervisor_user_id}
                onClick={() => nav(`/admin/files/${s.file_id}`)}
                title="Open workspace"
                className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-[0_10px_26px_rgba(15,23,42,0.06)] transition hover:-translate-y-[1px] hover:border-violet-200 hover:bg-violet-50/30 hover:shadow-[0_16px_32px_rgba(109,94,252,0.12)] active:translate-y-0 active:shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {/* Avatar */}
                  <div className="grid h-10 w-10 flex-none place-items-center rounded-full border border-slate-200 bg-slate-100 font-black text-slate-700">
                    {initials(s.full_name)}
                  </div>

                  {/* Text */}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-slate-900">
                      {s.full_name}
                    </div>

                    <div className="mt-0.5 truncate text-xs font-extrabold text-[#6d5efc]">
                      @{(s.nickname || "").trim() || s.email.split("@")[0]}
                    </div>

                    <div className="mt-1.5 flex min-w-0 flex-wrap gap-2">
                      <span className="inline-flex max-w-full items-center gap-2 truncate rounded-full border border-[#6d5efc]/20 bg-[#6d5efc]/10 px-2.5 py-1 text-xs font-black text-slate-900">
                        <ShieldCheckIcon /> supervisor
                      </span>

                      <span className="inline-flex max-w-full items-center gap-2 truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-extrabold text-slate-600">
                        <MailIcon /> <span className="truncate">{s.email}</span>
                      </span>

                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-extrabold text-slate-600">
                        <FolderIcon /> Workspace
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right */}
                <div className="flex flex-none items-center gap-2">
                  <span className="inline-flex items-center justify-center rounded-full border border-violet-200 bg-violet-100/60 px-3 py-1 text-xs font-black text-violet-700">
                    Open
                  </span>
                  <span className="text-2xl font-semibold text-slate-300 transition group-hover:translate-x-[2px] group-hover:text-violet-400">
                    ›
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
