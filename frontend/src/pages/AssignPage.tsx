import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { apiFetch } from "../lib/api";
// import "../admin.css";

type User = { id: number; full_name: string; email: string; role: string };
type Role = "supervisor" | "student";

function RoleIcon({ role }: { role: Role }) {
  if (role === "supervisor") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l10 5-10 5L2 8l10-5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M6 10.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M22 8v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function initialsOf(name: string) {
  const n = (name || "").trim();
  if (!n) return "?";
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => (p[0] || "").toUpperCase()).join("") || "?";
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function AssignPage() {
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [assigned, setAssigned] = useState<User[]>([]);

  const [selectedSup, setSelectedSup] = useState<User | null>(null);

  const [supQ, setSupQ] = useState("");
  const [stuQ, setStuQ] = useState("");

  const [selectedStuIds, setSelectedStuIds] = useState<Set<number>>(new Set());

  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function loadBase() {
    setErr("");
    try {
      const [sups, studs] = await Promise.all([
        apiFetch("/admin/assign/supervisors"),
        apiFetch("/admin/assign/students"),
      ]);
      setSupervisors(sups || []);
      setStudents(studs || []);
      setSelectedSup(null);
      setAssigned([]);
      setSelectedStuIds(new Set());
    } catch (e: any) {
      setErr(e.message || "Failed to load");
    }
  }

  async function loadAssigned(supervisorId: number) {
    setErr("");
    setOk("");
    setLoadingAssigned(true);
    try {
      const res = await apiFetch(`/admin/assign/list?supervisor_id=${supervisorId}`);
      setAssigned(res || []);
    } catch (e: any) {
      setErr(e.message || "Failed to load assigned students");
      setAssigned([]);
    } finally {
      setLoadingAssigned(false);
    }
  }

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    if (selectedSup) {
      loadAssigned(selectedSup.id);
      setSelectedStuIds(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSup?.id]);

  const assignedIds = useMemo(() => new Set(assigned.map((a) => a.id)), [assigned]);

  const visibleSupervisors = useMemo(() => {
    const q = supQ.trim().toLowerCase();
    return supervisors.filter((s) => {
      if (!q) return true;
      return s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    });
  }, [supervisors, supQ]);

  const visibleStudents = useMemo(() => {
    const q = stuQ.trim().toLowerCase();
    return students
      .filter((s) => !assignedIds.has(s.id))
      .filter((s) => {
        if (!q) return true;
        return s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      });
  }, [students, assignedIds, stuQ]);

  function toggleStudent(id: number) {
    setSelectedStuIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedStuIds((prev) => {
      const next = new Set(prev);
      visibleStudents.forEach((s) => next.add(s.id));
      return next;
    });
  }

  function clearSelected() {
    setSelectedStuIds(new Set());
  }

  async function addSelected() {
    if (!selectedSup) {
      setErr("Select a supervisor first.");
      return;
    }
    if (selectedStuIds.size === 0) return;

    setSaving(true);
    setErr("");
    setOk("");

    const supId = selectedSup.id;
    const ids = Array.from(selectedStuIds);

    try {
      await Promise.all(
        ids.map((studentId) =>
          apiFetch("/admin/assign", {
            method: "POST",
            body: JSON.stringify({ supervisor_id: supId, student_id: studentId }),
          })
        )
      );

      await loadAssigned(supId);
      setSelectedStuIds(new Set());
      setOk(`Assigned ${ids.length} student(s).`);
    } catch (e: any) {
      setErr(e.message || "Failed to assign selected students");
    } finally {
      setSaving(false);
    }
  }

  async function removeStudent(studentId: number) {
    if (!selectedSup) return;
    setErr("");
    setOk("");
    try {
      await apiFetch("/admin/assign/remove", {
        method: "POST",
        body: JSON.stringify({ supervisor_id: selectedSup.id, student_id: studentId }),
      });
      await loadAssigned(selectedSup.id);
    } catch (e: any) {
      setErr(e.message || "Failed to unassign");
    }
  }

  const addDisabled = !selectedSup || selectedStuIds.size === 0 || saving;

  return (
    <AdminLayout
      active="assign"
      title="Assign students"
      subtitle="Select a supervisor, then assign multiple students at once."
      right={
        <button
          className={cn(
            "h-11 rounded-[14px] px-4 font-black text-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]",
            "bg-gradient-to-br from-[#6d5efc] to-[#9a8cff]",
            "disabled:cursor-not-allowed disabled:opacity-70"
          )}
          disabled={addDisabled}
          onClick={addSelected}
        >
          {saving ? "Adding..." : `Add Selected (${selectedStuIds.size})`}
        </button>
      }
    >
      <div className="w-full">
        {err && (
          <div className="mb-3 rounded-[14px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-slate-800">
            {err}
          </div>
        )}
        {ok && (
          <div className="mb-3 rounded-[14px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-slate-800">
            {ok}
          </div>
        )}

        {/* 3 columns, fixed viewport height; each column scrolls */}
        <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-3 xl:grid-cols-[360px_1fr_1fr]">
          {/* ============== Column 1: Supervisors ============== */}
<section className="min-h-0 flex flex-col rounded-[18px] border border-slate-200/70 bg-white/75 p-3 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur">            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <div className="text-[16px] font-black text-slate-900">Supervisors</div>
                <div className="mt-1 text-[12px] font-bold text-slate-500">
                  {supervisors.length} total
                </div>
              </div>
            </div>

            <input
              className="mb-2 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-[13px] font-semibold text-slate-900 outline-none focus:border-[#6d5efc]/40 focus:ring-4 focus:ring-[#6d5efc]/10"
              placeholder="Search supervisors by name/email..."
              value={supQ}
              onChange={(e) => setSupQ(e.target.value)}
            />

            {!selectedSup ? (
              <div className="mb-2 rounded-[14px] border border-[#6d5efc]/20 bg-[#6d5efc]/10 px-3 py-2 text-[13px] font-bold text-slate-700">
                No supervisor selected. Pick one to view assignments.
              </div>
            ) : (
              <div className="mb-2 rounded-[14px] border border-[#6d5efc]/25 bg-[#6d5efc]/10 px-3 py-2 text-[13px] font-extrabold text-slate-700">
                Selected: <b>{selectedSup.full_name}</b>
              </div>
            )}

<div className="mt-2 flex-1 min-h-0 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
                {visibleSupervisors.map((s) => {
                const active = selectedSup?.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSup(s)}
                    className={cn(
                      "w-full rounded-2xl border px-3 py-2.5 text-left transition",
                      "flex items-center gap-3 bg-white/80",
                      "hover:-translate-y-[1px] hover:border-[#6d5efc]/25 hover:shadow-[0_10px_22px_rgba(109,94,252,0.10)]",
                      active
                        ? "border-[#6d5efc]/40 bg-[#6d5efc]/10 shadow-[0_12px_26px_rgba(109,94,252,0.12)]"
                        : "border-slate-200/70"
                    )}
                  >
                    <div className="grid h-11 w-11 flex-none place-items-center rounded-full border border-slate-200 bg-slate-50 font-black text-slate-800">
                      {initialsOf(s.full_name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-black text-slate-900">
                        {s.full_name}
                      </div>
                      <div className="mt-1 flex min-w-0 items-center gap-2">
                        <span className="inline-flex h-7 flex-none items-center gap-2 rounded-full border border-[#6d5efc]/25 bg-[#6d5efc]/10 px-2.5 text-[12px] font-black text-slate-900">
                          <span className="text-slate-900">
                            <RoleIcon role="supervisor" />
                          </span>
                          supervisor
                        </span>
                        <span className="min-w-0 truncate text-[12.5px] font-bold text-slate-500">
                          {s.email}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {visibleSupervisors.length === 0 && (
                <div className="rounded-[14px] border border-dashed border-slate-200 bg-white/70 px-3 py-2 text-[13px] font-bold text-slate-500">
                  No supervisors found.
                </div>
              )}
            </div>
          </section>

          {/* ============== Column 2: Available Students ============== */}
<section className="min-h-0 flex flex-col rounded-[18px] border border-slate-200/70 bg-white/75 p-3 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur">            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <div className="text-[16px] font-black text-slate-900">Available students</div>
                <div className="mt-1 text-[12px] font-bold text-slate-500">
                  Select students, then Add Selected.
                </div>
              </div>

              <div className="flex items-center gap-2">
          <button
  className={cn(
    "h-9 rounded-[10px] border px-4 text-[12.5px] font-semibold whitespace-nowrap",
    "bg-white/90 text-slate-800 shadow-sm",
    "hover:border-[#6d5efc]/25 hover:shadow-[0_10px_18px_rgba(15,23,42,0.08)]",
    "disabled:cursor-not-allowed disabled:opacity-60"
  )}
                  type="button"
                  onClick={selectAllVisible}
                  disabled={!selectedSup || visibleStudents.length === 0}
                >
                  Select all
                </button>
                <button
                  className={cn(
                    "h-9 rounded-[10px] border px-3 text-[12.5px] font-black",
                    "bg-white/90 text-slate-800 shadow-sm",
                    "hover:border-[#6d5efc]/25 hover:shadow-[0_10px_18px_rgba(15,23,42,0.08)]",
                    "disabled:cursor-not-allowed disabled:opacity-60"
                  )}
                  type="button"
                  onClick={clearSelected}
                  disabled={selectedStuIds.size === 0}
                >
                  Clear
                </button>
              </div>
            </div>

            <input
              className={cn(
                "mb-2 w-full rounded-xl border bg-white/90 px-3 py-2.5 text-[13px] font-semibold text-slate-900 outline-none",
                "focus:border-[#6d5efc]/40 focus:ring-4 focus:ring-[#6d5efc]/10",
                !selectedSup && "cursor-not-allowed opacity-60"
              )}
              placeholder="Search students by name/email..."
              value={stuQ}
              onChange={(e) => setStuQ(e.target.value)}
              disabled={!selectedSup}
            />

            {!selectedSup ? (
              <div className="rounded-[14px] border border-[#6d5efc]/20 bg-[#6d5efc]/10 px-3 py-2 text-[13px] font-bold text-slate-700">
                Select a supervisor first to enable student selection.
              </div>
            ) : (
<div className="mt-2 flex-1 min-h-0 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">    
              {visibleStudents.map((s) => {
                  const checked = selectedStuIds.has(s.id);
                  return (
                    <label
                      key={s.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 transition",
                        checked
                          ? "border-emerald-300/60 bg-emerald-50/50 shadow-[0_10px_22px_rgba(16,185,129,0.08)]"
                          : "border-slate-200/70 bg-white/80 hover:-translate-y-[1px] hover:border-slate-300/70 hover:shadow-[0_10px_18px_rgba(15,23,42,0.08)]"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStudent(s.id)}
                        className="h-4 w-4"
                      />

                      <div className="grid h-10 w-10 flex-none place-items-center rounded-full border border-slate-200 bg-slate-50 font-black text-slate-800">
                        {initialsOf(s.full_name)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-black text-slate-900">
                          {s.full_name}
                        </div>
                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          <span className="inline-flex h-7 flex-none items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-50 px-2.5 text-[12px] font-black text-slate-900">
                            <span className="text-slate-900">
                              <RoleIcon role="student" />
                            </span>
                            student
                          </span>
                          <span className="min-w-0 truncate text-[12.5px] font-bold text-slate-500">
                            {s.email}
                          </span>
                        </div>
                      </div>
                    </label>
                  );
                })}

                {visibleStudents.length === 0 && (
                  <div className="rounded-[14px] border border-dashed border-slate-200 bg-white/70 px-3 py-2 text-[13px] font-bold text-slate-500">
                    No available students.
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ============== Column 3: Assigned Students ============== */}
<section className="min-h-0 flex flex-col rounded-[18px] border border-slate-200/70 bg-white/75 p-3 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur">            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <div className="text-[16px] font-black text-slate-900">Assigned</div>
                <div className="mt-1 text-[12px] font-bold text-slate-500">
                  {selectedSup ? `Assigned to ${selectedSup.full_name}` : "Select supervisor to view assigned"}
                </div>
              </div>

              {selectedSup && (
                <span className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 text-[12px] font-black text-slate-600">
                  {assigned.length}
                </span>
              )}
            </div>

            {!selectedSup ? (
              <div className="rounded-[14px] border border-[#6d5efc]/20 bg-[#6d5efc]/10 px-3 py-2 text-[13px] font-bold text-slate-700">
                Pick a supervisor first.
              </div>
            ) : loadingAssigned ? (
              <div className="rounded-[14px] border border-[#6d5efc]/20 bg-[#6d5efc]/10 px-3 py-2 text-[13px] font-bold text-slate-700">
                Loading...
              </div>
            ) : (
<div className="mt-2 flex-1 min-h-0 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
                  {assigned.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/80 px-3 py-2.5"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="grid h-10 w-10 flex-none place-items-center rounded-full border border-slate-200 bg-slate-50 font-black text-slate-800">
                        {initialsOf(s.full_name)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-black text-slate-900">
                          {s.full_name}
                        </div>
                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          <span className="inline-flex h-7 flex-none items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-50 px-2.5 text-[12px] font-black text-slate-900">
                            <span className="text-slate-900">
                              <RoleIcon role="student" />
                            </span>
                            student
                          </span>
                          <span className="min-w-0 truncate text-[12.5px] font-bold text-slate-500">
                            {s.email}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      className={cn(
                        "h-9 rounded-[10px] border px-3 text-[12.5px] font-black",
                        "border-red-300/60 bg-red-50 text-red-800",
                        "hover:border-red-400/70 hover:shadow-[0_10px_18px_rgba(239,68,68,0.10)]"
                      )}
                      type="button"
                      onClick={() => removeStudent(s.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {assigned.length === 0 && (
                  <div className="rounded-[14px] border border-dashed border-slate-200 bg-white/70 px-3 py-2 text-[13px] font-bold text-slate-500">
                    No students assigned yet.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}