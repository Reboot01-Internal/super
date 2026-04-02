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
      dot: "bg-slate-400",
      badge: "border-slate-200 bg-slate-50 text-slate-600",
      icon: "border-slate-200 bg-slate-50 text-slate-600",
      row: "hover:border-slate-200 hover:bg-slate-50/80",
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

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/admin/notifications");
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
  }, []);

  const unreadCount = useMemo(() => items.filter((item) => !item.is_read).length, [items]);
  const readCount = items.length - unreadCount;
  const latestItem = items[0] || null;
  async function markAllRead() {
    try {
      await apiFetch("/admin/notifications/read-all", { method: "POST" });
      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
    } catch (e: any) {
      setError(e?.message || "Failed to mark all notifications");
    }
  }

  useEffect(() => {
    if (loading) return;
    if (!items.some((item) => !item.is_read)) return;
    void markAllRead();
  }, [loading, items]);

  return (
    <AdminLayout
      active="notifications"
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
                {isAdmin ? "Admin feed" : "Personal inbox"}
              </div>
              <div className="mt-1 text-[16px] font-black tracking-[-0.02em] text-slate-900">
                {isAdmin ? "Important meeting activity" : "Your notifications"}
              </div>
              <div className="mt-1 text-[12px] font-semibold text-slate-500">
                {isAdmin
                  ? "Bookings, reschedules, attendance changes, room notices, reminders, and outcome notes."
                  : "Reminders, reschedules, and meeting updates for your boards."}
              </div>
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
            <div className="text-[13px] font-black text-slate-900">Recent notifications</div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600">
              {items.length} items
            </div>
          </div>

          {loading ? (
            <div className="grid gap-2 px-4 py-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-[92px] animate-pulse rounded-[18px] border border-slate-200 bg-[linear-gradient(90deg,#f8fafc,#eef2f7,#f8fafc)]" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="grid min-h-[340px] place-items-center px-4 py-6">
              <div className="max-w-[420px] text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_55%),#ffffff] shadow-[0_18px_38px_rgba(15,23,42,0.08)]">
                  <svg viewBox="0 0 24 24" className="h-7 w-7 text-slate-500" fill="none" aria-hidden="true">
                    <path d="M15 17H5l1.4-1.4A2 2 0 0 0 7 14.2V10a5 5 0 1 1 10 0v4.2a2 2 0 0 0 .6 1.4L19 17h-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="mt-5 text-[20px] font-black text-slate-900">
                  No notifications yet
                </div>
                <div className="mt-2 text-[13px] font-semibold leading-6 text-slate-500">
                  {isAdmin
                    ? "Important meeting activity will show here as supervisors and students use the system."
                    : "Meeting reminders, reschedules, and status updates will show up here as your boards become active."}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-3 py-2">
              {items.map((item) => (
                <NotificationCard
                  key={item.id}
                  item={item}
                  showRecipient={false}
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
}: {
  item: NotificationRow;
  showRecipient: boolean;
}) {
  const tone = kindTone(item.kind);

  return (
    <article
      className={`group relative overflow-hidden rounded-[18px] border px-3.5 py-3 transition ${tone.row} ${
        item.is_read
          ? "border-transparent bg-transparent"
          : "border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] shadow-[0_10px_22px_rgba(15,23,42,0.04)]"
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
