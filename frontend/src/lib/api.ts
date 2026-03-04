const API_URL = "http://localhost:8080";

// ✅ No token/JWT anymore

export function clearAuth() {
  // keep only what you still use
  localStorage.removeItem("role");
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = data?.error || "Request failed";
    throw new Error(msg);
  }

  return data;
}