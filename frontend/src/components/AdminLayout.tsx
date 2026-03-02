import React from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";

type Props = {
  active?: "dashboard" | "supervisors" | "boards" | "reports";
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  showLogout?: boolean;
};

export default function AdminLayout({ active, title, subtitle, right, children }: Props) {
  const nav = useNavigate();

  function logout() {
    // Adjust the key names to match your project
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  }

  return (
    <div className="adm">
      <AdminSidebar active={active} />

      <main className="admMain">
        <header className="admTop">
          <div>
            <div className="admHello">Welcome back</div>
            <div className="admTitle">{title}</div>
            {subtitle ? <div className="admSub">{subtitle}</div> : null}
          </div>

          <div className="admTopRight">
            {right}
            <button className="admGhostBtn" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}