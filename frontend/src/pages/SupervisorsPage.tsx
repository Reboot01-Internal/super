import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { apiFetch } from "../lib/api";

type SupervisorRow = {
  supervisor_user_id: number;
  full_name: string;
  email: string;
  file_id: number;
  created_at: string;
};

export default function SupervisorsPage() {
  const nav = useNavigate();
  const [data, setData] = useState<SupervisorRow[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await apiFetch("/admin/supervisors");
      setData(res);
    } catch (e: any) {
      setErr(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell
      title="Supervisors"
      subtitle="Each supervisor has a workspace file."
      showLogout
      right={
        <>
          <button className="btn" onClick={() => nav("/admin")}>
            Back
          </button>
          <button className="btn primary" onClick={load}>
            Refresh
          </button>
        </>
      }
    >
      <div className="glass" style={{ padding: 16 }}>
        {loading && <div style={{ color: "var(--muted)" }}>Loading...</div>}
        {err && <div className="noteBad" style={{ marginBottom: 10 }}>{err}</div>}

        <table className="table">
          <thead>
            <tr>
              <th>Supervisor</th>
              <th>Email</th>
              <th>Workspace</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.supervisor_user_id}>
                <td>
                  <div style={{ fontWeight: 900 }}>{s.full_name}</div>
                  <div style={{ color: "var(--muted2)", fontSize: 12 }}>
                    user_id: {s.supervisor_user_id}
                  </div>
                </td>
                <td style={{ color: "var(--muted)" }}>{s.email}</td>
                <td>
                  <button className="btn" onClick={() => nav(`/admin/files/${s.file_id}`)}>
                    Open File #{s.file_id}
                  </button>
                </td>
              </tr>
            ))}

            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={3} style={{ color: "var(--muted)" }}>
                  No supervisors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}