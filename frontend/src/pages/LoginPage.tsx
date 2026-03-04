import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import placeholder from "../placeholder.png";

const AUTH_URL = "https://learn.reboot01.com/api/auth/signin";

function normalizeToken(raw: string) {
  // API sometimes returns token like `"...."` (quoted string)
  return raw.trim().replace(/^"|"$/g, "");
}

// Base64URL decode helper for JWT payload
function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getRoleFromPayload(payload: any): string | "" {
  if (!payload || typeof payload !== "object") return "";

  // Try common shapes
  const direct = payload.role || payload.Role;
  if (typeof direct === "string") return direct.toLowerCase();

  const userRole = payload.user?.role || payload.user?.Role;
  if (typeof userRole === "string") return userRole.toLowerCase();

  const nestedRole = payload.profile?.role || payload.profile?.Role;
  if (typeof nestedRole === "string") return nestedRole.toLowerCase();

  return "";
}

export default function LoginPage() {
  const nav = useNavigate();

  // keep variable name "email" to avoid changing your UI much
  // but it is actually identifier (username or email)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-redirect if jwt exists and not expired
  useEffect(() => {
    const rawToken = localStorage.getItem("jwt");
    const token = rawToken ? normalizeToken(rawToken) : "";

    if (!token) return;

    const payload = decodeJwtPayload(token);
    if (!payload) return;

    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp > currentTime) {
      const role = getRoleFromPayload(payload);
      if (role) localStorage.setItem("role", role);

      if (role === "admin") nav("/admin", { replace: true });
      else nav("/dashboard", { replace: true });
    }
  }, [nav]);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const identifier = email.trim();
    const pass = password;

    if (!identifier) {
      setError("Please enter your username or email.");
      setLoading(false);
      return;
    }
    if (!pass) {
      setError("Please enter your password.");
      setLoading(false);
      return;
    }

    try {
      const encoded = btoa(`${identifier}:${pass}`);

      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${encoded}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        setError("Invalid login. Please try again.");
        return;
      }

      const raw = await res.text();
      const token = normalizeToken(raw);

      // Store JWT
      localStorage.setItem("jwt", token);

      // Optional: derive role from token payload if present
      const payload = decodeJwtPayload(token);
      const role = getRoleFromPayload(payload);

      if (role) {
        localStorage.setItem("role", role);
        if (role === "admin") nav("/admin");
        else nav("/dashboard");
      } else {
        // If token doesn't contain role, choose a default route
        // (change this if you prefer /dashboard)
        nav("/admin");
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-5 bg-white">
      <div className="w-full max-w-[980px] h-auto lg:h-[560px] grid grid-cols-1 lg:grid-cols-2 rounded-[28px] overflow-hidden bg-white shadow-[0_40px_100px_rgba(0,0,0,0.25)]">
        {/* LEFT IMAGE */}
        <div
          className="relative h-[220px] lg:h-auto bg-center bg-cover"
          style={{ backgroundImage: `url(${placeholder})` }}
        >
          <div className="absolute bottom-10 left-10 text-white">
            <h2 className="text-[28px] leading-tight mb-2">Organize your workflow</h2>
            <p className="text-sm opacity-90">One board at a time.</p>
          </div>
        </div>

        {/* RIGHT FORM */}
        <div className="grid place-items-center p-10">
          <div className="w-full max-w-[340px]">
            <h1 className="text-[28px] mb-1.5 text-[#222]">Sign In</h1>
            <p className="text-sm text-[#666] mb-6">Access your workspace</p>

            <form onSubmit={onLogin} className="space-y-4">
              <input
                type="text"
                placeholder="Username or Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-[46px] px-3.5 rounded-xl border border-[#e5e5e5] text-sm outline-none transition focus:border-[#dc586d] focus:ring-4 focus:ring-[rgba(220,88,109,0.15)]"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[46px] px-3.5 rounded-xl border border-[#e5e5e5] text-sm outline-none transition focus:border-[#dc586d] focus:ring-4 focus:ring-[rgba(220,88,109,0.15)]"
              />

              {error && <div className="text-[13px] text-[#dc586d]">{error}</div>}

              <button
                className="w-full h-[46px] rounded-xl mt-2.5 text-white font-semibold transition disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(76,29,61,0.3)]"
                style={{ background: "linear-gradient(135deg, #4c1d3d, #a33757)" }}
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-7.5 text-xs text-center text-[#999]">© {new Date().getFullYear()} Your App</div>
          </div>
        </div>
      </div>
    </div>
  );
}