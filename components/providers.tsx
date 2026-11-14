"use client";

import { ConvexReactClient, useConvexAuth, useMutation } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Toaster } from "@/components/ui/sonner";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const STORAGE_KEY = `relay.session:${process.env.NEXT_PUBLIC_CONVEX_URL}`;
// Boards saved before the rename to Relay keep working.
const LEGACY_STORAGE_KEY = `wayfinder.session:${process.env.NEXT_PUBLIC_CONVEX_URL}`;

function readStored(): string | undefined {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY) ?? undefined;
  } catch {
    // Storage can be unavailable in private windows. A new board is created instead.
    return undefined;
  }
}

function store(id: string | null) {
  try {
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {}
}

const SessionContext = createContext<Id<"demoSessions"> | null>(null);

/**
 * Picks the board for this browser. Guests keep a board by its stored id. Signing in claims that board,
 * or opens the user's own board on another device. Signing out starts a new guest board.
 */
function SessionProvider({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const authState = isLoading ? "loading" : isAuthenticated ? "signedIn" : "guest";
  // The board belongs to the auth state it was opened for, so a stale board is never shown after signing in or out.
  const [opened, setOpened] = useState<{ authState: string; id: Id<"demoSessions"> } | null>(null);
  const openSession = useMutation(api.sessions.openSession);
  useEffect(() => {
    if (authState === "loading") return;
    let cancelled = false;
    void openSession({ stored: readStored() }).then((id) => {
      if (cancelled) return;
      store(id);
      setOpened({ authState, id });
    });
    return () => {
      cancelled = true;
    };
  }, [authState, openSession]);
  const sessionId = opened?.authState === authState ? opened.id : null;
  return <SessionContext.Provider value={sessionId}>{children}</SessionContext.Provider>;
}

/** Starts an empty board. A signed-in user's memory MCP link moves to it. */
export function useStartOver() {
  const startOver = useMutation(api.sessions.startOver);
  return async () => {
    store(await startOver({}));
    window.location.reload();
  };
}

/** Forgets this browser's board, so signing out never leaves a signed-in board on screen. */
export function forgetSession() {
  store(null);
}

/** The board this browser shows. Null until it loads. */
export function useSessionId() {
  return useContext(SessionContext);
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider
      client={convex}
      api={{ refreshSession: api.auth.refreshSession, signOut: api.auth.signOut, isAuthenticated: api.auth.isAuthenticated }}
    >
      <SessionProvider>{children}</SessionProvider>
      <Toaster position="bottom-right" />
    </ConvexAuthProvider>
  );
}
