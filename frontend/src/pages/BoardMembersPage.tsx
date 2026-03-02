import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { apiFetch } from "../lib/api";
import "../admin.css";

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
    if (!boardID || Number.isNaN(boardID)) return;
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <AdminLayout
      active="supervisors"
      title={`Board #${boardID} Members`}
      subtitle="Manage who can access this board."
      right={
        <>
          <button className="admGhostBtn" onClick={() => nav(-1)}>
            Back
          </button>
          <button className="admPrimaryBtn" onClick={loadMembers} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </>
      }
    >
      <section className="admGrid">
        {/* Left: Add member */}
        <div className="admCol">
          <section className="admCard">
            <div className="admCardTitleRow">
              <div>
                <div className="admCardTitle">Add Student</div>
                <div className="admMuted">Search by name or email, then add to this board.</div>
              </div>
              <span className="admPill">Members</span>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div className="admSearch" style={{ minWidth: 0, width: "100%" }}>
                <span className="admSearchIcon">⌕</span>
                <input
                  className="admSearchInput"
                  placeholder="Search students..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              <button
                className="admPrimaryBtn"
                onClick={searchStudents}
                disabled={searching || !q.trim()}
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </div>

            {err && (
              <div className="admAlert admAlertBad" style={{ marginTop: 12 }}>
                {err}
              </div>
            )}
            {msg && (
              <div className="admAlert admAlertGood" style={{ marginTop: 12 }}>
                {msg}
              </div>
            )}

            <div style={{ height: 14 }} />

            {results.length > 0 ? (
              <div style={{ display: "grid", gap: 12 }}>
                {results.map((u) => (
                  <div
                    key={u.id}
                    className="admCard"
                    style={{
                      padding: 14,
                      boxShadow: "none",
                      borderRadius: 16,
                      background: "#fbfcff",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 950 }}>{u.full_name}</div>
                        <div className="admTdMuted" style={{ marginTop: 4 }}>
                          {u.email}
                        </div>
                        <div className="admTdMuted" style={{ marginTop: 6, fontSize: 12 }}>
                          role: <span className="admMono">{u.role}</span>
                        </div>
                      </div>

                      <button className="admSoftBtn" onClick={() => addMember(u.id)}>
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admTdMuted" style={{ fontSize: 13 }}>
                Search results will show here.
              </div>
            )}
          </section>
        </div>

        {/* Right: Members list */}
        <div className="admCol">
          <section className="admCard">
            <div className="admCardTitleRow">
              <div>
                <div className="admCardTitle">Current Members</div>
                <div className="admMuted">
                  {loading ? "Loading..." : `${members.length} member(s)`}
                </div>
              </div>
              <span className="admPill">Access</span>
            </div>

            {loading ? (
              <div className="admMuted">Loading members...</div>
            ) : members.length === 0 ? (
              <div className="admMuted">No members yet.</div>
            ) : (
              <div className="admTableWrap">
                <table className="admTable">
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
                          <div style={{ fontWeight: 950 }}>{m.full_name}</div>
                          <div className="admTdMuted" style={{ fontSize: 12, marginTop: 3 }}>
                            {m.email}
                          </div>
                        </td>

                        <td className="admTdMuted">
                          <span className="admMono">{m.role}</span>
                        </td>

                        <td>
                          <span className="admPill">{m.role_in_board}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </section>
    </AdminLayout>
  );
}