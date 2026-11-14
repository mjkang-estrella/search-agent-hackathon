"use client";

import Link from "next/link";
import { ArrowRight, Check, CircleAlert, CircleDashed, Loader2, Minus, SkipForward } from "lucide-react";
import { Panel, SectionLabel } from "@/components/shell";
import { Postmark, SyntheticTag } from "@/components/stamps";
import { useRun, type RunView } from "@/components/run-context";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clockTime, hostOf, seconds } from "@/lib/format";
import { RUN_STAGES, type RunStage } from "@/lib/contracts";

const STAGE_LABEL: Record<RunStage, string> = {
  created: "Created",
  solution_planning: "Plan",
  discovery: "Discover",
  compatibility_checks: "Check both sides",
  followup_decision: "Follow-up",
  evidence_verification: "Verify quotes",
  ranking: "Rank",
  complete: "Done",
};

type Event = RunView["events"][number];
type SearchDetail = {
  queries?: string[];
  routing?: { query: string; topic: string | null; providers: string[] }[] | null;
  runs?: { provider: string; query: string; status: string; resultCount: number; latencyMs: number | null; error: string | null }[];
  duplicates?: number;
  interactionId?: string | null;
};

export default function FollowDiscovery() {
  const view = useRun();
  const { run, events } = view;
  const solutions = view.hypotheses.filter((h) => h.kind === "solution");
  const capabilities = view.hypotheses.filter((h) => h.kind === "capability" && h.origin === "llm_inference");
  const revealed = view.hypotheses.filter((h) => h.origin === "public_evidence");
  const publicEvents = events.filter((e) => e.kind === "telem_search" || e.kind === "telem_fetch" || e.kind === "guard");
  const memberEvents = events.filter((e) => e.kind === "retrieval");

  return (
    <div className="flex flex-col gap-5">
      <StageStrip view={view} />

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)_minmax(0,1fr)]">
        <Panel className="self-start p-5">
          <h2 className="mb-1 text-[15px] font-bold">What the model inferred</h2>
          <p className="mb-3 text-[12.5px] text-muted-foreground">From the intention alone, before any search.</p>
          <ul className="grid gap-2.5">
            {solutions.map((h) => (
              <li key={h._id} className="grid grid-cols-[1fr_auto] items-start gap-3 text-[13.5px]">
                <span>{h.text}</span>
                <Postmark kind="inferred" size="sm" detail="LLM" />
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-border pt-3">
            <SectionLabel>Capabilities searched among members</SectionLabel>
            <ul className="grid gap-1.5 text-[13px]">
              {capabilities.map((h) => (
                <li key={h._id}>{h.text}</li>
              ))}
            </ul>
          </div>
          {revealed.length ? (
            <div className="mt-4 border-t border-border pt-3">
              <SectionLabel>Found in public sources</SectionLabel>
              <ul className="grid gap-2 text-[13px]">
                {revealed.map((h) => (
                  <li key={h._id} className="grid grid-cols-[1fr_auto] items-start gap-3">
                    <span>
                      <span className="font-semibold">{h.text}</span>
                      <span className="block text-xs text-muted-foreground">{h.rationale} Member search ran again with this capability.</span>
                    </span>
                    <Postmark kind="public" size="sm" detail={h.sourceUrl ? hostOf(h.sourceUrl) : "Telem"} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Panel>

        <Panel className="min-w-0 self-start">
          <BranchHead title="Public evidence" sub="Telem search and page reads" status={run.branches.public} />
          <div className="px-5 py-3">
            {publicEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">{run.branches.public === "skipped" ? "Skipped in this run." : "Waiting for the first search."}</p>
            ) : (
              <ol className="grid gap-3">
                {publicEvents.map((e) => (
                  <PublicEvent key={e._id} event={e} />
                ))}
              </ol>
            )}
          </div>
        </Panel>

        <Panel className="min-w-0 self-start">
          <BranchHead title="Approved member intentions" sub="Vector search inside Wayfinder" status={run.branches.members} />
          <div className="px-5 py-3">
            {memberEvents.map((e) => {
              const d = e.detail as { queries?: { label: string; text: string }[]; top?: { name: string; similarity: number; by: string[] }[] } | null;
              return (
                <div key={e._id} className="mb-3 last:mb-0">
                  <p className="text-[13px] font-semibold">
                    {e.label} <span className="font-normal text-muted-foreground">· {seconds(e.durationMs)}</span>
                  </p>
                  {d?.queries ? (
                    <ul className="mt-1 grid gap-0.5 text-[12.5px] text-[var(--ink-muted)]">
                      {d.queries.map((q, i) => (
                        <li key={i}>
                          <span className="font-semibold text-foreground">{q.label}</span>: {q.text}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
            {view.candidates.length ? (
              <div className="mt-3 border-t border-border pt-3">
                <SectionLabel aside="similarity is a retrieval diagnostic">Members after both checks</SectionLabel>
                <ul className="grid gap-1.5">
                  {view.candidates.map((c) => (
                    <li key={c._id} className="grid grid-cols-[1fr_auto] items-center gap-3 text-[13px]">
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 font-semibold">
                          {c.member.displayName} <SyntheticTag>Synthetic</SyntheticTag>
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{c.networkCard.title}</span>
                      </span>
                      <span className="text-right text-xs">
                        <CandidateStatus status={c.status} outcome={c.counterpart?.outcome} />
                        <span className="block text-muted-foreground tabular-nums">{c.similarity.toFixed(2)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : memberEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Waiting for member retrieval.</p>
            ) : null}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel className="p-5">
          <h2 className="mb-2 text-[15px] font-bold">Follow-up search decision</h2>
          {run.followUp.status === "pending" ? (
            <p className="text-sm text-muted-foreground">Decided after both sides are checked.</p>
          ) : (
            <div className="text-[13.5px]">
              <p className="font-semibold">
                {run.followUp.status === "skipped" ? "Skipped" : run.followUp.status === "running" ? "Searching again" : run.followUp.status === "succeeded" ? "Ran one follow-up search" : "Follow-up search failed"}
              </p>
              {run.followUp.question ? (
                <p className="mt-1">
                  <span className="text-muted-foreground">Open question: </span>
                  {run.followUp.question}
                </p>
              ) : null}
              {run.followUp.affects ? (
                <p className="mt-1">
                  <span className="text-muted-foreground">Could change: </span>
                  {run.followUp.affects}
                </p>
              ) : null}
              {run.followUp.reason ? <p className="mt-1 text-[var(--ink-muted)]">{run.followUp.reason}</p> : null}
            </div>
          )}
        </Panel>
        <Panel className="flex flex-col justify-between gap-3 p-5">
          <div>
            <h2 className="mb-1 text-[15px] font-bold">{run.status === "running" ? "Discovery is running" : "Ready to compare"}</h2>
            <p className="text-[13.5px] text-muted-foreground">
              {run.status === "running"
                ? "Results appear stage by stage. Partial results stay visible if a provider or page fails."
                : `${view.options.filter((o) => !o.excluded).length} ways forward from ${view.opportunities.length} public opportunities and ${view.candidates.filter((c) => c.status === "checked").length} checked members.`}
            </p>
            {run.error ? <p className="mt-2 text-[13px] text-[var(--airmail-red)]">{run.error}</p> : null}
          </div>
          <Link href="/" className={cn(buttonVariants({ size: "lg" }), "h-10 self-start px-4 font-bold", run.status === "running" && "pointer-events-none opacity-50")}>
            See ways forward <ArrowRight data-icon="inline-end" />
          </Link>
        </Panel>
      </div>

      <Panel>
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-[15px] font-bold">Run log</h2>
          <p className="text-[12.5px] text-muted-foreground">Decisions and tool calls as they happened. Model reasoning is not shown.</p>
        </div>
        <ol className="max-h-[420px] overflow-auto px-5 py-2 text-[13px]">
          {events.map((e) => (
            <li key={e._id} className="grid grid-cols-[64px_120px_minmax(0,1fr)_64px] items-start gap-3 border-b border-dashed border-border py-1.5 last:border-b-0 max-md:grid-cols-[56px_minmax(0,1fr)]">
              <span className="text-muted-foreground tabular-nums">{clockTime(e.at)}</span>
              <span className="text-xs font-semibold text-muted-foreground max-md:hidden">{STAGE_LABEL[e.stage as RunStage]}</span>
              <span>
                <EventIcon status={e.status} /> {e.label}
                {e.error ? <span className="block text-xs text-[var(--airmail-red)]">{e.error}</span> : null}
              </span>
              <span className="text-right text-muted-foreground tabular-nums max-md:hidden">{e.durationMs ? seconds(e.durationMs) : ""}</span>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}

function StageStrip({ view }: { view: RunView }) {
  const current = RUN_STAGES.indexOf(view.run.stage as RunStage);
  const stages = RUN_STAGES.filter((s) => s !== "created");
  return (
    <Panel className="overflow-x-auto px-5 py-3">
      <ol className="flex min-w-[720px] items-center gap-2">
        {stages.map((s, i) => {
          const idx = RUN_STAGES.indexOf(s);
          const done = idx < current || view.run.stage === "complete";
          const active = idx === current && view.run.status === "running";
          const skipped = s === "followup_decision" && view.run.followUp.status === "skipped";
          const failed = view.run.status === "failed" && idx === current;
          const stageEvents = view.events.filter((e) => e.stage === s && e.durationMs);
          const ms = stageEvents.reduce((m, e) => Math.max(m, e.durationMs ?? 0), 0);
          return (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[11px] font-bold",
                  failed ? "border-[var(--airmail-red)] text-[var(--airmail-red)]" : done ? "border-[var(--airmail)] bg-[var(--airmail)] text-white" : active ? "border-[var(--airmail)] text-[var(--airmail)]" : "border-border text-muted-foreground",
                )}
              >
                {failed ? <CircleAlert className="size-3.5" /> : skipped ? <SkipForward className="size-3" /> : done ? <Check className="size-3.5" /> : active ? <Loader2 className="size-3.5 animate-spin" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={cn("block text-[12.5px] font-semibold whitespace-nowrap", !done && !active && "text-muted-foreground")}>{STAGE_LABEL[s]}</span>
                <span className="block text-[11px] text-muted-foreground">{skipped ? "skipped" : s === "discovery" ? "public + members" : ms ? seconds(ms) : ""}</span>
              </span>
              {i < stages.length - 1 ? <span aria-hidden className={cn("h-px flex-1", done ? "bg-[var(--airmail)]" : "bg-border")} /> : null}
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

function BranchHead({ title, sub, status }: { title: string; sub: string; status: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
      <div>
        <h2 className="text-[15px] font-bold">{title}</h2>
        <p className="text-[12.5px] text-muted-foreground">{sub}</p>
      </div>
      <span className={cn("text-xs font-bold tracking-[0.08em] uppercase", status === "failed" ? "text-[var(--airmail-red)]" : status === "partial" ? "text-[var(--kraft-ink)]" : "text-[var(--airmail)]")}>
        {status}
      </span>
    </div>
  );
}

function PublicEvent({ event: e }: { event: Event }) {
  if (e.kind === "telem_search") {
    const d = (e.detail ?? {}) as SearchDetail;
    const byProvider = new Map<string, { results: number; failed: number }>();
    for (const r of d.runs ?? []) {
      const x = byProvider.get(r.provider) ?? { results: 0, failed: 0 };
      x.results += r.resultCount;
      if (r.status !== "succeeded") x.failed++;
      byProvider.set(r.provider, x);
    }
    return (
      <li className="text-[13px]">
        <p className="font-semibold">
          <EventIcon status={e.status} /> {e.label} <span className="font-normal text-muted-foreground">· {seconds(e.durationMs)}</span>
        </p>
        {d.queries ? (
          <ul className="mt-1 grid gap-0.5 text-[12.5px]">
            {d.queries.map((q, i) => (
              <li key={i} className="text-[var(--ink-muted)]">
                “{q}”
              </li>
            ))}
          </ul>
        ) : null}
        {byProvider.size ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[...byProvider.entries()].map(([p, x]) => (
              <span key={p} className={cn("rounded border px-1.5 py-0.5 text-[11.5px]", x.failed ? "border-[var(--kraft)] bg-[var(--kraft-soft)]" : "border-border bg-white")}>
                <b className="font-semibold">{p}</b> {x.results}
                {x.failed ? ` · ${x.failed} failed` : ""}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">
          {d.routing ? "Automatic routing chose these providers per query. " : "Routing data was not returned. "}
          {d.duplicates ? `${d.duplicates} duplicate results merged, attribution kept.` : ""}
        </p>
        {e.error ? <p className="text-xs text-[var(--airmail-red)]">{e.error}</p> : null}
      </li>
    );
  }
  const d = (e.detail ?? {}) as { url?: string; cacheState?: string | null; query?: string };
  return (
    <li className="flex items-start gap-2 text-[13px]">
      <EventIcon status={e.status} />
      <span className="min-w-0">
        {e.label}
        {e.kind === "telem_fetch" ? <span className="text-muted-foreground"> · {seconds(e.durationMs)}{d.cacheState ? ` · Telem cache: ${d.cacheState}` : ""}</span> : null}
        {d.query ? <span className="block text-xs text-muted-foreground">“{d.query}”</span> : null}
        {e.error ? <span className="block text-xs text-[var(--airmail-red)]">{e.error}</span> : null}
      </span>
    </li>
  );
}

function EventIcon({ status }: { status: string }) {
  const cls = "inline size-3.5 align-[-2px]";
  if (status === "failed") return <CircleAlert className={cn(cls, "text-[var(--airmail-red)]")} />;
  if (status === "skipped") return <Minus className={cn(cls, "text-muted-foreground")} />;
  if (status === "started") return <CircleDashed className={cn(cls, "text-[var(--airmail)]")} />;
  if (status === "partial") return <CircleAlert className={cn(cls, "text-[var(--kraft)]")} />;
  return <Check className={cn(cls, "text-[var(--airmail)]")} />;
}

function CandidateStatus({ status, outcome }: { status: string; outcome?: string }) {
  if (status === "rejected") return <span className="font-semibold text-[var(--airmail-red)]">Excluded</span>;
  if (status === "checked") return <span className="font-semibold text-[var(--airmail)]">{outcome === "needs_input" ? "Needs input" : "Compatible"}</span>;
  if (status === "shortlisted") return <span className="font-semibold">Passed your check</span>;
  return <span className="text-muted-foreground">Retrieved</span>;
}
