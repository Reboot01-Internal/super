import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { apiFetch } from "../lib/api";

type BoardRow = {
  id: number;
  name: string;
  description: string;
  supervisor_name: string;
  created_at: string;
  lists_count: number;
  cards_count: number;
};

type BoardFull = {
  board_id: number;
  name: string;
  lists: { id: number; title: string }[];
  cards: {
    id: number;
    title: string;
    status: string;
    priority: string;
    due_date: string;
    list_id: number;
  }[];
};

type UserRow = {
  id: number;
  full_name: string;
  role: "student" | "supervisor";
};

type SupervisorRow = {
  supervisor_user_id: number;
  full_name: string;
};

type OverdueCard = {
  boardID: number;
  boardName: string;
  supervisor: string;
  cardID: number;
  cardTitle: string;
  dueDate: string;
  daysOverdue: number;
  priority: string;
};

type SupervisorStats = {
  supervisor: string;
  boards: number;
  cards: number;
  done: number;
  overdue: number;
  completionPct: number;
};

function toDateOnly(v: string) {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date) {
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function formatDate(v: string) {
  const d = toDateOnly(v);
  if (!d) return "No date";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function normalizePriority(v: string) {
  const p = String(v || "").trim().toLowerCase();
  if (p === "urgent" || p === "high" || p === "medium" || p === "low") return p;
  return "medium";
}

export default function AdminReportsPage() {
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [supervisors, setSupervisors] = useState<SupervisorRow[]>([]);
  const [boardDetails, setBoardDetails] = useState<Record<number, BoardFull>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const [boardsRes, usersRes, supsRes] = await Promise.all([
        apiFetch("/admin/all-boards"),
        apiFetch("/admin/users?role=all&q="),
        apiFetch("/admin/supervisors"),
      ]);

      const boardRows: BoardRow[] = Array.isArray(boardsRes) ? boardsRes : [];
      setBoards(boardRows);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setSupervisors(Array.isArray(supsRes) ? supsRes : []);

      const fullRes = await Promise.all(
        boardRows.map(async (b) => {
          const full = await apiFetch(`/admin/board?board_id=${b.id}`);
          return [b.id, full] as const;
        })
      );
      const nextDetails: Record<number, BoardFull> = {};
      for (const [id, full] of fullRes) nextDetails[id] = full;
      setBoardDetails(nextDetails);
    } catch (e: any) {
      setErr(e?.message || "Failed to load reports data");
      setBoards([]);
      setUsers([]);
      setSupervisors([]);
      setBoardDetails({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const analytics = useMemo(() => {
    const allCards = boards.flatMap((b) => boardDetails[b.id]?.cards || []);
    const allLists = boards.flatMap((b) => boardDetails[b.id]?.lists || []);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let done = 0;
    let open = 0;
    const overdueCards: OverdueCard[] = [];
    const priority = { urgent: 0, high: 0, medium: 0, low: 0 };

    for (const board of boards) {
      const cards = boardDetails[board.id]?.cards || [];
      for (const c of cards) {
        const status = String(c.status || "").toLowerCase();
        if (status === "done") done += 1;
        else open += 1;
        priority[normalizePriority(c.priority)] += 1;

        const due = toDateOnly(c.due_date);
        if (due && status !== "done" && due < today) {
          overdueCards.push({
            boardID: board.id,
            boardName: board.name,
            supervisor: board.supervisor_name,
            cardID: c.id,
            cardTitle: c.title,
            dueDate: c.due_date,
            daysOverdue: Math.max(1, daysBetween(today, due)),
            priority: normalizePriority(c.priority),
          });
        }
      }
    }

    const supervisorStatsMap = new Map<string, SupervisorStats>();
    for (const board of boards) {
      const key = board.supervisor_name || "Unknown";
      if (!supervisorStatsMap.has(key)) {
        supervisorStatsMap.set(key, {
          supervisor: key,
          boards: 0,
          cards: 0,
          done: 0,
          overdue: 0,
          completionPct: 0,
        });
      }
      const row = supervisorStatsMap.get(key)!;
      row.boards += 1;
      const cards = boardDetails[board.id]?.cards || [];
      row.cards += cards.length;
      for (const c of cards) {
        const status = String(c.status || "").toLowerCase();
        if (status === "done") row.done += 1;
        const due = toDateOnly(c.due_date);
        if (due && status !== "done" && due < today) row.overdue += 1;
      }
    }

    const supervisorStats = [...supervisorStatsMap.values()]
      .map((s) => ({
        ...s,
        completionPct: s.cards > 0 ? Math.round((s.done / s.cards) * 100) : 0,
      }))
      .sort((a, b) => b.overdue - a.overdue || b.cards - a.cards);

    const students = users.filter((u) => u.role === "student").length;
    const supervisorsCount = users.filter((u) => u.role === "supervisor").length || supervisors.length;
    const cardsTotal = allCards.length;
    const listsTotal = allLists.length;
    const completionPct = cardsTotal > 0 ? Math.round((done / cardsTotal) * 100) : 0;

    const lowActivityBoards = boards
      .map((b) => {
        const cards = boardDetails[b.id]?.cards || [];
        const activeCards = cards.filter((c) => String(c.status || "").toLowerCase() !== "done").length;
        return {
          ...b,
          activeCards,
          cardsTotal: cards.length,
        };
      })
      .sort((a, b) => a.activeCards - b.activeCards || a.cardsTotal - b.cardsTotal)
      .slice(0, 5);

    overdueCards.sort((a, b) => b.daysOverdue - a.daysOverdue || (b.priority === "urgent" ? 1 : 0));

    return {
      boardsTotal: boards.length,
      listsTotal,
      cardsTotal,
      done,
      open,
      overdue: overdueCards.length,
      completionPct,
      students,
      supervisors: supervisorsCount,
      priority,
      overdueCards: overdueCards.slice(0, 8),
      supervisorStats: supervisorStats.slice(0, 8),
      lowActivityBoards,
    };
  }, [boards, boardDetails, users, supervisors.length]);

  return (
    <AdminLayout
      active="reports"
      title="Reports"
      subtitle="Actionable workspace insights for planning, risks, and supervisor workload."
      right={
        <button
          type="button"
          onClick={load}
          className="h-10 rounded-[14px] border border-slate-200 bg-slate-50 px-3 font-extrabold text-slate-900 transition hover:border-[#6d5efc]/25 hover:bg-[#f2f5ff]"
        >
          Refresh
        </button>
      }
    >
      {err ? (
        <div className="mb-3 rounded-[14px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700">
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[18px] border border-slate-200 bg-white p-4 text-[14px] font-semibold text-slate-500">
          Building reports...
        </div>
      ) : (
        <div className="grid gap-3">
          <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi label="Boards" value={analytics.boardsTotal} />
            <Kpi label="Lists" value={analytics.listsTotal} />
            <Kpi label="Cards" value={analytics.cardsTotal} />
            <Kpi label="Completion" value={`${analytics.completionPct}%`} tone="good" />
            <Kpi label="Overdue" value={analytics.overdue} tone={analytics.overdue > 0 ? "danger" : "good"} />
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
              <div className="mb-2 text-[18px] font-black text-slate-900">Status Snapshot</div>
              <div className="mb-2 flex items-center justify-between text-[13px] font-semibold text-slate-600">
                <span>{analytics.done} done</span>
                <span>{analytics.open} open</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#6d5efc] to-[#8f83ff]"
                  style={{ width: `${analytics.completionPct}%` }}
                />
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Mini label="Supervisors" value={analytics.supervisors} />
                <Mini label="Students" value={analytics.students} />
              </div>
            </div>

            <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
              <div className="mb-2 text-[18px] font-black text-slate-900">Priority Distribution</div>
              <div className="grid gap-2">
                <PriorityRow label="Urgent" value={analytics.priority.urgent} tone="urgent" />
                <PriorityRow label="High" value={analytics.priority.high} tone="high" />
                <PriorityRow label="Medium" value={analytics.priority.medium} tone="medium" />
                <PriorityRow label="Low" value={analytics.priority.low} tone="low" />
              </div>
            </div>
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-[18px] font-black text-slate-900">Overdue Risk</div>
                <span className="inline-flex h-7 items-center rounded-full border border-red-200 bg-red-50 px-2.5 text-[11px] font-black text-red-700">
                  {analytics.overdue} overdue
                </span>
              </div>
              <div className="space-y-2">
                {analytics.overdueCards.length === 0 ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] font-semibold text-emerald-700">
                    No overdue cards right now.
                  </div>
                ) : (
                  analytics.overdueCards.map((c) => (
                    <div key={c.cardID} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="truncate text-[13px] font-black text-slate-900">{c.cardTitle}</div>
                      <div className="mt-0.5 truncate text-[12px] font-semibold text-slate-600">
                        {c.boardName} • {c.supervisor}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] font-extrabold">
                        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-red-700">
                          {c.daysOverdue}d overdue
                        </span>
                        <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-slate-700">
                          {formatDate(c.dueDate)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
              <div className="mb-2 text-[18px] font-black text-slate-900">Supervisor Workload</div>
              <div className="space-y-2">
                {analytics.supervisorStats.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-semibold text-slate-600">
                    No supervisor data yet.
                  </div>
                ) : (
                  analytics.supervisorStats.map((s) => (
                    <div key={s.supervisor} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="truncate text-[13px] font-black text-slate-900">{s.supervisor}</div>
                      <div className="mt-1 grid grid-cols-4 gap-1 text-[11px] font-extrabold text-slate-700">
                        <span>{s.boards} boards</span>
                        <span>{s.cards} cards</span>
                        <span>{s.done} done</span>
                        <span className={s.overdue > 0 ? "text-red-600" : "text-slate-700"}>
                          {s.overdue} overdue
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#6d5efc] to-[#8f83ff]"
                          style={{ width: `${s.completionPct}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <div className="mb-2 text-[18px] font-black text-slate-900">Low Activity Boards</div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {analytics.lowActivityBoards.map((b) => (
                <div key={b.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="truncate text-[13px] font-black text-slate-900">{b.name}</div>
                  <div className="mt-0.5 truncate text-[12px] font-semibold text-slate-600">{b.supervisor_name}</div>
                  <div className="mt-1 text-[11px] font-extrabold text-slate-700">
                    {b.activeCards} active • {b.cardsTotal} total cards
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}

function Kpi({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "good" | "danger";
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "danger"
      ? "border-red-200 bg-red-50"
      : "border-slate-200 bg-white";

  return (
    <div className={`rounded-[14px] border p-3 ${toneClass} shadow-[0_10px_28px_rgba(15,23,42,0.05)]`}>
      <div className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-1 text-[24px] font-black tracking-[-0.02em] text-slate-900">{value}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-1 text-[18px] font-black text-slate-900">{value}</div>
    </div>
  );
}

function PriorityRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "urgent" | "high" | "medium" | "low";
}) {
  const toneClass =
    tone === "urgent"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "high"
      ? "border-orange-200 bg-orange-50 text-orange-700"
      : tone === "medium"
      ? "border-[#6d5efc]/20 bg-[#6d5efc]/10 text-[#4f46e5]"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${toneClass}`}>
      <span className="text-[12px] font-black">{label}</span>
      <span className="text-[12px] font-black">{value}</span>
    </div>
  );
}
