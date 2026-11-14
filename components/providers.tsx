"use client";

import { ConvexProvider, ConvexReactClient, useMutation } from "convex/react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Toaster } from "@/components/ui/sonner";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const STORAGE_KEY = `wayfinder.session:${process.env.NEXT_PUBLIC_CONVEX_URL}`;

const SessionContext = createContext<Id<"demoSessions"> | null>(null);

function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<Id<"demoSessions"> | null>(null);
  const createSession = useMutation(api.intentions.createSession);
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage can be unavailable in private windows. A new session is created instead.
    }
    if (stored) {
      setSessionId(stored as Id<"demoSessions">);
      return;
    }
    void createSession({}).then((id) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, id);
      } catch {}
      setSessionId(id);
    });
  }, [createSession]);
  return <SessionContext.Provider value={sessionId}>{children}</SessionContext.Provider>;
}

/** Starts a fresh demo session in this browser, for example to try another persona. */
export function resetSession() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
  window.location.reload();
}

/** The demo session that owns this browser's intentions and runs. Null until it loads. */
export function useSessionId() {
  return useContext(SessionContext);
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <SessionProvider>{children}</SessionProvider>
      <Toaster position="bottom-right" />
    </ConvexProvider>
  );
}
