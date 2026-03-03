import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { apiFetch } from "../lib/api";
import "../admin.css";

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
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
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
    <span className="boardStatPill" title={label}>
      <span className="boardStatIcon">{icon}</span>
      <span className="boardStatText">
        <span className="boardStatValue">{value}</span>
        <span className="boardStatLabel">{label}</span>
      </span>
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="boardCard boardCardSkeleton">
      <div className="boardCardTop">
        <div className="skLine skW60" />
        <div className="skLine skW40" />
      </div>
      <div className="skLine skW85" style={{ marginTop: 12 }} />
      <div className="skLine skW70" />
      <div className="boardCardBottom" style={{ marginTop: 14 }}>
        <div className="skPill" />
        <div className="skPill" />
      </div>
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
    <AdminLayout
      active="boards"
      title="Boards"
      subtitle="All boards across supervisors"
      right={
        <button className="admPrimaryBtn" onClick={load} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      <div className="admPageWrap">
        {/* Top toolbar */}
        <div className="boardsToolbar">
          <div className="boardsSearch">
            <span className="boardsSearchIcon" aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              className="boardsSearchInput"
              placeholder="Search boards, supervisors, or descriptions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search.trim() && (
              <button className="boardsClearBtn" type="button" onClick={() => setSearch("")}>
                Clear
              </button>
            )}
          </div>

          <div className="boardsKpis">
            <StatPill icon={<BoardIcon />} label="Boards" value={totals.totalBoards} />
            <StatPill icon={<LayersIcon />} label="Lists" value={totals.totalLists} />
            <StatPill icon={<CardStackIcon />} label="Cards" value={totals.totalCards} />
          </div>
        </div>

        {err && (
          <div className="admAlert admAlertBad" style={{ marginBottom: 12 }}>
            {err}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="boardsGrid">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="boardsEmpty">
            <div className="boardsEmptyIcon">
              <BoardIcon size={22} />
            </div>
            <div className="boardsEmptyTitle">No boards found</div>
            <div className="boardsEmptyHint">
              Try searching by <b>board name</b> or <b>supervisor</b>.
            </div>
            {search.trim() && (
              <button className="admPrimaryBtn" onClick={() => setSearch("")}>
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="boardsGrid">
            {filtered.map((b, idx) => {
              const desc = clampText(b.description, "No description provided.");
              const sup = clampText(b.supervisor_name, "Unknown supervisor");

              return (
                <div
                  key={b.id}
                  className="boardCard"
                  style={{ animationDelay: `${Math.min(idx, 10) * 35}ms` }}
                  onClick={() => nav(`/admin/boards/${b.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      nav(`/admin/boards/${b.id}`);
                    }
                  }}
                >
                  <div className="boardCardGlow" aria-hidden="true" />

                  <div className="boardCardTop">
                    <div className="boardCardTitleRow">
                      <span className="boardCardIcon" aria-hidden="true">
                        <BoardIcon />
                      </span>
                      <div className="boardCardTitle" title={b.name}>
                        {b.name}
                      </div>
                    </div>

                    <div className="boardCardMeta">
                      <span className="boardMetaChip" title="Supervisor">
                        <UserIcon />
                        {sup}
                      </span>
                      <span className="boardMetaChip" title="Created">
                        {formatDate(b.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="boardCardDesc">{desc}</div>

                  <div className="boardCardBottom">
                    <div className="boardStatsRow">
                      <span className="boardMiniStat">
                        <LayersIcon />
                        <b>{b.lists_count}</b>&nbsp;Lists
                      </span>
                      <span className="boardMiniStat">
                        <CardStackIcon />
                        <b>{b.cards_count}</b>&nbsp;Cards
                      </span>
                    </div>

                    <div className="boardOpenHint">
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