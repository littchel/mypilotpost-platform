// In dev, VITE_API_URL is set to http://localhost:8787 (wrangler default).
// In production, it must be set to https://api.mypilotpost.com via deployment env vars.
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

/**
 * Global API Request Wrapper
 * (V1.1.1 Contract Aligned)
 */
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("mpp_token");

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
      ...(options.headers || {})
    }
  });

  // Handle 204 No Content
  if (res.status === 204) return null;

  const data = await res.json();

  if (!res.ok) {
    const message = data.message || data.error || "An unknown error occurred";
    const err = new Error(message);
    err.error = data.error || "UNKNOWN_ERROR";
    err.code = data.code || data.error || "UNKNOWN_ERROR";
    err.detail = data.detail || null;
    err.status = res.status;
    throw err;
  }

  return data;
}
/**
 * Safe API Fetch Wrapper (Hardening Mode)
 * Enforces status: "loading" | "empty" | "error" | "success"
 * 
 * Rules:
 * - null -> ERROR
 * - [] -> EMPTY
 */
export async function apiSafeFetch(endpoint, options = {}) {
  try {
    const data = await apiRequest(endpoint, options);
    
    if (data === null) {
      return { status: "error", data: null };
    }
    
    if (Array.isArray(data) && data.length === 0) {
      return { status: "empty", data: [] };
    }

    return { status: "success", data };
  } catch (err) {
    console.error(`SafeFetch Error [${endpoint}]:`, err);
    return { status: "error", data: null };
  }
}
