import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import UserAvatar from "./UserAvatar";
import { useAuth } from "../lib/auth";
import faviconIcon from "/favicon-icon.png";
import { fetchRebootAvatar, getCachedRebootAvatar } from "../lib/rebootAvatars";

type Props = {
  active?: "dashboard" | "supervisors" | "boards" | "reports" | "profile" | "users" | "meetings" | "notifications";
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
};

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function SignOutIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m8 8-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NavItem({
  label,
  icon,
  onClick,
  activeItem = false,
  tone = "slate",
  ariaLabel,
  title,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  activeItem?: boolean;
  tone?: "slate" | "amber";
  ariaLabel?: string;
  title?: string;
}) {
  const toneClass =
    tone === "amber"
      ? activeItem
        ? "border-[#ead8b3] bg-[#fff8ea] text-[#b45309]"
        : "border-transparent text-slate-700 hover:border-[#ead8b3] hover:bg-[#fff8ea] hover:text-[#b45309]"
      : activeItem
      ? "border-[#6d5efc]/22 bg-[#f3f1ff] text-slate-900"
      : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900";

  return (
    <button
      type="button"
      onClick={onClick}
      title={title || label}
      aria-label={ariaLabel || label}
      className={cn("flex items-center gap-3 rounded-[14px] border px-3 py-2 text-left font-extrabold transition", toneClass)}
    >
      <span className="grid h-8 w-8 place-items-center rounded-full border border-current/15 bg-white/70">
        {icon}
      </span>
      <span className="text-[14px] leading-none">{label}</span>
    </button>
  );
}

export default function AdminLayout({
  active,
  title,
  subtitle,
  right,
  children,
}: Props) {
  const nav = useNavigate();
  const { isAdmin, isSupervisor, login, email, logout } = useAuth();
  const baseName = login || email || "User";
  const avatarLogin = String(login || String(email || "").split("@")[0] || "").trim();
  const [avatarUrl, setAvatarUrl] = useState(() => getCachedRebootAvatar(avatarLogin));
  const profileInitials = baseName
    .replace(/^@/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() || "")
    .join("") || "U";

  useEffect(() => {
    let cancelled = false;

    async function loadAvatar() {
      const nextLogin = avatarLogin;
      if (!nextLogin) {
        setAvatarUrl("");
        return;
      }
      try {
        const next = await fetchRebootAvatar(nextLogin);
        if (!cancelled && next !== avatarUrl) setAvatarUrl(next);
      } catch {
        if (!cancelled) setAvatarUrl("");
      }
    }

    void loadAvatar();
    return () => {
      cancelled = true;
    };
  }, [avatarLogin, avatarUrl]);

  const nonAdminNav =
    !isAdmin ? (
      <aside className="sticky top-[22px] self-start">
        <div className="flex min-h-[calc(100vh-44px)] w-[220px] max-w-full flex-col rounded-[22px] border border-slate-200 bg-white px-3 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => nav("/dashboard")}
              className="flex items-center gap-3 rounded-[16px] px-1 py-1 text-left transition hover:bg-slate-50"
            >
              <img
                src={faviconIcon}
                alt="TaskFlow"
                className="h-12 w-12 rounded-[18px] object-cover shadow-[0_10px_25px_rgba(15,23,42,0.08)]"
              />
              <div className="min-w-0">
                <div className="truncate text-[17px] font-black tracking-[-0.3px] text-slate-900">TaskFlow</div>
              </div>
            </button>

            <div className="flex flex-col gap-2">
              <NavItem
                activeItem={active === "dashboard"}
                label="Dashboard"
                onClick={() => nav("/dashboard")}
                icon={
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                    <path d="M4 12c0-4.42 3.58-8 8-8h8v8c0 4.42-3.58 8-8 8H4v-8Z" stroke="#6d5efc" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M12 4v8h8" stroke="#6d5efc" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                }
              />
              <NavItem
                activeItem={active === "boards"}
                label="Boards"
                onClick={() => nav("/admin/boards")}
                icon={
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                    <rect x="4" y="5" width="16" height="14" rx="3" stroke="#2563eb" strokeWidth="2" />
                    <path d="M8 9h8M8 13h8M8 17h5" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                }
              />
              {isSupervisor ? (
                <NavItem
                  activeItem={active === "users"}
                  label="Users"
                  onClick={() => nav("/users")}
                  icon={
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                      <path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20" stroke="#6d5efc" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="10" cy="8" r="3.5" stroke="#6d5efc" strokeWidth="2" />
                      <path d="M20 20v-1.5A3.5 3.5 0 0 0 17 15.1" stroke="#6d5efc" strokeWidth="2" strokeLinecap="round" />
                      <path d="M15.5 4.7a3.5 3.5 0 0 1 0 6.6" stroke="#6d5efc" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  }
                />
              ) : null}
              <NavItem
                activeItem={active === "meetings"}
                label="Meetings"
                onClick={() => nav("/calendar")}
                ariaLabel="Open meetings calendar"
                icon={
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                    <path d="M7 3v3M17 3v3M4 9h16" stroke="#6d5efc" strokeWidth="2" strokeLinecap="round" />
                    <rect x="4" y="5" width="16" height="15" rx="3" stroke="#6d5efc" strokeWidth="2" />
                    <path d="M8 13h3v3H8z" fill="#6d5efc" />
                  </svg>
                }
              />
              <NavItem
                activeItem={active === "notifications"}
                label="Notifications"
                onClick={() => nav("/notifications")}
                ariaLabel="Open notifications"
                icon={
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                    <path d="M15 17H5l1.4-1.4A2 2 0 0 0 7 14.2V10a5 5 0 1 1 10 0v4.2a2 2 0 0 0 .6 1.4L19 17h-4Z" stroke="#6d5efc" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M10 20a2 2 0 0 0 4 0" stroke="#6d5efc" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                }
              />
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-2 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={() => nav("/profile")}
              className="flex min-w-0 items-center gap-3 rounded-[16px] border border-slate-200 bg-white px-3 py-2 text-left transition hover:bg-slate-50"
              title="Open profile"
              aria-label="Open profile"
            >
              <UserAvatar
                src={avatarUrl}
                alt={baseName}
                fallback={profileInitials}
                sizeClass="h-10 w-10"
                textClass="text-[11px]"
                className="bg-[#e8ecff] text-[#6d5efc]"
              />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-extrabold text-slate-900">{baseName}</div>
                <div className="mt-0.5 text-[12px] font-bold text-slate-500">System access</div>
              </div>
            </button>

            <button
              type="button"
              onClick={logout}
              title="Log out"
              aria-label="Log out"
              className="flex items-center gap-3 rounded-[14px] border border-slate-200 bg-white px-3 py-2 font-extrabold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full border border-current/15 bg-white/70">
                <SignOutIcon size={15} />
              </span>
              <span className="text-[14px] leading-none">Log out</span>
            </button>
          </div>
        </div>
      </aside>
    ) : null;

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <div
        className={cn(
          "grid min-h-screen",
          isAdmin
            ? "grid-cols-[242px_1fr] gap-5 max-[1050px]:grid-cols-1"
            : "grid-cols-[242px_1fr] gap-5 max-[1050px]:grid-cols-1"
        )}
      >
        {isAdmin ? <AdminSidebar active={active} /> : null}
        {!isAdmin ? nonAdminNav : null}

        <main className={cn("px-[22px] pb-[22px] pt-[34px]", "pl-0 max-[1050px]:px-[22px] max-[1050px]:pt-[22px]")}>
          <header className="mb-4 flex items-start justify-between gap-3 max-[1050px]:flex-col">
            <div>
              <div className="text-[13px] font-bold text-slate-500">Welcome back</div>
              <div className="mt-1 text-[28px] font-black tracking-[-0.6px]">{title}</div>
              {subtitle ? <div className="mt-1 text-[14px] font-semibold text-slate-500">{subtitle}</div> : null}
            </div>

            <div className="flex items-center gap-2 justify-end max-[1050px]:w-full">
              {right}
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
