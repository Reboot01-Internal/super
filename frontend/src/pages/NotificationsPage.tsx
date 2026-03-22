import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";

type NotificationRow = {
  id: number;
  user_id: number;
  user_name: string;
  user_login: string;
  kind: string;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  created_at: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function kindLabel(kind: string) {
  return kind.replaceAll("_", " ");
}

function kindTone(kind: string) {
  if (kind.includes("reminder")) {
    return {
      dot: "bg-amber-500",
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      icon: "border-amber-200 bg-amber-50 text-amber-700",
      row: "hover:border-amber-200/80 hover:bg-amber-50/30",
    };
  }
  if (kind.includes("status")) {
    return {
      dot: "bg-emerald-500",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: "border-emerald-200 bg-emerald-50 text-emerald-700",
      row: "hover:border-emerald-200/80 hover:bg-emerald-50/30",
    };
  }
  return {
    dot: "bg-sky-500",
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    icon: "border-sky-200 bg-sky-50 text-sky-700",
    row: "hover:border-sky-200/80 hover:bg-sky-50/30",
  };
}

export default function NotificationsPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [feedFilter, setFeedFilter] = useState<"all" | "unread">("all");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const path = isAdmin && scope === "all" ? "/admin/notifications?scope=all" : "/admin/notifications";
      const res = await apiFetch(path);
      setItems(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load notifications");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [scope, isAdmin]);

  const unreadCount = useMemo(() => items.filter((item) => !item.is_read).length, [items]);
  const readCount = items.length - unreadCount;
  const latestItem = items[0] || null;
  const visibleItems = useMemo(
    () => (feedFilter === "unread" ? items.filter((item) => !item.is_read) : items),
    [feedFilter, items]
  );

  async function markRead(id: number) {
    if (isAdmin && scope === "all") return;
    try {
      await apiFetch("/admin/notifications/read", {
        method: "POST",
        body: JSON.stringify({ notification_id: id }),
      });
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
    } catch (e: any) {
      setError(e?.message || "Failed to mark notification");
    }
  }

  async function markAllRead() {
    if (isAdmin && scope === "all") return;
    try {
      await apiFetch("/admin/notifications/read-all", { method: "POST" });
      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
    } catch (e: any) {
      setError(e?.message || "Failed to mark all notifications");
    }
  }

  return (
    <AdminLayout
      active={isAdmin ? "notifications" : "boards"}
      title="Notifications"
      subtitle="Meeting reminders, schedule changes, and updates in one place."
    >
      {error ? (
        <div className="mb-5 rounded-[18px] border border-red-200 bg-[linear-gradient(180deg,#fff5f5,#fff0f0)] px-4 py-3 text-[13px] font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#fbfcfe)] p-4 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                {scope === "all" ? "Admin feed" : "Personal inbox"}
              </div>
              <div className="mt-1 text-[16px] font-black tracking-[-0.02em] text-slate-900">
                {scope === "all" ? "All team notifications" : "Your notifications"}
              </div>
              <div className="mt-1 text-[12px] font-semibold text-slate-500">
                {scope === "all"
                  ? "Read-only view of student and supervisor updates."
                  : "Reminders, reschedules, and meeting updates for your boards."}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isAdmin ? (
                <div className="inline-flex rounded-[14px] border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setScope("mine")}
                    className={`rounded-[10px] px-3 py-1.5 text-[12px] font-black transition ${scope === "mine" ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    Mine
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope("all")}
                    className={`rounded-[10px] px-3 py-1.5 text-[12px] font-black transition ${scope === "all" ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    All
                  </button>
                </div>
              ) : null}
              <div className="inline-flex rounded-[14px] border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setFeedFilter("all")}
                  className={`rounded-[10px] px-3 py-1.5 text-[12px] font-black transition ${feedFilter === "all" ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]" : "text-slate-500 hover:text-slate-800"}`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFeedFilter("unread")}
                  className={`rounded-[10px] px-3 py-1.5 text-[12px] font-black transition ${feedFilter === "unread" ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Unread
                </button>
              </div>
              <button
                type="button"
                onClick={markAllRead}
                disabled={isAdmin && scope === "all"}
                className="h-9 rounded-[12px] border border-slate-200 bg-white px-3.5 text-[12px] font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mark all read
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <InlineStat label="Total" value={items.length} tone="slate" />
            <InlineStat label="Unread" value={unreadCount} tone="amber" />
            <InlineStat label="Read" value={readCount} tone="emerald" />
            {latestItem ? (
              <div className="min-w-0 flex-1 rounded-[16px] border border-slate-200 bg-white px-3 py-2">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Latest</div>
                <div className="truncate text-[12px] font-black text-slate-800">{latestItem.title}</div>
              </div>
            ) : null}
          </div>
        </div>

        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div className="text-[13px] font-black text-slate-900">
              {feedFilter === "unread" ? "Unread notifications" : "Recent notifications"}
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600">
              {visibleItems.length} items
            </div>
          </div>

          {loading ? (
            <div className="grid gap-2 px-4 py-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-[92px] animate-pulse rounded-[18px] border border-slate-200 bg-[linear-gradient(90deg,#f8fafc,#eef2f7,#f8fafc)]" />
              ))}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="grid min-h-[340px] place-items-center px-4 py-6">
              <div className="max-w-[420px] text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_55%),#ffffff] shadow-[0_18px_38px_rgba(15,23,42,0.08)]">
                  <svg viewBox="0 0 24 24" className="h-7 w-7 text-slate-500" fill="none" aria-hidden="true">
                    <path d="M15 17H5l1.4-1.4A2 2 0 0 0 7 14.2V10a5 5 0 1 1 10 0v4.2a2 2 0 0 0 .6 1.4L19 17h-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="mt-5 text-[20px] font-black text-slate-900">
                  {feedFilter === "unread" ? "No unread notifications" : "No notifications yet"}
                </div>
                <div className="mt-2 text-[13px] font-semibold leading-6 text-slate-500">
                  {isAdmin && scope === "all"
                    ? "When supervisors and students receive meeting reminders or schedule changes, they will appear here."
                    : "Meeting reminders, reschedules, and status updates will show up here as your boards become active."}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-3 py-2">
              {visibleItems.map((item) => (
                <NotificationCard
                  key={item.id}
                  item={item}
                  showRecipient={isAdmin && scope === "all"}
                  canMarkRead={!(isAdmin && scope === "all")}
                  onMarkRead={markRead}
                />
              ))}
            </div>
          )}
        </section>
      </section>
    </AdminLayout>
  );
}

function NotificationCard({
  item,
  showRecipient,
  canMarkRead,
  onMarkRead,
}: {
  item: NotificationRow;
  showRecipient: boolean;
  canMarkRead: boolean;
  onMarkRead: (id: number) => void;
}) {
  const tone = kindTone(item.kind);

  return (
    <article
      className={`group relative overflow-hidden rounded-[18px] border px-3.5 py-3 transition ${tone.row} ${
        item.is_read
          ? "border-transparent bg-transparent"
          : "border-slate-200 bg-[linear-gradient(180deg,#ffffff,#fffaf3)] shadow-[0_10px_24px_rgba(245,158,11,0.05)]"
      }`}
    >
      <div className={`absolute left-0 top-2.5 bottom-2.5 w-1 rounded-full ${tone.dot}`} />
      <div className="pl-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start gap-2.5">
              <div className={`mt-0.5 grid h-8 w-8 place-items-center rounded-[12px] border ${tone.icon}`}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                  <path d="M15 17H5l1.4-1.4A2 2 0 0 0 7 14.2V10a5 5 0 1 1 10 0v4.2a2 2 0 0 0 .6 1.4L19 17h-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-black tracking-[-0.01em] text-slate-900">{item.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-slate-500">
                  <span>{formatDate(item.created_at)}</span>
                  {showRecipient ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">
                      {(item.user_name || "Unknown user")}{item.user_login ? ` · @${item.user_login}` : ""}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${tone.badge}`}>
              {kindLabel(item.kind)}
            </span>
            {!item.is_read && canMarkRead ? (
              <button
                type="button"
                onClick={() => onMarkRead(item.id)}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Mark read
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-2.5 pr-2 text-[12px] font-semibold leading-6 text-slate-700">
          {item.body}
        </div>
      </div>
    </article>
  );
}

function InlineStat({ label, value, tone }: { label: string; value: number; tone: "slate" | "amber" | "emerald" }) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-[linear-gradient(180deg,#fff9ec,#fff3d8)] text-amber-700"
      : tone === "emerald"
        ? "border-emerald-200 bg-[linear-gradient(180deg,#f2fff8,#def7ea)] text-emerald-700"
        : "border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] text-slate-700";
  return (
    <div className={`rounded-[14px] border px-3 py-2 ${toneClass}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.14em]">{label}</div>
      <div className="mt-1 text-[17px] font-black tracking-[-0.03em]">{value}</div>
    </div>
  );
}
