const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8788";

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
    throw {
      error: data.error || "An unknown error occurred",
      code: data.code || "UNKNOWN_ERROR",
      detail: data.detail || null,
      status: res.status
    };
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
