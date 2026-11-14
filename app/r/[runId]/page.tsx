"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Check, ChevronDown, CircleAlert, CircleDashed, Loader2, Minus } from "lucide-react";
import { Panel } from "@/components/shell";
import { Postmark, SyntheticTag } from "@/components/stamps";
import { useRun, type RunView } from "@/components/run-context";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clockTime, hostOf, seconds } from "@/lib/format";
import { RUN_STAGES, type RunStage } from "@/lib/contracts";

type Status = "done" | "active" | "pending" | "skipped" | "failed" | "partial";
type Event = RunView["events"][number];
type SearchDetail = {
  queries?: string[];
  runs?: { provider: string; resultCount: number; status: string }[];
};

/** "How we found these": the run as a flow chart. Each step shows one count; details stay collapsed. */
export default function FollowDiscovery() {
  const view = useRun();
  const { run, events } = view;
  const stageStatus = useStageStatus(view);

  const solutions = view.hypotheses.filter((h) => h.kind === "solution");
  const capabilities = view.hypotheses.filter((h) => h.kind === "capability" && h.origin === "llm_inference");
  const leads = view.hypotheses.filter((h) => h.origin === "public_evidence");

  const searches = events.filter((e) => e.kind === "telem_search");
  const queries = searches.flatMap((e) => (e.detail as SearchDetail | null)?.queries ?? []);
  const providers = providerTotals(searches);
  const pagesRead = view.sources.filter((s) => s.fetch.status === "succeeded").length;
  const memberSearches = events.filter((e) => e.kind === "retrieval");

  const checked = view.candidates.filter((c) => c.status === "checked");
  const excluded = view.candidates.filter((c) => c.status === "rejected");
  const conditions = view.opportunities.flatMap((o) => o.conditions);
  const quotesFound = conditions.filter((c) => c.status === "confirmed").length;
  const ways = view.options.filter((o) => !o.excluded).length;
  const running = run.status === "running";

  const fu = run.followUp;
  const followUpText = fu.status === "skipped" ? "Not needed" : fu.status === "running" ? "Searching again" : fu.status === "succeeded" ? "Searched once more" : fu.status === "failed" ? "Failed" : "Waiting";

  return (
    <div className="mx-auto flex max-w-[760px] flex-col items-stretch pb-10">
      <Step
        status="done"
        title="Intention"
        summary={view.intention?.title ?? "Your intention"}
      />
      <Connector on={stageStatus("solution_planning") !== "pending"} />

      <Step
        status={stageStatus("solution_planning")}
        title="Ideas"
        summary={`${solutions.length} ways · ${capabilities.length} helpers to look for`}
        badge={<Postmark kind="inferred" size="sm" detail="LLM" tilt={-3} />}
      >
        <DetailList label="Ways" items={solutions.map((h) => h.text)} />
        <DetailList label="Helpers" items={capabilities.map((h) => h.text)} />
      </Step>

      <Fork on={stageStatus("discovery") !== "pending"} />
      <div className="grid grid-cols-2 gap-4">
        <Step
          status={branchStatus(run.branches.public)}
          title="Public web"
          summary={run.branches.public === "skipped" ? "Skipped" : `${queries.length} searches · ${view.sources.length} sources`}
          meta="Telem"
        >
          <DetailList label="Searches" items={queries.map((q) => `“${q}”`)} />
          {providers.length ? (
            <div>
              <DetailLabel>Providers</DetailLabel>
              <div className="flex flex-wrap gap-1.5">
                {providers.map(([p, n]) => (
                  <span key={p} className="rounded border border-border bg-white px-1.5 py-0.5 text-[11.5px]">
                    <b className="font-semibold">{p}</b> {n}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {pagesRead ? <p className="text-[12.5px] text-[var(--ink-muted)]">{pagesRead} pages read</p> : null}
          {leads.length ? (
            <div>
              <DetailLabel>New leads</DetailLabel>
              <ul className="grid gap-1 text-[13px]">
                {leads.map((h) => (
                  <li key={h._id}>
                    {h.text}
                    {h.sourceUrl ? <span className="text-muted-foreground"> · {hostOf(h.sourceUrl)}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Step>
        <Step
          status={branchStatus(run.branches.members)}
          title="Members"
          summary={`${view.candidates.length} matched`}
          meta="Sample"
        >
          {memberSearches.map((e) => {
            const d = e.detail as { queries?: { label: string; text: string }[] } | null;
            return <DetailList key={e._id} label={e.label} items={(d?.queries ?? []).map((q) => `${q.label}: ${q.text}`)} />;
          })}
        </Step>
      </div>
      <Merge on={stageStatus("compatibility_checks") !== "pending"} />

      <Step
        status={stageStatus("compatibility_checks")}
        title="Check both sides"
        summary={view.candidates.length ? `${checked.length} fit · ${excluded.length} excluded` : "No members to check"}
      >
        {view.candidates.length ? (
          <ul className="grid gap-1.5">
            {view.candidates.map((c) => (
              <li key={c._id} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate font-semibold">{c.member.displayName}</span>
                  <SyntheticTag>Sample</SyntheticTag>
                </span>
                <CandidateStatus status={c.status} outcome={c.counterpart?.outcome} />
              </li>
            ))}
          </ul>
        ) : null}
      </Step>
      <Connector on={stageStatus("followup_decision") !== "pending"} />

      <Step
        status={fu.status === "skipped" ? "skipped" : stageStatus("followup_decision")}
        title="Follow-up"
        summary={followUpText}
      >
        {fu.question ? <DetailRow label="Question">{fu.question}</DetailRow> : null}
        {fu.affects ? <DetailRow label="Could change">{fu.affects}</DetailRow> : null}
        {fu.reason ? <DetailRow label="Why">{fu.reason}</DetailRow> : null}
      </Step>
      <Connector on={stageStatus("evidence_verification") !== "pending"} />

      <Step
        status={stageStatus("evidence_verification")}
        title="Verify quotes"
        summary={conditions.length ? `${quotesFound} of ${conditions.length} quotes found on the page` : "Nothing to verify"}
      >
        {view.opportunities.length ? (
          <Link href={`/r/${run._id}/evidence`} className="text-[13px] font-semibold text-[var(--airmail)] hover:underline">
            See every source and quote
          </Link>
        ) : null}
      </Step>
      <Connector on={stageStatus("ranking") !== "pending"} />

      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-lg px-5 py-4",
          running ? "border border-dashed border-border bg-card" : "bg-[var(--airmail)] text-white",
        )}
      >
        <div>
          <p className="text-[15px] font-bold">{running ? "Finding ways…" : `${ways} ways forward`}</p>
          {run.error ? <p className="mt-0.5 text-[13px] text-[var(--airmail-red)]">{run.error}</p> : null}
        </div>
        <Link
          href="/"
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-10 px-4 font-bold",
            running ? "pointer-events-none opacity-50" : "bg-white text-[var(--airmail)] hover:bg-[var(--airmail-ink)]",
          )}
        >
          See them <ArrowRight data-icon="inline-end" />
        </Link>
      </div>

      <RunLog events={events} />
    </div>
  );
}

function useStageStatus(view: RunView) {
  const current = RUN_STAGES.indexOf(view.run.stage as RunStage);
  return (s: RunStage): Status => {
    const idx = RUN_STAGES.indexOf(s);
    if (view.run.stage === "complete" || idx < current) return "done";
    if (idx === current) return view.run.status === "failed" ? "failed" : view.run.status === "running" ? "active" : "done";
    return "pending";
  };
}

function branchStatus(s: RunView["run"]["branches"]["public"]): Status {
  if (s === "succeeded") return "done";
  if (s === "running") return "active";
  return s;
}

function providerTotals(searches: Event[]): [string, number][] {
  const totals = new Map<string, number>();
  for (const e of searches) {
    for (const r of (e.detail as SearchDetail | null)?.runs ?? []) totals.set(r.provider, (totals.get(r.provider) ?? 0) + r.resultCount);
  }
  return [...totals.entries()];
}

function Step({ status, title, summary, meta, badge, children }: { status: Status; title: string; summary: string; meta?: string; badge?: ReactNode; children?: ReactNode }) {
  const head = (
    <div className="flex items-start gap-3">
      <StatusDot status={status} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
          {title}
          {meta ? <span className="font-semibold tracking-normal normal-case">· {meta}</span> : null}
        </p>
        <p className={cn("mt-0.5 text-[14.5px] leading-snug font-semibold text-balance", status === "pending" && "text-muted-foreground")}>{summary}</p>
      </div>
      {badge ? <span className="hidden shrink-0 sm:block">{badge}</span> : null}
      {children ? <ChevronDown aria-hidden className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /> : null}
    </div>
  );
  const box = cn("rounded-lg border bg-card", status === "active" ? "border-[var(--airmail)]" : status === "failed" ? "border-[var(--airmail-red)]" : "border-border");
  if (!children) return <Panel className={cn(box, "px-4 py-3")}>{head}</Panel>;
  return (
    <Panel className={box}>
      <details className="group">
        <summary className="cursor-pointer list-none rounded-lg px-4 py-3 hover:bg-[var(--soft)] focus-visible:outline-2 focus-visible:outline-[var(--airmail)] [&::-webkit-details-marker]:hidden">
          {head}
        </summary>
        <div className="grid gap-3 border-t border-border px-4 py-3">{children}</div>
      </details>
    </Panel>
  );
}

function StatusDot({ status }: { status: Status }) {
  const base = "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px]";
  if (status === "done") return <span className={cn(base, "border-[var(--airmail)] bg-[var(--airmail)] text-white")}><Check className="size-3.5" /></span>;
  if (status === "active") return <span className={cn(base, "border-[var(--airmail)] text-[var(--airmail)]")}><Loader2 className="size-3.5 animate-spin" /></span>;
  if (status === "failed") return <span className={cn(base, "border-[var(--airmail-red)] text-[var(--airmail-red)]")}><CircleAlert className="size-3.5" /></span>;
  if (status === "partial") return <span className={cn(base, "border-[var(--kraft)] text-[var(--kraft-ink)]")}><CircleAlert className="size-3.5" /></span>;
  if (status === "skipped") return <span className={cn(base, "border-border text-muted-foreground")}><Minus className="size-3.5" /></span>;
  return <span className={cn(base, "border-dashed border-border")} />;
}

/** Vertical arrow between two steps. */
function Connector({ on }: { on: boolean }) {
  return (
    <div aria-hidden className="flex flex-col items-center py-0.5">
      <span className={cn("h-5 w-[1.5px]", on ? "bg-[var(--airmail)]" : "bg-[var(--line)]")} />
      <Arrowhead on={on} />
    </div>
  );
}

/** One line splitting into the two parallel searches. */
function Fork({ on }: { on: boolean }) {
  const c = on ? "bg-[var(--airmail)]" : "bg-[var(--line)]";
  return (
    <div aria-hidden className="relative h-9">
      <span className={cn("absolute top-0 left-1/2 h-3 w-[1.5px] -translate-x-1/2", c)} />
      <span className={cn("absolute top-3 right-[calc(25%-4px)] left-[calc(25%-4px)] h-[1.5px]", c)} />
      <span className="absolute top-3 left-[calc(25%-4px)] flex -translate-x-1/2 flex-col items-center">
        <span className={cn("h-[calc(1.5rem-6px)] w-[1.5px]", c)} />
        <Arrowhead on={on} />
      </span>
      <span className="absolute top-3 left-[calc(75%+4px)] flex -translate-x-1/2 flex-col items-center">
        <span className={cn("h-[calc(1.5rem-6px)] w-[1.5px]", c)} />
        <Arrowhead on={on} />
      </span>
    </div>
  );
}

/** The two searches joining back into one step. */
function Merge({ on }: { on: boolean }) {
  const c = on ? "bg-[var(--airmail)]" : "bg-[var(--line)]";
  return (
    <div aria-hidden className="relative h-9">
      <span className={cn("absolute top-0 left-[calc(25%-4px)] h-3 w-[1.5px] -translate-x-1/2", c)} />
      <span className={cn("absolute top-0 left-[calc(75%+4px)] h-3 w-[1.5px] -translate-x-1/2", c)} />
      <span className={cn("absolute top-3 right-[calc(25%-4px)] left-[calc(25%-4px)] h-[1.5px]", c)} />
      <span className="absolute top-3 left-1/2 flex -translate-x-1/2 flex-col items-center">
        <span className={cn("h-[calc(1.5rem-6px)] w-[1.5px]", c)} />
        <Arrowhead on={on} />
      </span>
    </div>
  );
}

function Arrowhead({ on }: { on: boolean }) {
  return (
    <svg width="9" height="6" viewBox="0 0 9 6" className={on ? "text-[var(--airmail)]" : "text-[var(--line)]"}>
      <path d="M0 0h9L4.5 6z" fill="currentColor" />
    </svg>
  );
}

function DetailLabel({ children }: { children: ReactNode }) {
  return <p className="mb-1 text-[10.5px] font-bold tracking-[0.12em] text-muted-foreground uppercase">{children}</p>;
}

function DetailList({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <DetailLabel>{label}</DetailLabel>
      <ul className="grid gap-1 text-[13px]">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="text-[13px]">
      <span className="text-muted-foreground">{label}: </span>
      {children}
    </p>
  );
}

function RunLog({ events }: { events: Event[] }) {
  return (
    <details className="group mt-8 text-[13px]">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
        Run log · {events.length}
      </summary>
      <ol className="mt-2 max-h-[420px] overflow-auto rounded-lg border border-border bg-card px-4 py-2">
        {events.map((e) => (
          <li key={e._id} className="grid grid-cols-[56px_minmax(0,1fr)_56px] items-start gap-3 border-b border-dashed border-border py-1.5 last:border-b-0">
            <span className="text-muted-foreground tabular-nums">{clockTime(e.at)}</span>
            <span>
              <EventIcon status={e.status} /> {e.label}
              {e.error ? <span className="block text-xs text-[var(--airmail-red)]">{e.error}</span> : null}
            </span>
            <span className="text-right text-muted-foreground tabular-nums">{e.durationMs ? seconds(e.durationMs) : ""}</span>
          </li>
        ))}
      </ol>
    </details>
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
  if (status === "rejected") return <span className="shrink-0 text-xs font-semibold text-[var(--airmail-red)]">Excluded</span>;
  if (status === "checked") return <span className="shrink-0 text-xs font-semibold text-[var(--airmail)]">{outcome === "needs_input" ? "Needs input" : "Fits"}</span>;
  return <span className="shrink-0 text-xs text-muted-foreground">Not checked</span>;
}
