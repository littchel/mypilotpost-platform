"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query";
import { SessionProvider } from "@/context/SessionContext";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const qc = getQueryClient();
  return (
    <QueryClientProvider client={qc}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}
