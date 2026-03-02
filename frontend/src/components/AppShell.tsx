import { clearToken } from "../lib/api";
import { useNavigate } from "react-router-dom";

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  showLogout?: boolean;
};

export default function AppShell({
  title,
  subtitle,
  right,
  children,
  showLogout = false,
}: Props) {
  const nav = useNavigate();

  function logout() {
    clearToken();
    nav("/login");
  }

return (
  <div className="shell">
    <div className="container shellInner">
      <div className="shellTop">
        <div>
          <div className="shellKicker">TaskFlow • Admin Console</div>
          <h1 className="shellTitle">{title}</h1>
          {subtitle && <p className="shellSub">{subtitle}</p>}
        </div>

        <div className="shellActions">
          {right}
          {showLogout && (
            <button className="aBtn aBtnOutline" onClick={logout}>
              Logout
            </button>
          )}
        </div>
      </div>

      {children}
    </div>
  </div>
);
}