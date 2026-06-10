import type { AdminSession, AdminRole } from "@/types";

const TOKEN_KEY = "adminToken";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function base64urlDecode(str: string): string {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
}

export function decodeSession(token: string): AdminSession | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64urlDecode(parts[1]));
    return payload as AdminSession;
  } catch {
    return null;
  }
}

export function getSession(): AdminSession | null {
  const token = getToken();
  if (!token) return null;
  const session = decodeSession(token);
  if (!session) return null;
  if (session.exp && Date.now() / 1000 > session.exp) {
    clearToken();
    return null;
  }
  return session;
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

export function getRole(): AdminRole | null {
  return getSession()?.role ?? null;
}

export function logout(): void {
  clearToken();
  if (typeof window !== "undefined") {
    window.location.href = "/login/";
  }
}
