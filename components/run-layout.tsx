"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { LoadingBlock, TopBar } from "@/components/shell";
import { useSessionId } from "@/components/providers";
import { RunContext } from "@/components/run-context";
import { cn } from "@/lib/utils";
import { clockTime } from "@/lib/format";

export function RunLayout({ children }: { children: ReactNode }) {
  const { runId } = useParams<{ runId: string }>();
  const pathname = usePathname();
  const sessionId = useSessionId();
  const view = useQuery(api.discovery.getDiscovery, sessionId ? { sessionId, runId: runId as Id<"runs"> } : "skip");
  const tabs = [
    { href: `/r/${runId}`, label: "How it was found" },
    { href: `/r/${runId}/evidence`, label: "Sources" },
  ];

  return (
    <div className="min-h-screen">
      <TopBar />
      <div className="mx-auto max-w-[1400px] px-4 pt-5 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--airmail)] hover:underline">
          <ArrowLeft className="size-3.5" /> Back to memories
        </Link>
        {view ? (
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3 border-b border-border">
            <div className="pb-3">
              <h1 className="text-[22px] font-bold tracking-[-0.01em]">{view.intention?.title ?? "Search"}</h1>
              <p className="text-[13px] text-muted-foreground">
                {view.run.mode === "replay" ? `Replay of a run recorded at ${clockTime(view.run.recordedAt ?? view.run.startedAt)}` : `Live search at ${clockTime(view.run.startedAt)}`}
                {view.run.stale ? " · outdated, the intention changed" : ""}
              </p>
            </div>
            <nav className="flex gap-1">
              {tabs.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    "-mb-px border-b-2 px-3 py-2 text-[13.5px] font-semibold",
                    pathname === t.href ? "border-[var(--airmail)] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
          </div>
        ) : null}
      </div>
      <main className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6">
        {!sessionId || view === undefined ? (
          <LoadingBlock />
        ) : view === null ? (
          <p className="text-sm text-muted-foreground">This search belongs to another browser session.</p>
        ) : (
          <RunContext.Provider value={view}>{children}</RunContext.Provider>
        )}
      </main>
    </div>
  );
}
