import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import SupervisorsPage from "./pages/SupervisorsPage";
import SupervisorFilePage from "./pages/SupervisorFilePage";
import BoardMembersPage from "./pages/BoardMembersPage";
import type { JSX } from "react";
import BoardPage from "./pages/BoardPage";
import AdminBoardsPage from "./pages/AdminBoardsPage";
import AssignPage from "./pages/AssignPage";

function normalizeToken(raw: string) {
  return raw.trim().replace(/^"|"$/g, "");
}

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function hasValidJwt(): boolean {
  const raw = localStorage.getItem("jwt");
  if (!raw) return false;

  const token = normalizeToken(raw);
  const payload = decodeJwtPayload(token);
  if (!payload) return false;

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp) return true; // if exp missing, allow (dev)
  return payload.exp > now;
}

function RequireAuth({ children }: { children: JSX.Element }) {
  if (!hasValidJwt()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin/boards/:boardId"
        element={
          <RequireAuth>
            <BoardPage />
          </RequireAuth>
        }
      />

      <Route
        path="/admin/assign"
        element={
          <RequireAuth>
            <AssignPage />
          </RequireAuth>
        }
      />

      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminDashboard />
          </RequireAuth>
        }
      />

      <Route
        path="/admin/supervisors"
        element={
          <RequireAuth>
            <SupervisorsPage />
          </RequireAuth>
        }
      />

      <Route
        path="/admin/files/:fileId"
        element={
          <RequireAuth>
            <SupervisorFilePage />
          </RequireAuth>
        }
      />

      <Route
        path="/admin/boards/:boardId/members"
        element={
          <RequireAuth>
            <BoardMembersPage />
          </RequireAuth>
        }
      />

      <Route
        path="/admin/boards"
        element={
          <RequireAuth>
            <AdminBoardsPage />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}