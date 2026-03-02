import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import AdminLayout from "../components/AdminLayout";
import "../admin.css";

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
  const [q, setQ] = useState("");

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

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return data;
    return data.filter(
      (s) =>
        s.full_name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        String(s.supervisor_user_id).includes(query) ||
        String(s.file_id).includes(query)
    );
  }, [data, q]);

  return (
    <AdminLayout
      active="supervisors"
      title="Supervisors"
      subtitle="Each supervisor has a workspace file."
      right={
        <>
          <button className="admGhostBtn" onClick={() => nav("/admin")}>
            Back
          </button>
          <button className="admPrimaryBtn" onClick={load} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </>
      }
    >
      {/* Search card */}
      <div className="admCard" style={{ marginBottom: 14 }}>
        <div className="admCardTitleRow" style={{ marginBottom: 0 }}>
          <div>
            <div className="admCardTitle">Directory</div>
            <div className="admMuted">Search and open supervisor workspaces.</div>
          </div>

          <div className="admSearch" style={{ minWidth: 360 }}>
            <span className="admSearchIcon">⌕</span>
            <input
              className="admSearchInput"
              placeholder="Search by name, email, file id..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="admCard">
        {err && (
          <div className="admAlert admAlertBad" style={{ marginBottom: 12 }}>
            {err}
          </div>
        )}
        {loading && <div className="admMuted" style={{ marginBottom: 12 }}>Loading...</div>}

        <div className="admTableWrap">
          <table className="admTable">
            <thead>
              <tr>
                <th>Supervisor</th>
                <th>Email</th>
                <th>Workspace</th>
              </tr>
            </thead>

            <tbody>
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="admTdMuted">
                    No supervisors found.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.supervisor_user_id}>
                    <td>
                      <div style={{ fontWeight: 950 }}>{s.full_name}</div>
                      <div className="admTdMuted" style={{ fontSize: 12 }}>
                        user_id: <span className="admMono">{s.supervisor_user_id}</span>
                      </div>
                    </td>

                    <td className="admMono">{s.email}</td>

                    <td>
                      <button className="admSoftBtn" onClick={() => nav(`/admin/files/${s.file_id}`)}>
                        Open File #{s.file_id}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}