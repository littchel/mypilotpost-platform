"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { AdminSession } from "@/types";
import { getSession, clearToken } from "@/lib/auth";

interface SessionContextValue {
  session: AdminSession | null;
  loading: boolean;
  refresh: () => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  loading: true,
  refresh: () => {},
  logout: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setSession(getSession());
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setSession(null);
    window.location.href = "/login/";
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ session, loading, refresh, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
