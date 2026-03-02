import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, setToken } from "../lib/api";
import "../login.css";

export default function LoginPage() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setToken(data.token);
      localStorage.setItem("role", data.role);

      if (data.role === "admin") nav("/admin");
      else nav("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="authWrapper">
      <div className="authCard">
        
        {/* LEFT IMAGE */}
        <div className="imagePanel">
          <div className="imageOverlay">
            <h2>Organize your workflow</h2>
            <p>One board at a time.</p>
          </div>
        </div>

        {/* RIGHT FORM */}
        <div className="formPanel">
          <div className="formContainer">
            <h1>Sign In</h1>
            <p className="formSub">Access your workspace</p>

            <form onSubmit={onLogin}>
              <div className="inputGroup">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="inputGroup">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && <div className="errorMsg">{error}</div>}

              <button className="primaryBtn" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="formFooter">
              © {new Date().getFullYear()} Your App
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}