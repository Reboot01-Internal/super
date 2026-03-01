import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { apiFetch } from "../lib/api";

import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import CardModal from "../components/CardModal";

type List = { id: number; board_id: number; title: string; position: number };
type Card = { id: number; list_id: number; title: string; description: string; position: number };

type BoardFull = {
  board_id: number;
  supervisor_file_id: number;
  name: string;
  lists: List[];
  cards: Card[];
};

function CardItem({
  card,
  onOpen,
}: {
  card: Card;
  onOpen: (cardId: number) => void;
}) {
  const sortable = useSortable({
    id: `card:${card.id}`,
    data: { type: "card", cardId: card.id, fromListId: card.list_id },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.7 : 1,
  };

  return (
    <div ref={sortable.setNodeRef} style={style} className="glass">
      <div style={{ padding: 12, borderRadius: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
        {/* Drag handle */}
        <div
          {...sortable.attributes}
          {...sortable.listeners}
          style={{
            width: 26,
            height: 26,
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.06)",
            display: "grid",
            placeItems: "center",
            cursor: "grab",
            flex: "0 0 auto",
          }}
          title="Drag"
        >
          <span style={{ opacity: 0.7, fontSize: 14 }}>⋮⋮</span>
        </div>

        {/* Clickable content */}
        <div
          style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
          onClick={() => onOpen(card.id)}
        >
          <div style={{ fontWeight: 900 }}>{card.title}</div>
          {card.description && (
            <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
              {card.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ListColumn({
  list,
  cards,
  onAddCard,
  onOpenCard,
}: {
  list: List;
  cards: Card[];
  onAddCard: (listId: number) => void;
  onOpenCard: (cardId: number) => void;
}) {
  const drop = useDroppable({
    id: `list:${list.id}`,
    data: { type: "list", listId: list.id },
  });

  return (
    <div
      className="glass"
      style={{
        minWidth: 320,
        maxWidth: 320,
        padding: 14,
        borderRadius: 18,
        flex: "0 0 auto",
        border: drop.isOver ? "1px solid rgba(34,211,238,0.55)" : undefined,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 950 }}>{list.title}</div>
        <button className="btn" onClick={() => onAddCard(list.id)}>
          + Card
        </button>
      </div>

      <div style={{ height: 12 }} />

      <div
        ref={drop.setNodeRef}
        style={{
          display: "grid",
          gap: 10,
          minHeight: 60,
          paddingBottom: 6,
        }}
      >
        <SortableContext
          items={cards.map((c) => `card:${c.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((c) => (
            <CardItem key={c.id} card={c} onOpen={onOpenCard} />
          ))}
        </SortableContext>

        {cards.length === 0 && (
          <div style={{ color: "var(--muted2)", fontSize: 13, padding: "10px 6px" }}>
            Drop cards here
          </div>
        )}
      </div>
    </div>
  );
}

export default function BoardPage() {
  const nav = useNavigate();
  const { boardId } = useParams();
  const boardID = Number(boardId);

  const [data, setData] = useState<BoardFull | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [newListTitle, setNewListTitle] = useState("");
  const [creatingList, setCreatingList] = useState(false);

  const [activeCardId, setActiveCardId] = useState<number | null>(null);

  // modal
  const [openCardId, setOpenCardId] = useState<number | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await apiFetch(`/admin/board?board_id=${boardID}`);
      setData(res);
    } catch (e: any) {
      setErr(e.message || "Failed to load board");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!boardID) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardID]);

  const listsSorted = useMemo(() => {
    if (!data) return [];
    return [...data.lists].sort((a, b) => a.position - b.position);
  }, [data]);

  const cardsByList = useMemo(() => {
    const map: Record<number, Card[]> = {};
    if (!data) return map;

    for (const l of data.lists) map[l.id] = [];
    for (const c of data.cards) {
      if (!map[c.list_id]) map[c.list_id] = [];
      map[c.list_id].push(c);
    }
    for (const k of Object.keys(map)) {
      map[Number(k)].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [data]);

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    const title = newListTitle.trim();
    if (!title) return;

    setCreatingList(true);
    try {
      await apiFetch("/admin/lists", {
        method: "POST",
        body: JSON.stringify({ board_id: boardID, title }),
      });
      setNewListTitle("");
      await load();
    } catch (e: any) {
      setErr(e.message || "Failed to create list");
    } finally {
      setCreatingList(false);
    }
  }

  async function createCard(listId: number) {
    // For now: create a draft card quickly, then open modal to edit
    try {
      const res = await apiFetch("/admin/cards", {
        method: "POST",
        body: JSON.stringify({ list_id: listId, title: "New card", description: "" }),
      });
      const newId = res.id as number;
      await load();
      setOpenCardId(newId);
      setIsCardModalOpen(true);
    } catch (e: any) {
      setErr(e.message || "Failed to create card");
    }
  }

  function onOpenCard(cardId: number) {
    setOpenCardId(cardId);
    setIsCardModalOpen(true);
  }

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith("card:")) setActiveCardId(Number(id.split(":")[1]));
  }

  function findCard(cardId: number): Card | undefined {
    return data?.cards.find((c) => c.id === cardId);
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveCardId(null);
    if (!data) return;

    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;
    if (!activeId.startsWith("card:")) return;

    const cardId = Number(activeId.split(":")[1]);
    const activeCard = findCard(cardId);
    if (!activeCard) return;

    const fromListId = activeCard.list_id;

    // Drop over a card
    if (overId.startsWith("card:")) {
      const overCardId = Number(overId.split(":")[1]);
      const overCard = findCard(overCardId);
      if (!overCard) return;

      const toListId = overCard.list_id;

      // reorder within same list
      if (toListId === fromListId) {
        const current = cardsByList[fromListId] ?? [];
        const fromIndex = current.findIndex((c) => c.id === cardId);
        const toIndex = current.findIndex((c) => c.id === overCardId);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

        const ordered = arrayMove(current, fromIndex, toIndex).map((c) => c.id);

        await apiFetch("/admin/cards/reorder", {
          method: "POST",
          body: JSON.stringify({ list_id: fromListId, ids: ordered }),
        });

        await load();
        return;
      }

      // move to another list at overCard index
      const target = cardsByList[toListId] ?? [];
      const toPos = target.findIndex((c) => c.id === overCardId);
      const position = toPos < 0 ? 0 : toPos;

      await apiFetch("/admin/cards/move", {
        method: "POST",
        body: JSON.stringify({ card_id: cardId, to_list_id: toListId, to_position: position }),
      });

      await load();
      return;
    }

    // Drop over list empty area
    if (overId.startsWith("list:")) {
      const toListId = Number(overId.split(":")[1]);
      const endPos = cardsByList[toListId]?.length ?? 0;

      if (toListId === fromListId) return;

      await apiFetch("/admin/cards/move", {
        method: "POST",
        body: JSON.stringify({ card_id: cardId, to_list_id: toListId, to_position: endPos }),
      });

      await load();
      return;
    }
  }

  return (
    <AppShell
      title={data ? data.name : `Board #${boardID}`}
      subtitle="Drag cards between columns"
      showLogout
      right={
        <>
          <button className="btn" onClick={() => nav(-1)}>Back</button>
          <button className="btn primary" onClick={load}>Refresh</button>
        </>
      }
    >
      <CardModal
        open={isCardModalOpen}
        cardId={openCardId}
        onClose={() => setIsCardModalOpen(false)}
        onSaved={load}
      />

      {err && <div className="noteBad" style={{ marginBottom: 12 }}>{err}</div>}
      {loading && <div style={{ color: "var(--muted)" }}>Loading board...</div>}

      {!loading && data && (
        <>
          <div className="glass" style={{ padding: 14, marginBottom: 14 }}>
            <form onSubmit={createList} style={{ display: "flex", gap: 10 }}>
              <input
                className="input"
                placeholder="Add a new list (e.g. To Do)"
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
              />
              <button className="btn primary" disabled={creatingList}>
                {creatingList ? "..." : "Add List"}
              </button>
            </form>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 12 }}>
              {listsSorted.map((l) => (
                <ListColumn
                  key={l.id}
                  list={l}
                  cards={cardsByList[l.id] ?? []}
                  onAddCard={createCard}
                  onOpenCard={onOpenCard}
                />
              ))}

              {listsSorted.length === 0 && (
                <div className="glass" style={{ minWidth: 320, padding: 18, borderRadius: 18 }}>
                  <div style={{ fontWeight: 900 }}>No lists yet</div>
                  <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>
                    Add your first list above (To Do, Doing, Done).
                  </div>
                </div>
              )}
            </div>
          </DndContext>

          {activeCardId && (
            <div style={{ marginTop: 10, color: "var(--muted2)", fontSize: 12 }}>
              Moving card #{activeCardId}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}