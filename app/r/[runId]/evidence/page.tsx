"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, RotateCcw } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Panel } from "@/components/shell";
import { Postmark, UnknownTag } from "@/components/stamps";
import { EvaluationPanel } from "@/components/evaluation-panel";
import { useSessionId } from "@/components/providers";
import { useRun } from "@/components/run-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ago, clockTime, errorText, hostOf, seconds } from "@/lib/format";

export default function EvidenceAndEvaluation() {
  const view = useRun();
  const sessionId = useSessionId();
  const router = useRouter();
  const start = useMutation(api.discovery.startDiscovery);
  const [busy, setBusy] = useState(false);
  const r = view.run;
  const interactionIds = view.events
    .filter((e) => e.kind === "telem_search" && e.detail)
    .map((e) => (e.detail as { interactionId?: string | null }).interactionId)
    .filter(Boolean);
  const canReplay = r.mode === "live" && (r.status === "succeeded" || r.status === "partial") && !r.stale && r.variant === "full";

  async function replay() {
    if (!sessionId || !view.intention) return;
    setBusy(true);
    try {
      const runId = await start({ sessionId, intentionId: view.intention._id, revision: r.revision, briefId: r.briefId, mode: "replay" });
      router.push(`/r/${runId}`);
    } catch (e) {
      toast.error(errorText(e));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel className="self-start p-5">
          <h2 className="mb-3 text-[15px] font-bold">Run record</h2>
          <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
            <dt className="text-muted-foreground">Mode</dt>
            <dd className="font-semibold">{r.mode === "live" ? "Live" : `Replay of a run recorded ${ago(r.recordedAt ?? r.startedAt)}`}</dd>
            <dt className="text-muted-foreground">Started</dt>
            <dd>
              {new Date(r.startedAt).toLocaleDateString()} {clockTime(r.startedAt)}
            </dd>
            <dt className="text-muted-foreground">Duration</dt>
            <dd>{r.completedAt ? seconds(r.completedAt - r.startedAt) : "Still running"}</dd>
            <dt className="text-muted-foreground">Model</dt>
            <dd>{r.model}</dd>
            <dt className="text-muted-foreground">Embeddings</dt>
            <dd>{r.embeddingModel}</dd>
            <dt className="text-muted-foreground">Prompt version</dt>
            <dd>{r.promptVersion}</dd>
            <dt className="text-muted-foreground">Budget used</dt>
            <dd>
              {r.budget.searchQueries} queries · {r.budget.fetchedPages} pages · {r.budget.modelCalls} model tasks
            </dd>
            <dt className="text-muted-foreground">Telem calls</dt>
            <dd className="break-all text-xs">{interactionIds.length ? interactionIds.join(", ") : "None"}</dd>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
            {canReplay ? (
              <Button variant="outline" disabled={busy} onClick={replay}>
                <RotateCcw data-icon="inline-start" /> Replay this run
              </Button>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Replay reuses saved Telem responses and model outputs for this exact revision and brief. It never runs silently in place of a live search.</p>
        </Panel>

        <Panel className="min-w-0">
          <div className="border-b border-[var(--line)] px-5 py-3">
            <h2 className="text-[15px] font-bold">Public conditions and their quotes</h2>
            <p className="text-[12.5px] text-muted-foreground">Confirmed means the quote occurs in the fetched page after whitespace normalization. It does not prove the page is right.</p>
          </div>
          {view.opportunities.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">No public opportunities in this run.</p>
          ) : (
            <ul>
              {view.opportunities.map((o) => (
                <li key={o._id} className="border-b border-[var(--line)] px-5 py-3 last:border-b-0">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <a href={o.url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--airmail)] hover:underline">
                      {o.title} <ExternalLink aria-hidden className="inline size-3.5" />
                    </a>
                    <span className="text-xs text-muted-foreground">
                      {o.round === "followup" ? "Follow-up search" : "Initial search"} · {o.fetched ? "page read" : "page not read, unverified lead"}
                    </span>
                  </div>
                  <ul className="grid gap-1">
                    {o.conditions.map((c, i) => (
                      <li key={i} className="grid grid-cols-[130px_minmax(0,1fr)_auto] items-start gap-3 text-[12.5px]">
                        <span className="font-semibold">{c.label}</span>
                        <span className="min-w-0">
                          {c.value ?? <span className="text-muted-foreground">Not stated</span>}
                          {c.quote ? <q className="block text-muted-foreground">{c.quote}</q> : null}
                        </span>
                        {c.status === "confirmed" ? (
                          <span className="inline-flex h-5 items-center rounded-full bg-[var(--airmail-tint)] px-2 text-[11px] font-bold whitespace-nowrap text-[var(--airmail)]">Quote found</span>
                        ) : c.status === "unknown" ? (
                          <UnknownTag />
                        ) : (
                          <span className="inline-flex h-5 items-center rounded-full bg-[var(--chip)] px-2 text-[11px] font-bold whitespace-nowrap text-[var(--ink-muted)]">Unverified</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-3">
          <div>
            <h2 className="text-[15px] font-bold">Sources from Telem</h2>
            <p className="text-[12.5px] text-muted-foreground">
              {view.sources.length} unique URLs kept, with every provider and query that returned them. Several providers returning a page does not make it true.
            </p>
          </div>
          <Postmark kind="public" size="sm" detail="Telem" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[12px] text-muted-foreground">
                <th className="px-5 py-2 font-bold">Source</th>
                <th className="px-3 py-2 font-bold">Providers</th>
                <th className="px-3 py-2 font-bold">Queries</th>
                <th className="px-3 py-2 font-bold">Page read</th>
              </tr>
            </thead>
            <tbody>
              {view.sources.map((s) => {
                const providers = [...new Set(s.hits.map((h) => h.provider))];
                const queries = new Set(s.hits.map((h) => h.query)).size;
                return (
                  <tr key={s._id} className="border-b border-[var(--line)] last:border-b-0">
                    <td className="max-w-[420px] px-5 py-1.5">
                      <a href={s.url} target="_blank" rel="noreferrer" className="block truncate font-semibold hover:text-[var(--airmail)]">
                        {s.title || hostOf(s.url)}
                      </a>
                      <span className="block truncate text-muted-foreground">
                        {hostOf(s.url)} · {s.round === "followup" ? "follow-up" : "initial"}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">{providers.join(", ")}</td>
                    <td className="px-3 py-1.5 tabular-nums">{queries}</td>
                    <td className="px-3 py-1.5">
                      {s.fetch.status === "succeeded" ? (
                        <span>
                          <b className="font-semibold text-[var(--airmail)]">Read</b> via {s.fetch.provider}
                          {s.fetch.cacheState ? ` · cache ${s.fetch.cacheState}` : ""} · {seconds(s.fetch.latencyMs)}
                        </span>
                      ) : s.fetch.status === "failed" ? (
                        <span className={cn("text-[var(--airmail-red)]")} title={s.fetch.providerChain.map((p) => `${p.provider}: ${p.error ?? p.status}`).join("\n")}>
                          <b className="font-semibold">Failed</b> · {s.fetch.error}
                          {s.fetch.providerChain.length ? ` · tried ${s.fetch.providerChain.length} providers` : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not read</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <EvaluationPanel />

    </div>
  );
}
