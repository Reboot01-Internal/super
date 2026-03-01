import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { apiFetch } from "../lib/api";

type Board = {
  id: number;
  supervisor_file_id: number;
  name: string;
  description: string;
  created_by: number;
  created_at: string;
};

export default function SupervisorFilePage() {
  const nav = useNavigate();
  const { fileId } = useParams();
  const fileID = Number(fileId);

  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState("");

  async function loadBoards() {
    setErr("");
    setLoading(true);
    try {
      const res = await apiFetch(`/admin/boards?file_id=${fileID}`);
      setBoards(res);
    } catch (e: any) {
      setErr(e.message || "Failed to load boards");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!fileID) return;
    loadBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileID]);

  async function createBoard(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setErr("");
    setCreating(true);

    try {
      await apiFetch("/admin/boards", {
        method: "POST",
        body: JSON.stringify({
          supervisor_file_id: fileID,
          name,
          description,
        }),
      });

      setMsg("Board created.");
      setName("");
      setDescription("");
      await loadBoards();
    } catch (e: any) {
      setErr(e.message || "Failed to create board");
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell
      title={`Supervisor File #${fileID}`}
      subtitle="Boards in this workspace"
      showLogout
      right={
        <>
          <button className="btn" onClick={() => nav("/admin/supervisors")}>
            Back
          </button>
          <button className="btn primary" onClick={loadBoards}>
            Refresh
          </button>
        </>
      }
    >
      <div className="grid2">
        {/* Create Board */}
        <div className="glass" style={{ padding: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 900 }}>Create Board</div>
          <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
            A board is where columns and tasks will live.
          </div>

          <div style={{ height: 14 }} />

          <form onSubmit={createBoard} style={{ display: "grid", gap: 12 }}>
            <input
              className="input"
              placeholder="Board name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="input"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {err && (
              <div className="noteBad" style={{ fontSize: 13 }}>
                {err}
              </div>
            )}
            {msg && (
              <div className="noteGood" style={{ fontSize: 13 }}>
                {msg}
              </div>
            )}

            <button className="btn primary" disabled={creating}>
              {creating ? "Creating..." : "Create Board"}
            </button>
          </form>
        </div>

        {/* Boards List */}
        <div className="glass" style={{ padding: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 900 }}>Boards</div>
              <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                {loading ? "Loading..." : `${boards.length} board(s)`}
              </div>
            </div>
            <span className="badge">Boards</span>
          </div>

          <div style={{ height: 14 }} />

          {loading ? (
            <div style={{ color: "var(--muted)" }}>Loading boards...</div>
          ) : boards.length === 0 ? (
            <div style={{ color: "var(--muted)" }}>No boards yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {boards.map((b) => (
                <div key={b.id} className="glass" style={{ padding: 14, borderRadius: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 950 }}>{b.name}</div>
                      {b.description && (
                        <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                          {b.description}
                        </div>
                      )}
                    </div>

                    {/* ✅ UPDATED ACTIONS: Open + Members + ID */}
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <button className="btn" onClick={() => nav(`/admin/boards/${b.id}`)}>
                        Open
                      </button>

                      <button className="btn" onClick={() => nav(`/admin/boards/${b.id}/members`)}>
                        Members
                      </button>

                      <span className="badge">#{b.id}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 10, color: "var(--muted2)", fontSize: 12 }}>
                    Created: {b.created_at}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}