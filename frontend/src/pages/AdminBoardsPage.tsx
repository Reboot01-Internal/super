import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function clampText(s: string, fallback: string) {
  const t = (s ?? "").trim();
  return t ? t : fallback;
}

/* icons */
function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.9"
      />
      <path
        d="M21 21l-4.35-4.35"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BoardIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-13Z"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.9"
      />
      <path
        d="M8 8h8M8 12h8M8 16h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

function LayersIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3 2 8l10 5 10-5-10-5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <path
        d="M2 12l10 5 10-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <path
        d="M2 16l10 5 10-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.5"
      />
    </svg>
  );
}

function CardStackIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 7.5A2.5 2.5 0 0 1 9.5 5h9A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-9A2.5 2.5 0 0 1 7 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.9"
      />
      <path
        d="M3 8v9A3 3 0 0 0 6 20h9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

function UserIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 12a4.2 4.2 0 1 0-4.2-4.2A4.2 4.2 0 0 0 12 12Z"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.9"
      />
      <path
        d="M4.5 21a7.5 7.5 0 0 1 15 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

function ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 18l6-6-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <span
      className="
        inline-flex items-center gap-3
        rounded-2xl border border-[#6d5efc]/20
        bg-white shadow-[0_12px_26px_rgba(15,23,42,0.06)]
        px-3 py-2
      "
      title={label}
    >
      <span
        className="
          grid place-items-center
          h-9 w-9 rounded-2xl
          border border-[#6d5efc]/20 bg-[#6d5efc]/10 text-[#6d5efc]
        "
      >
        {icon}
      </span>

      <span className="flex flex-col leading-[1.05]">
        <span className="text-[14px] font-black text-slate-900/90">{value}</span>
        <span className="text-[12px] font-extrabold text-slate-900/50">{label}</span>
      </span>
    </span>
  );
}

function SkeletonCard() {
  return (
    <div
      className="
        relative overflow-hidden
        rounded-[18px] border border-slate-900/10
        bg-white/95 shadow-[0_14px_34px_rgba(15,23,42,0.07)]
        p-4
      "
    >
      <div className="space-y-3">
        <div className="h-3 w-3/5 rounded-full bg-slate-900/10 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-[60%] animate-[shimmer_1.2s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        </div>
        <div className="h-3 w-2/5 rounded-full bg-slate-900/10 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-[60%] animate-[shimmer_1.2s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        </div>

        <div className="h-3 w-[85%] rounded-full bg-slate-900/10 relative overflow-hidden mt-3">
          <div className="absolute inset-0 -translate-x-[60%] animate-[shimmer_1.2s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        </div>
        <div className="h-3 w-[70%] rounded-full bg-slate-900/10 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-[60%] animate-[shimmer_1.2s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        </div>

        <div className="mt-4 flex gap-3">
          <div className="h-[30px] w-[92px] rounded-full bg-slate-900/10 relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-[60%] animate-[shimmer_1.2s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          </div>
          <div className="h-[30px] w-[92px] rounded-full bg-slate-900/10 relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-[60%] animate-[shimmer_1.2s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          </div>
        </div>
      </div>

      {/* keyframes for shimmer (Tailwind arbitrary) */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-60%); }
          100% { transform: translateX(160%); }
        }
      `}</style>
    </div>
  );
}

export default function AdminBoardsPage() {
  const nav = useNavigate();
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await apiFetch("/admin/all-boards");
      setBoards(Array.isArray(res) ? res : []);
      if (!Array.isArray(res)) console.error("Unexpected response:", res);
    } catch (e: any) {
      console.error(e);
      setBoards([]);
      setErr(e?.message || "Failed to load boards");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return boards;

    return boards.filter((b) => {
      const name = (b.name ?? "").toLowerCase();
      const sup = (b.supervisor_name ?? "").toLowerCase();
      const desc = (b.description ?? "").toLowerCase();
      return name.includes(q) || sup.includes(q) || desc.includes(q);
    });
  }, [boards, search]);

  const totals = useMemo(() => {
    const totalBoards = boards.length;
    const totalLists = boards.reduce((acc, b) => acc + (b.lists_count || 0), 0);
    const totalCards = boards.reduce((acc, b) => acc + (b.cards_count || 0), 0);
    return { totalBoards, totalLists, totalCards };
  }, [boards]);

  return (
    <AdminLayout active="boards" title="Boards" subtitle="All boards across supervisors">
      <div className="w-full">
        {/* Toolbar */}
        <div className="mb-4 flex items-start justify-between gap-3 max-[1020px]:flex-col">
          {/* Search */}
          <div
            className="
              flex-1 min-w-[340px] flex items-center gap-2.5
              rounded-2xl border border-slate-900/10
              bg-white/92 shadow-[0_10px_26px_rgba(15,23,42,0.06)]
              px-3 py-2.5
              focus-within:border-[#6d5efc]/30 focus-within:ring-4 focus-within:ring-[#6d5efc]/12
              max-[1020px]:min-w-0
            "
          >
            <span
              className="
                grid place-items-center h-9 w-9 rounded-xl
                border border-slate-900/10 bg-slate-900/3 text-slate-900/55
              "
              aria-hidden="true"
            >
              <SearchIcon />
            </span>

            <input
              className="
                flex-1 bg-transparent outline-none
                text-[14px] font-extrabold text-slate-900/90
                placeholder:text-slate-900/40 placeholder:font-bold
              "
              placeholder="Search boards, supervisors, or descriptions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {search.trim() && (
              <button
                className="
                  h-9 px-3 rounded-xl
                  border border-slate-900/12 bg-white/90
                  font-black text-slate-900/70
                  transition
                  hover:-translate-y-[1px]
                  hover:border-slate-900/18
                  hover:shadow-[0_10px_18px_rgba(15,23,42,0.08)]
                "
                type="button"
                onClick={() => setSearch("")}
              >
                Clear
              </button>
            )}
          </div>

          {/* KPIs */}
          <div className="flex flex-wrap justify-end gap-2.5">
            <StatPill icon={<BoardIcon />} label="Boards" value={totals.totalBoards} />
            <StatPill icon={<LayersIcon />} label="Lists" value={totals.totalLists} />
            <StatPill icon={<CardStackIcon />} label="Cards" value={totals.totalCards} />
          </div>
        </div>

        {err && (
          <div
            className="
              mb-3 rounded-2xl border
              border-red-500/25 bg-red-500/5
              px-3 py-2 text-[13px]
            "
          >
            {err}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-3 max-[1200px]:grid-cols-2 max-[780px]:grid-cols-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="
              grid gap-2
              rounded-[18px] border border-dashed border-slate-900/16
              bg-white/75 px-5 py-5
            "
          >
            <div
              className="
                grid place-items-center
                h-11 w-11 rounded-2xl
                border border-slate-900/10 bg-slate-900/3 text-slate-900/70
              "
            >
              <BoardIcon size={22} />
            </div>
            <div className="text-[16px] font-black text-slate-900/90">No boards found</div>
            <div className="text-[13px] font-extrabold text-slate-900/58">
              Try searching by <b>board name</b> or <b>supervisor</b>.
            </div>

            {search.trim() && (
              <button
                className="
                  mt-2 inline-flex h-11 items-center justify-center
                  rounded-2xl px-4 font-black text-white
                  bg-gradient-to-br from-violet-600 to-violet-400
                  shadow-[0_18px_45px_rgba(15,23,42,0.08)]
                  hover:opacity-95
                "
                onClick={() => setSearch("")}
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 max-[1200px]:grid-cols-2 max-[780px]:grid-cols-1">
            {filtered.map((b) => {
              const desc = clampText(b.description, "No description provided.");
              const sup = clampText(b.supervisor_name, "Unknown supervisor");

              return (
                <div
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => nav(`/admin/boards/${b.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      nav(`/admin/boards/${b.id}`);
                    }
                  }}
                  className="
                    group relative cursor-pointer
                    rounded-[18px] border border-slate-900/10
                    bg-white/95 shadow-[0_14px_34px_rgba(15,23,42,0.07)]
                    p-4 pt-5
                    transition
                    hover:-translate-y-[2px]
                    hover:border-[#6d5efc]/25
                    hover:shadow-[0_20px_44px_rgba(15,23,42,0.10)]
                    focus-visible:outline-none
                    focus-visible:ring-4 focus-visible:ring-[#6d5efc]/15
                  "
                >
                  {/* Top */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="
                          grid place-items-center
                          h-10 w-10 rounded-2xl
                          border border-[#6d5efc]/20 bg-[#6d5efc]/10 text-[#6d5efc]
                          flex-none
                        "
                        aria-hidden="true"
                      >
                        <BoardIcon />
                      </span>

                      <div className="min-w-0">
                        <div
                          className="truncate text-[16px] font-black text-slate-900/92"
                          title={b.name}
                        >
                          {b.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className="
                          inline-flex items-center gap-2
                          h-[30px] px-3 rounded-full
                          border border-[#6d5efc]/20 bg-[#6d5efc]/10
                          text-[12px] font-black text-slate-900/65
                        "
                        title="Supervisor"
                      >
                        <UserIcon />
                        {sup}
                      </span>
                      <span
                        className="
                          inline-flex items-center
                          h-[30px] px-3 rounded-full
                          border border-slate-200 bg-slate-50
                          text-[12px] font-black text-slate-900/65
                        "
                        title="Created"
                      >
                        {formatDate(b.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Desc */}
                  <div
                    className="
                      mt-3 text-[13px] font-extrabold text-slate-900/60 leading-[1.45]
                      overflow-hidden
                    "
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 3 as any,
                      WebkitBoxOrient: "vertical" as any,
                      minHeight: 56,
                    }}
                  >
                    {desc}
                  </div>

                  {/* Bottom */}
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className="
                          inline-flex items-center gap-2
                          h-[30px] px-3 rounded-full
                          border border-slate-200 bg-slate-50
                          text-[12px] font-extrabold text-slate-900/70
                        "
                      >
                        <LayersIcon />
                        <b className="font-black text-slate-900/92">{b.lists_count}</b> Lists
                      </span>

                      <span
                        className="
                          inline-flex items-center gap-2
                          h-[30px] px-3 rounded-full
                          border border-slate-200 bg-slate-50
                          text-[12px] font-extrabold text-slate-900/70
                        "
                      >
                        <CardStackIcon />
                        <b className="font-black text-slate-900/92">{b.cards_count}</b> Cards
                      </span>
                    </div>

                    <div
                      className="
                        inline-flex items-center gap-2
                        text-[12px] font-black text-slate-900/62
                        transition
                        group-hover:translate-x-[2px]
                        group-hover:text-[#6d5efc]
                      "
                    >
                      Open board <ArrowIcon />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
