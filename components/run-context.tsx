"use client";

import { createContext, useContext } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

export type RunView = NonNullable<FunctionReturnType<typeof api.discovery.getDiscovery>>;
export type OptionRow = RunView["options"][number];
export type CandidateRow = RunView["candidates"][number];
export type OpportunityRow = RunView["opportunities"][number];

export const RunContext = createContext<RunView | null>(null);

export function useRun(): RunView {
  const run = useContext(RunContext);
  if (!run) throw new Error("useRun must be used inside the run layout");
  return run;
}

export function providersOf(view: RunView): string[] {
  const out = new Set<string>();
  for (const e of view.events) {
    if (e.kind !== "telem_search" || !e.detail) continue;
    for (const r of (e.detail as { runs?: { provider: string }[] }).runs ?? []) out.add(r.provider);
  }
  return [...out];
}
