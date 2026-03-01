import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { apiFetch } from "../lib/api";

type Member = {
  user_id: number;
  full_name: string;
  email: string;
  role: string; // admin/supervisor/student
  role_in_board: string;
  added_at: string;
};

type User = {
  id: number;
  full_name: string;
  email: string;
  role: string;
};

export default function BoardMembersPage() {
  const nav = useNavigate();
  const { boardId } = useParams();
  const boardID = Number(boardId);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [q, setQ] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  async function loadMembers() {
    setErr("");
    setLoading(true);
    try {
      const res = await apiFetch(`/admin/board-members?board_id=${boardID}`);
      setMembers(res);
    } catch (e: any) {
      setErr(e.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!boardID) return;
    loadMembers();
  }, [boardID]);

  async function searchStudents() {
    setMsg("");
    setErr("");
    setSearching(true);
    try {
      const res = await apiFetch(`/admin/students?q=${encodeURIComponent(q)}`);
      setResults(res);
    } catch (e: any) {
      setErr(e.message || "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function addMember(userId: number) {
    setMsg("");
    setErr("");
    try {
      await apiFetch("/admin/board-members", {
        method: "POST",
        body: JSON.stringify({
          board_id: boardID,
          user_id: userId,
          role_in_board: "member",
        }),
      });
      setMsg("Member added.");
      await loadMembers();
    } catch (e: any) {
      setErr(e.message || "Failed to add member");
    }
  }

  return (
    <AppShell
      title={`Board #${boardID} Members`}
      subtitle="Manage who can access this board."
      showLogout
      right={
        <>
          <button className="btn" onClick={() => nav(-1)}>
            Back
          </button>
          <button className="btn primary" onClick={loadMembers}>
            Refresh
          </button>
        </>
      }
    >
      <div className="grid2">
        {/* Add member */}
        <div className="glass" style={{ padding: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 900 }}>Add Student</div>
          <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
            Search by name or email, then add to this board.
          </div>

          <div style={{ height: 14 }} />

          <div style={{ display: "flex", gap: 10 }}>
            <input
              className="input"
              placeholder="Search students..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="btn primary" onClick={searchStudents} disabled={searching}>
              {searching ? "..." : "Search"}
            </button>
          </div>

          {err && <div className="noteBad" style={{ marginTop: 10, fontSize: 13 }}>{err}</div>}
          {msg && <div className="noteGood" style={{ marginTop: 10, fontSize: 13 }}>{msg}</div>}

          <div style={{ height: 14 }} />

          {results.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {results.map((u) => (
                <div key={u.id} className="glass" style={{ padding: 12, borderRadius: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>{u.full_name}</div>
                      <div style={{ color: "var(--muted)", fontSize: 13 }}>{u.email}</div>
                    </div>
                    <button className="btn" onClick={() => addMember(u.id)}>
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--muted2)", fontSize: 13 }}>
              Search results will show here.
            </div>
          )}
        </div>

        {/* Members list */}
        <div className="glass" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900 }}>Current Members</div>
              <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                {loading ? "Loading..." : `${members.length} member(s)`}
              </div>
            </div>
            <span className="badge">Access</span>
          </div>

          <div style={{ height: 14 }} />

          {loading ? (
            <div style={{ color: "var(--muted)" }}>Loading members...</div>
          ) : members.length === 0 ? (
            <div style={{ color: "var(--muted)" }}>No members yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Board Role</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.user_id}>
                    <td>
                      <div style={{ fontWeight: 900 }}>{m.full_name}</div>
                      <div style={{ color: "var(--muted2)", fontSize: 12 }}>{m.email}</div>
                    </td>
                    <td style={{ color: "var(--muted)" }}>{m.role}</td>
                    <td>
                      <span className="badge">{m.role_in_board}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}