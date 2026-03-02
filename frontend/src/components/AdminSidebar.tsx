import { useNavigate } from "react-router-dom";

type Props = {
  active?: "dashboard" | "supervisors";
};

export default function AdminSidebar({ active }: Props) {
  const nav = useNavigate();

  return (
    <aside className="admSide">
      <div className="admBrand" onClick={() => nav("/admin")} style={{ cursor: "pointer" }}>
        <div className="admLogo" />
        <div>
          <div className="admBrandName">TaskFlow</div>
          <div className="admBrandSub">Admin Console</div>
        </div>
      </div>

      <nav className="admNav">
        <button
          className={`admNavItem ${active === "dashboard" ? "admNavItemActive" : ""}`}
          onClick={() => nav("/admin")}
        >
          <span className="admNavDot" />
          Dashboard
        </button>

        <button
          className={`admNavItem ${active === "supervisors" ? "admNavItemActive" : ""}`}
          onClick={() => nav("/admin/supervisors")}
        >
          <span className="admNavDot" />
          Supervisors
        </button>

        <button className="admNavItem" disabled>
          <span className="admNavDot" />
          Boards (soon)
        </button>

        <button className="admNavItem" disabled>
          <span className="admNavDot" />
          Reports (soon)
        </button>
      </nav>

      <div className="admSideFooter">
        <div className="admMiniUser">
          <div className="admAvatar" />
          <div>
            <div className="admMiniUserName">Admin</div>
            <div className="admMiniUserSub">System access</div>
          </div>
        </div>

        <button className="admSideBtn" onClick={() => nav("/admin/supervisors")}>
          Manage supervisors
        </button>
      </div>
    </aside>
  );
}