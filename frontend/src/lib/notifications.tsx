import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { API_URL, apiFetch } from "./api";
import { useAuth } from "./auth";
import { getNotificationTone } from "./notificationTheme";

export type NotificationItem = {
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

type NotificationsContextValue = {
  items: NotificationItem[];
  loading: boolean;
  error: string;
  unreadCount: number;
  hasUnread: boolean;
  isRecent: (id: number) => boolean;
  reload: () => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function wsUrl(email: string, login: string, role: string) {
  const base = API_URL.replace(/^http/i, "ws");
  const query = new URLSearchParams();
  if (email) query.set("email", email);
  if (login) query.set("login", login);
  if (role) query.set("role", role);
  const suffix = query.toString();
  return `${base}/admin/notifications/stream${suffix ? `?${suffix}` : ""}`;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { authenticated, email, login, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const recentIdsRef = useRef<Set<number>>(new Set());
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const isNotificationsPage = location.pathname.startsWith("/notifications");

  async function load() {
    if (!authenticated) {
      setItems([]);
      setLoading(false);
      setError("");
      recentIdsRef.current.clear();
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/admin/notifications");
      const nextItems = Array.isArray(res) ? res : [];
      for (const item of nextItems) {
        if (!item.is_read) {
          recentIdsRef.current.add(item.id);
        }
      }
      setItems(nextItems);
    } catch (e: any) {
      setError(e?.message || "Failed to load notifications");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    if (!authenticated) return;
    await apiFetch("/admin/notifications/read-all", { method: "POST" });
    setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
  }

  useEffect(() => {
    void load();
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    if (!isNotificationsPage) return;
    if (!items.some((item) => !item.is_read)) return;

    markAllRead().catch((e: any) => {
      setError(e?.message || "Failed to mark all notifications");
    });
  }, [authenticated, isNotificationsPage, items]);

  useEffect(() => {
    if (!authenticated) return undefined;

    let cancelled = false;

    const connect = () => {
      const socket = new WebSocket(wsUrl(email, login, role));
      socketRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data || "{}");
          const item = payload?.notification as NotificationItem | undefined;
          if (!item?.id) return;

          recentIdsRef.current.add(item.id);
          setItems((prev) => {
            const rest = prev.filter((existing) => existing.id !== item.id);
            const nextItem = isNotificationsPage ? { ...item, is_read: true } : item;
            return [nextItem, ...rest];
          });

          const tone = getNotificationTone(item);
          toast(
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border ${tone.iconWrap}`}>
                {tone.icon}
              </div>
              <div className="min-w-0">
                <div className={`text-[11px] font-black uppercase tracking-[0.14em] ${tone.accent}`}>{tone.label}</div>
                <div className="mt-1 text-[14px] font-black text-slate-900">{item.title}</div>
                <div className="mt-1 line-clamp-2 text-[12px] font-semibold leading-5 text-slate-600">{item.body}</div>
              </div>
            </div>,
            {
            toastId: `notification-${item.id}`,
            autoClose: 4000,
            className: `rounded-[20px] border shadow-[0_18px_40px_rgba(15,23,42,0.08)] ${tone.toast}`,
            icon: false,
            onClick: () => navigate(item.link || "/notifications"),
            },
          );

          if (isNotificationsPage) {
            markAllRead().catch(() => {});
          }
        } catch {
          // Ignore malformed realtime payloads.
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        reconnectTimerRef.current = window.setTimeout(connect, 2500);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [authenticated, email, login, role, isNotificationsPage, navigate]);

  const value = useMemo<NotificationsContextValue>(() => {
    const unreadCount = items.filter((item) => !item.is_read).length;
    return {
      items,
      loading,
      error,
      unreadCount,
      hasUnread: unreadCount > 0,
      isRecent: (id: number) => recentIdsRef.current.has(id),
      reload: load,
      markAllRead,
    };
  }, [items, loading, error]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <ToastContainer position="top-right" newestOnTop closeOnClick pauseOnFocusLoss={false} hideProgressBar />
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
