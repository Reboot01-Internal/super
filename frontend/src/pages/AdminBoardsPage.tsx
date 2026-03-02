import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { apiFetch } from "../lib/api";

type BoardRow = {
  id: number;
  name: string;
  description: string;
  supervisor_name: string;
  created_at: string;
  lists_count: number;
  cards_count: number;
};

export default function AdminBoardsPage() {
  const nav = useNavigate();
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

async function load() {
  setLoading(true);
  try {
    const res = await apiFetch("/admin/all-boards");

    if (Array.isArray(res)) {
      setBoards(res);
    } else {
      console.error("Unexpected response:", res);
      setBoards([]); // fallback
    }
  } catch (err) {
    console.error(err);
    setBoards([]); // fallback
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    load();
  }, []);

  const filtered = boards.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
  <AdminLayout
    active="boards"
    title="Boards"
    subtitle="All boards across supervisors"
    right={
      <button className="admPrimaryBtn" onClick={load} disabled={loading}>
        {loading ? "Refreshing..." : "Refresh"}
      </button>
    }
  >      <div className="admPageWrap">
        <div className="admPageHeader">
          <div>
            <h1>Boards</h1>
            <p>All boards across supervisors</p>
          </div>
        </div>

        <div className="admGlass" style={{ marginBottom: 20 }}>
          <input
            className="admInput"
            placeholder="Search boards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="admLoading">Loading boards...</div>
        ) : (
          <div className="admBoardsGrid">
            {filtered.map((b) => (
              <div
                key={b.id}
                className="admBoardCard"
                onClick={() => nav(`/admin/board/${b.id}`)}
              >
                <div className="admBoardTop">
                  <div className="admBoardTitle">{b.name}</div>
                  <div className="admBoardSupervisor">
                    {b.supervisor_name}
                  </div>
                </div>

                <div className="admBoardDesc">
                  {b.description || "No description"}
                </div>

                <div className="admBoardStats">
                  <span>{b.lists_count} Lists</span>
                  <span>{b.cards_count} Cards</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}