"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Account } from "@/components/account";
import { LoadingBlock, SiteHeader } from "@/components/shell";
import { useSessionId } from "@/components/providers";
import { RunContext } from "@/components/run-context";
import { cn } from "@/lib/utils";
import { clockTime } from "@/lib/format";

export function RunLayout({ children }: { children: ReactNode }) {
  const { runId } = useParams<{ runId: string }>();
  const pathname = usePathname();
  const sessionId = useSessionId();
  const view = useQuery(api.discovery.getDiscovery, sessionId ? { sessionId, runId: runId as Id<"runs"> } : "skip");
  // Back to the board with this memory and intention open, not the first one.
  const back = view?.intention?.memoryId ? `/?m=${view.intention.memoryId}&i=${view.intention._id}` : "/";
  const tabs = [
    { href: `/r/${runId}`, label: "How we found these" },
    { href: `/r/${runId}/evidence`, label: "Sources" },
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader>
        <Account />
      </SiteHeader>
      <div className="mx-auto max-w-[1280px] px-5 pt-2">
        <Link href={back} className="-ml-1 inline-flex min-h-10 items-center gap-1.5 px-1 text-[13px] font-semibold text-[var(--airmail)] hover:underline">
          <ArrowLeft aria-hidden className="size-3.5" /> Back to memories
        </Link>
        {view ? (
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.02em]">{view.intention?.title ?? "Search"}</h1>
              <p className="text-[13px] text-muted-foreground">
                {view.run.mode === "replay" ? `Replay of a run recorded at ${clockTime(view.run.recordedAt ?? view.run.startedAt)}` : `Live search at ${clockTime(view.run.startedAt)}`}
                {view.run.stale ? " · outdated, the intention changed" : ""}
              </p>
            </div>
            <nav aria-label="Run views" className="flex gap-1 rounded-full bg-card p-1 shadow-sm">
              {tabs.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={pathname === t.href ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center rounded-full px-4 text-[13.5px] font-semibold transition",
                    pathname === t.href ? "bg-[var(--airmail)] text-white" : "text-muted-foreground hover:bg-[var(--chip)] hover:text-foreground",
                  )}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
          </div>
        ) : null}
      </div>
      <main className="mx-auto max-w-[1280px] px-5 pt-6 pb-12">
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
