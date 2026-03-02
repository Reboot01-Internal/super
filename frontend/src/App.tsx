import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import SupervisorsPage from "./pages/SupervisorsPage";
import SupervisorFilePage from "./pages/SupervisorFilePage";
import BoardMembersPage from "./pages/BoardMembersPage";
import { getToken } from "./lib/api";
import type { JSX } from "react";
import BoardPage from "./pages/BoardPage.tsx";
import AdminBoardsPage from "./pages/AdminBoardsPage";

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
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