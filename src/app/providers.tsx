"use client";

import { QueryClientProvider } from "@tanstack/react-query";

import {
  getAccessToken,
  refreshAccessToken,
  watchSessionChanges,
} from "@/features/auth/api";
import { setApiAuth } from "@/lib/axios";
import { getQueryClient } from "@/lib/query-client";

// API Auth
// Registered while the module loads, so it is in place before any request.
if (typeof window !== "undefined") {
  setApiAuth({ getAccessToken, refreshAccessToken });
  watchSessionChanges();
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}
