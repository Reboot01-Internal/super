import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { apiFetch } from "../lib/api";
import "../admin.css";

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
    if (!fileID || Number.isNaN(fileID)) return;
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
    <AdminLayout
      active="supervisors"
      title={`Supervisor File #${fileID}`}
      subtitle="Boards in this workspace"
      right={
        <>
          <button className="admGhostBtn" onClick={() => nav("/admin/supervisors")}>
            Back
          </button>
          <button className="admPrimaryBtn" onClick={loadBoards} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </>
      }
    >
      {/* same 2-column layout as dashboard */}
      <section className="admGrid">
        {/* Left: Create Board */}
        <div className="admCol">
          <section className="admCard">
            <div className="admCardTitleRow">
              <div>
                <div className="admCardTitle">Create Board</div>
                <div className="admMuted">A board is where columns and tasks will live.</div>
              </div>
              <span className="admPill">Boards</span>
            </div>

            <form onSubmit={createBoard} className="admForm">
              <div className="admRow2">
                <label className="admField" style={{ gridColumn: "1 / -1" }}>
                  <span className="admLabel">Board name</span>
                  <input
                    className="admInput"
                    placeholder="e.g. Sprint Planning"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>

                <label className="admField" style={{ gridColumn: "1 / -1" }}>
                  <span className="admLabel">Description</span>
                  <input
                    className="admInput"
                    placeholder="Optional description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>
              </div>

              {err && <div className="admAlert admAlertBad">{err}</div>}
              {msg && <div className="admAlert admAlertGood">{msg}</div>}

              <div className="admFormActions">
                <button className="admPrimaryBtn" disabled={creating || !name.trim()}>
                  {creating ? "Creating..." : "Create Board"}
                </button>

                <button
                  type="button"
                  className="admSoftBtn"
                  onClick={() => {
                    setName("");
                    setDescription("");
                    setErr("");
                    setMsg("");
                  }}
                >
                  Clear
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Right: Boards List */}
        <div className="admCol">
          <section className="admCard">
            <div className="admCardTitleRow">
              <div>
                <div className="admCardTitle">Boards</div>
                <div className="admMuted">
                  {loading ? "Loading..." : `${boards.length} board(s)`}
                </div>
              </div>

              <button className="admGhostBtn" onClick={loadBoards} disabled={loading}>
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="admMuted">Loading boards...</div>
            ) : boards.length === 0 ? (
              <div className="admMuted">No boards yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {boards.map((b) => (
                  <div
                    key={b.id}
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
                        <div style={{ fontWeight: 950 }}>{b.name}</div>

                        {b.description ? (
                          <div className="admMuted" style={{ marginTop: 6 }}>
                            {b.description}
                          </div>
                        ) : (
                          <div className="admMuted" style={{ marginTop: 6 }}>
                            No description
                          </div>
                        )}

                        <div className="admTdMuted" style={{ marginTop: 10, fontSize: 12 }}>
                          Created: {new Date(b.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <button className="admSoftBtn" onClick={() => nav(`/admin/boards/${b.id}`)}>
                          Open
                        </button>

                        <button
                          className="admSoftBtn"
                          onClick={() => nav(`/admin/boards/${b.id}/members`)}
                        >
                          Members
                        </button>

                        <span className="admPill">#{b.id}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </AdminLayout>
  );
}