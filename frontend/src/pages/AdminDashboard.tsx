import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { apiFetch } from "../lib/api";
import "../admin.css";

type SupervisorRow = {
  supervisor_user_id: number;
  full_name: string;
  email: string;
  file_id: number;
  created_at: string;
};

type Role = "supervisor" | "student";

function RoleIcon({ role }: { role: Role }) {
  if (role === "supervisor") {
    // Shield
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 12.5l1.8 1.8L15.8 9.8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Graduation cap
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l10 5-10 5L2 8l10-5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M6 10.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M22 8v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminDashboard() {
  const nav = useNavigate();

  // Create user form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("supervisor");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Dashboard data
  const [supervisors, setSupervisors] = useState<SupervisorRow[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // student count placeholder until backend exists
  const [studentCount, setStudentCount] = useState<number>(0);

  async function loadSupervisors() {
    setStatsLoading(true);
    try {
      const res = await apiFetch("/admin/supervisors");
      setSupervisors(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    loadSupervisors();
    setStudentCount(0);
  }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setErr("");
    setLoading(true);

    try {
      await apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify({ full_name: fullName, email, password, role }),
      });

      setMsg(`${role === "supervisor" ? "Supervisor" : "Student"} created successfully.`);
      setFullName("");
      setEmail("");
      setPassword("");

      if (role === "supervisor") await loadSupervisors();
      if (role === "student") setStudentCount((p) => p + 1); // optimistic
    } catch (e: any) {
      setErr(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  const totalSupervisors = supervisors.length;

  const canSubmit =
    fullName.trim().length >= 2 &&
    email.trim().includes("@") &&
    password.trim().length >= 4 &&
    !loading;

  // purely for UI preview
  const initials = useMemo(() => {
    const n = fullName.trim();
    if (!n) return role === "supervisor" ? "SU" : "ST";
    return n
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }, [fullName, role]);

  return (
    <AdminLayout
      active="dashboard"
      title="Admin Dashboard"
      subtitle="Manage users and supervise the system."
      // right={
      //   <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      //     <button className="admSoftBtn" onClick={() => nav("/admin/supervisors")}>
      //       Supervisors
      //     </button>
      //     <button className="admPrimaryBtn" onClick={loadSupervisors} disabled={statsLoading}>
      //       {statsLoading ? "Refreshing..." : "Refresh"}
      //     </button>
      //   </div>
      // }
    >
      {/* KPI row (Supervisors + Students + Admin) */}
      <section className="admKpis">
        {/* Supervisors */}
        <div className="admCard admKpi">
          <div className="admCardHead">
            <div>
              <div className="admCardK">Supervisors</div>
              <div className="admCardV">{statsLoading ? "…" : totalSupervisors}</div>
            </div>

            <div className="admKpiIcon" aria-hidden="true" title="Supervisors">
              <span className="admPulseDot" />
            </div>
          </div>
          <div className="admMuted">Each supervisor has a workspace</div>
        </div>

        {/* Students */}
        <div className="admCard admKpi">
          <div className="admCardHead">
            <div>
              <div className="admCardK">Students</div>
              <div className="admCardV">{statsLoading ? "…" : studentCount}</div>
            </div>

            <div className="admKpiIcon admKpiIconStu" aria-hidden="true" title="Students">
              <span className="admBounceBar" />
              <span className="admBounceBar" />
              <span className="admBounceBar" />
            </div>
          </div>
          <div className="admMuted">Connect to stats endpoint later</div>
        </div>

        {/* Admin */}
        <div className="admCard admKpi">
          <div className="admCardHead">
            <div>
              <div className="admCardK">Admin</div>
              <div className="admCardV">System</div>
            </div>

            <div className="admKpiIcon" aria-hidden="true" title="Admin">
              <span className="admSpinRing" />
            </div>
          </div>
          <div className="admMuted">You’re managing the platform</div>
        </div>
      </section>

      {/* ONLY: Create user (no Quick actions, no Recent supervisors) */}
      <section className="admGrid">
        <div className="admCol" style={{ gridColumn: "1 / -1" }}>
          <section className="admCard">
            <div className="admCardTitleRow">
              <div>
                <div className="admCardTitle">Create user</div>
                <div className="admMuted">Pick a role first, then add details.</div>
              </div>

              <button
                className="admGhostBtn"
                type="button"
                onClick={() => {
                  setFullName("");
                  setEmail("");
                  setPassword("");
                  setErr("");
                  setMsg("");
                }}
              >
                Reset
              </button>
            </div>

            {/* role selector */}
            <div className="admRoleRow">
              <button
                type="button"
                className={`admRoleChip ${role === "supervisor" ? "isActive sup" : ""}`}
                onClick={() => setRole("supervisor")}
              >
                <span className="admRoleChipIcon">
                  <RoleIcon role="supervisor" />
                </span>
                <span className="admRoleChipText">
                  <span className="admRoleChipTitle">Supervisor</span>
                  <span className="admRoleChipSub">Creates a new workspace file</span>
                </span>
              </button>

              <button
                type="button"
                className={`admRoleChip ${role === "student" ? "isActive stu" : ""}`}
                onClick={() => setRole("student")}
              >
                <span className="admRoleChipIcon">
                  <RoleIcon role="student" />
                </span>
                <span className="admRoleChipText">
                  <span className="admRoleChipTitle">Student</span>
                  <span className="admRoleChipSub">Can be added to boards & tasks</span>
                </span>
              </button>
            </div>

            <form onSubmit={createUser} className="admForm" style={{ marginTop: 14 }}>
              <div className="admRow2">
                <label className="admField">
                  <span className="admLabel">Full name</span>
                  <input
                    className="admInput"
                    placeholder="e.g. Reem Alhalwachi"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                  />
                  <span className="admHelp">Minimum 2 characters.</span>
                </label>

                <label className="admField">
                  <span className="admLabel">Email</span>
                  <input
                    className="admInput"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <span className="admHelp">Must include “@”.</span>
                </label>
              </div>

              <div className="admRow2">
                <label className="admField">
                  <span className="admLabel">Temporary password</span>
                  <input
                    className="admInput"
                    placeholder="Set a temp password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <span className="admHelp">Minimum 4 characters.</span>
                </label>

                <div className="admField">
                  <span className="admLabel">Preview</span>

                  <div className="admPreviewBox">
                    <div className="admPreviewAvatar" aria-hidden="true">
                      {initials}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div className="admPreviewName">
                        {fullName.trim() || (role === "supervisor" ? "New Supervisor" : "New Student")}
                      </div>

                      <div className="admPreviewMeta">
                        <span className={`admPill ${role === "supervisor" ? "sup" : "stu"}`}>
                          <RoleIcon role={role} /> {role}
                        </span>

                        <span className="admTdMuted" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {email.trim() || "email@example.com"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="admMuted" style={{ marginTop: 10 }}>
                    Tip: Use the “Supervisors” button above to open workspaces after creating.
                  </div>
                </div>
              </div>

              {err && <div className="admAlert admAlertBad">{err}</div>}
              {msg && <div className="admAlert admAlertGood">{msg}</div>}

              <div className="admFormActions">
                <button className="admPrimaryBtn" disabled={!canSubmit}>
                  {loading ? "Creating..." : `Create ${role}`}
                </button>

                {/* <button type="button" className="admSoftBtn" onClick={loadSupervisors}>
                  Refresh supervisors count
                </button> */}
              </div>
            </form>
          </section>
        </div>
      </section>

      {/* small styles (paste-friendly). Move into admin.css later if you want */}
      <style>{`
        /* KPI icons */
        .admKpiIcon{
          width: 44px; height: 44px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: rgba(15,23,42,0.04);
          border: 1px solid rgba(15,23,42,0.10);
        }
        .admPulseDot{
          width: 10px; height: 10px;
          border-radius: 999px;
          background: rgba(37,99,235,0.95);
          box-shadow: 0 0 0 0 rgba(37,99,235,0.25);
          animation: admPulse 1.5s ease-in-out infinite;
        }
        @keyframes admPulse{
          0%{ box-shadow: 0 0 0 0 rgba(37,99,235,0.25); transform: scale(1); }
          70%{ box-shadow: 0 0 0 14px rgba(37,99,235,0.00); transform: scale(1.05); }
          100%{ box-shadow: 0 0 0 0 rgba(37,99,235,0.00); transform: scale(1); }
        }
        .admKpiIconStu{ display:flex; gap:5px; align-items:flex-end; justify-content:center; }
        .admBounceBar{
          width: 6px; border-radius: 6px;
          background: rgba(16,185,129,0.85);
          height: 10px;
          animation: admBounce 1.1s ease-in-out infinite;
        }
        .admBounceBar:nth-child(2){ animation-delay: .12s; height: 16px; opacity:.95; }
        .admBounceBar:nth-child(3){ animation-delay: .24s; height: 12px; opacity:.9; }
        @keyframes admBounce{
          0%,100%{ transform: translateY(0); }
          50%{ transform: translateY(-6px); }
        }
        .admSpinRing{
          width: 18px; height: 18px;
          border-radius: 999px;
          border: 2px solid rgba(15,23,42,0.18);
          border-top-color: rgba(168,85,247,0.9);
          animation: admSpin 1.2s linear infinite;
        }
        @keyframes admSpin{ to{ transform: rotate(360deg); } }

        /* Role selector */
        .admRoleRow{
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 2px;
        }
        @media (max-width: 900px){
          .admRoleRow{ grid-template-columns: 1fr; }
        }
        .admRoleChip{
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(15,23,42,0.10);
          background: #fff;
          display: flex;
          gap: 12px;
          padding: 12px;
          cursor: pointer;
          transition: transform .14s ease, box-shadow .14s ease, border-color .14s ease;
          box-shadow: 0 10px 26px rgba(15,23,42,0.06);
          text-align: left;
        }
        .admRoleChip:hover{ transform: translateY(-1px); box-shadow: 0 14px 30px rgba(15,23,42,0.08); }
        .admRoleChip.isActive{
          border-color: rgba(59,130,246,0.25);
          box-shadow: 0 18px 38px rgba(59,130,246,0.10);
        }
        .admRoleChip.isActive.sup{ border-color: rgba(37,99,235,0.35); box-shadow: 0 18px 38px rgba(37,99,235,0.12); }
        .admRoleChip.isActive.stu{ border-color: rgba(16,185,129,0.35); box-shadow: 0 18px 38px rgba(16,185,129,0.12); }
        .admRoleChipIcon{
          width: 42px; height: 42px;
          border-radius: 14px;
          border: 1px solid rgba(15,23,42,0.10);
          background: rgba(15,23,42,0.03);
          display: grid;
          place-items: center;
          color: rgba(15,23,42,0.85);
          flex: 0 0 42px;
        }
        .admRoleChipTitle{ font-weight: 950; color: rgba(15,23,42,0.92); line-height: 1.1; }
        .admRoleChipSub{ font-size: 12px; color: rgba(15,23,42,0.55); margin-top: 2px; }
        .admRoleChipText{ display: grid; }

        /* helper text */
        .admHelp{
          display:block;
          margin-top: 6px;
          font-size: 12px;
          color: rgba(15,23,42,0.55);
        }

        /* Preview box */
        .admPreviewBox{
          display:flex;
          gap: 12px;
          align-items:center;
          padding: 12px;
          border-radius: 16px;
          border: 1px solid rgba(15,23,42,0.10);
          background: rgba(15,23,42,0.02);
        }
        .admPreviewAvatar{
          width: 44px; height: 44px;
          border-radius: 999px;
          border: 1px solid rgba(15,23,42,0.14);
          background: rgba(15,23,42,0.05);
          display:grid;
          place-items:center;
          font-weight: 950;
          color: rgba(15,23,42,0.85);
        }
        .admPreviewName{
          font-weight: 950;
          color: rgba(15,23,42,0.92);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .admPreviewMeta{
          margin-top: 6px;
          display:flex;
          align-items:center;
          gap: 8px;
          min-width: 0;
        }
        .admPill.sup{
          border-color: rgba(37,99,235,0.20);
          background: rgba(37,99,235,0.06);
          color: rgba(37,99,235,0.92);
        }
        .admPill.stu{
          border-color: rgba(16,185,129,0.20);
          background: rgba(16,185,129,0.06);
          color: rgba(16,185,129,0.92);
        }
        .admPill svg{ vertical-align: middle; margin-right: 6px; }
      `}</style>
    </AdminLayout>
  );
}