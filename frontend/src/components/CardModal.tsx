import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import { apiFetch } from "../lib/api";

type Card = {
  id: number;
  list_id: number;
  title: string;
  description: string;
  due_date: string; // "" or "YYYY-MM-DD"
};

type Subtask = {
  id: number;
  card_id: number;
  title: string;
  is_done: boolean;
};

type Assignee = {
  user_id: number;
  full_name: string;
  email: string;
  role: string;
};

type BoardMember = {
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  role_in_board: string;
};

type CardFull = {
  card: Card;
  subtasks: Subtask[];
  assignees: Assignee[];
  board_id: number;
};

export default function CardModal({
  open,
  cardId,
  onClose,
  onSaved,
}: {
  open: boolean;
  cardId: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [card, setCard] = useState<Card | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [boardId, setBoardId] = useState<number | null>(null);

  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [subtaskTitle, setSubtaskTitle] = useState("");

  const isOverdue = useMemo(() => {
    if (!card?.due_date) return false;
    const today = new Date();
    const due = new Date(card.due_date + "T00:00:00");
    // overdue if due < today date (ignore time)
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return due < t;
  }, [card?.due_date]);

  async function loadAll() {
    if (!open || !cardId) return;
    setErr("");
    setLoading(true);

    try {
      const full: CardFull = await apiFetch(`/admin/card/full?card_id=${cardId}`);
      setCard(full.card);
      setSubtasks(full.subtasks);
      setAssignees(full.assignees);
      setBoardId(full.board_id);

      // load board members so we can assign students (and supervisors if you want)
      const members: BoardMember[] = await apiFetch(`/admin/board-members?board_id=${full.board_id}`);
      setBoardMembers(members);
    } catch (e: any) {
      setErr(e.message || "Failed to load card");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open || !cardId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cardId]);

  async function saveCard() {
    if (!card) return;
    setErr("");
    setSaving(true);

    try {
      await apiFetch("/admin/card", {
        method: "PUT",
        body: JSON.stringify({
          card_id: card.id,
          title: card.title.trim(),
          description: card.description.trim(),
          due_date: card.due_date || "",
        }),
      });

      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function addSubtask() {
    if (!card || !subtaskTitle.trim()) return;
    setErr("");

    try {
      await apiFetch("/admin/card/subtasks", {
        method: "POST",
        body: JSON.stringify({ card_id: card.id, title: subtaskTitle.trim() }),
      });
      setSubtaskTitle("");
      await loadAll();
    } catch (e: any) {
      setErr(e.message || "Failed to add subtask");
    }
  }

  async function toggleSubtask(id: number, isDone: boolean) {
    setErr("");
    try {
      await apiFetch("/admin/card/subtasks/toggle", {
        method: "POST",
        body: JSON.stringify({ subtask_id: id, is_done: isDone }),
      });
      setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, is_done: isDone } : s)));
    } catch (e: any) {
      setErr(e.message || "Failed to update subtask");
    }
  }

  async function deleteSubtask(id: number) {
    setErr("");
    try {
      await apiFetch("/admin/card/subtasks/delete", {
        method: "POST",
        body: JSON.stringify({ subtask_id: id }),
      });
      setSubtasks((prev) => prev.filter((s) => s.id !== id));
    } catch (e: any) {
      setErr(e.message || "Failed to delete subtask");
    }
  }

  const assigneeIds = useMemo(() => new Set(assignees.map((a) => a.user_id)), [assignees]);

  async function toggleAssignee(userId: number) {
    if (!card) return;
    setErr("");

    try {
      if (assigneeIds.has(userId)) {
        await apiFetch("/admin/card/assignees/remove", {
          method: "POST",
          body: JSON.stringify({ card_id: card.id, user_id: userId }),
        });
      } else {
        await apiFetch("/admin/card/assignees/add", {
          method: "POST",
          body: JSON.stringify({ card_id: card.id, user_id: userId }),
        });
      }
      await loadAll();
    } catch (e: any) {
      setErr(e.message || "Failed to update assignees");
    }
  }

  const progress = useMemo(() => {
    if (subtasks.length === 0) return null;
    const done = subtasks.filter((s) => s.is_done).length;
    return { done, total: subtasks.length };
  }, [subtasks]);

  const studentsOnly = useMemo(
    () => boardMembers.filter((m) => m.role === "student"),
    [boardMembers]
  );

  return (
    <Modal
      open={open}
      title={cardId ? `Card #${cardId}` : "Card"}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={saveCard} disabled={saving || loading || !card?.title?.trim()}>
            {saving ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      {loading ? (
        <div style={{ color: "var(--muted)" }}>Loading...</div>
      ) : (
        <>
          {err && <div className="noteBad" style={{ fontSize: 13, marginBottom: 10 }}>{err}</div>}

          {!card ? (
            <div style={{ color: "var(--muted)" }}>No card loaded.</div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {/* Title */}
              <div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>Title</div>
                <input
                  className="input"
                  value={card.title}
                  onChange={(e) => setCard({ ...card, title: e.target.value })}
                  placeholder="Card title"
                />
              </div>

              {/* Due date */}
              <div className="glass" style={{ padding: 12, borderRadius: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>Due date</div>
                    <div style={{ color: "var(--muted2)", fontSize: 12, marginTop: 4 }}>
                      {isOverdue ? "Overdue" : " "}
                    </div>
                  </div>
                  {card.due_date ? (
                    <span className="badge" style={{ borderColor: isOverdue ? "rgba(244,63,94,0.6)" : undefined }}>
                      {card.due_date}
                    </span>
                  ) : (
                    <span className="badge">None</span>
                  )}
                </div>

                <div style={{ height: 10 }} />
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    className="input"
                    type="date"
                    value={card.due_date || ""}
                    onChange={(e) => setCard({ ...card, due_date: e.target.value })}
                  />
                  <button className="btn" onClick={() => setCard({ ...card, due_date: "" })}>
                    Clear
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>Description</div>
                <textarea
                  className="input"
                  value={card.description}
                  onChange={(e) => setCard({ ...card, description: e.target.value })}
                  placeholder="Write details..."
                  rows={6}
                  style={{ resize: "vertical" }}
                />
              </div>

              {/* Subtasks */}
              <div className="glass" style={{ padding: 12, borderRadius: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>Checklist</div>
                    {progress && (
                      <div style={{ color: "var(--muted2)", fontSize: 12, marginTop: 4 }}>
                        {progress.done}/{progress.total} completed
                      </div>
                    )}
                  </div>
                  <span className="badge">{subtasks.length} items</span>
                </div>

                <div style={{ height: 12 }} />

                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    className="input"
                    placeholder="Add a subtask..."
                    value={subtaskTitle}
                    onChange={(e) => setSubtaskTitle(e.target.value)}
                  />
                  <button className="btn primary" onClick={addSubtask} disabled={!subtaskTitle.trim()}>
                    Add
                  </button>
                </div>

                <div style={{ height: 12 }} />

                {subtasks.length === 0 ? (
                  <div style={{ color: "var(--muted2)", fontSize: 13 }}>No subtasks yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {subtasks.map((s) => (
                      <div key={s.id} className="glass" style={{ padding: 10, borderRadius: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <input
                            type="checkbox"
                            checked={s.is_done}
                            onChange={(e) => toggleSubtask(s.id, e.target.checked)}
                          />
                          <div
                            style={{
                              flex: 1,
                              color: s.is_done ? "var(--muted2)" : "var(--text)",
                              textDecoration: s.is_done ? "line-through" : "none",
                            }}
                          >
                            {s.title}
                          </div>
                          <button className="btn" onClick={() => deleteSubtask(s.id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assignees */}
              <div className="glass" style={{ padding: 12, borderRadius: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>Assignees</div>
                    <div style={{ color: "var(--muted2)", fontSize: 12, marginTop: 4 }}>
                      Assign students from board members
                    </div>
                  </div>
                  <span className="badge">{assignees.length}</span>
                </div>

                <div style={{ height: 12 }} />

                {studentsOnly.length === 0 ? (
                  <div style={{ color: "var(--muted2)", fontSize: 13 }}>
                    No students in this board yet. Add them from “Members”.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {studentsOnly.map((m) => {
                      const checked = assigneeIds.has(m.user_id);
                      return (
                        <div key={m.user_id} className="glass" style={{ padding: 10, borderRadius: 14 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAssignee(m.user_id)}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 800 }}>{m.full_name}</div>
                              <div style={{ color: "var(--muted)", fontSize: 12 }}>{m.email}</div>
                            </div>
                            {checked && <span className="badge">Assigned</span>}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Debug small info */}
              {boardId && (
                <div style={{ color: "var(--muted2)", fontSize: 12 }}>
                  Board: #{boardId}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}