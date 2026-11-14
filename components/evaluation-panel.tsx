"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Panel } from "@/components/shell";
import { ago } from "@/lib/format";

type RetrievalObs = { relevantInTop3: string[]; hardConflictsInTop3: string[]; misleadingInTop3: string[] };
type PipelineObs = {
  usefulMemberInTop3: boolean | null;
  hardConflictSurvived: string[];
  misleadingRecommended: string[];
  publicOptionsRecommended: number;
  conditions: { confirmed: number; unverified: number; unknown: number };
  followUp: { status: string; expected: string; question: string | null };
  durationMs: number;
  status: string;
};

const METHOD_LABEL: Record<string, string> = {
  "retrieval:keyword": "Keyword search",
  "retrieval:profile_embedding": "Whole-profile embedding",
  "retrieval:intention_fields": "Intention-field embeddings",
  "retrieval:fields_plus_llm_capabilities": "Fields + LLM-inferred capabilities",
  "pipeline:members_only": "Members only, checked and ranked (no Telem)",
  "pipeline:full": "Full pipeline with Telem public evidence",
};

const pct = (n: number, d: number) => (d ? `${n}/${d}` : "n/a");

export function EvaluationPanel() {
  const results = useQuery(api.evaluation.latestResults);
  const cases = useQuery(api.evaluation.listCases);
  if (!results || !cases) return <Panel className="p-5 text-sm text-muted-foreground">Loading evaluation</Panel>;
  if (results.rows.length === 0) {
    return (
      <Panel className="p-5">
        <h2 className="mb-1 text-[15px] font-bold">Evaluation</h2>
        <p className="text-[13.5px] text-muted-foreground">
          No results stored yet. Run <code className="rounded bg-[var(--soft)] px-1">npx tsx scripts/evaluate.ts</code> to compare the methods on {cases.length} labeled cases.
        </p>
      </Panel>
    );
  }
  const byMethod = new Map<string, { caseId: string; observation: unknown }[]>();
  for (const r of results.rows) byMethod.set(r.method, [...(byMethod.get(r.method) ?? []), r]);
  const relevantCases = new Set(cases.filter((c) => c.relevant.length).map((c) => c.id));

  const retrieval = [...byMethod.entries()].filter(([m]) => m.startsWith("retrieval:"));
  const pipeline = [...byMethod.entries()].filter(([m]) => m.startsWith("pipeline:")).sort(([a]) => (a.endsWith("members_only") ? -1 : 1));
  const full = (byMethod.get("pipeline:full") ?? []) as { caseId: string; observation: PipelineObs }[];

  return (
    <Panel>
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-[15px] font-bold">Evaluation on {cases.length} labeled cases</h2>
        <p className="text-[12.5px] text-muted-foreground">
          Dataset {results.datasetVersion} · {results.createdAt ? `measured ${ago(results.createdAt)}` : ""} · labels written with the synthetic fixtures and not yet reviewed by a person. Live web results change between runs.
        </p>
      </div>
      <div className="overflow-x-auto px-5 py-3">
        <table className="w-full min-w-[620px] text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[10.5px] tracking-[0.1em] text-muted-foreground uppercase">
              <th className="py-2 font-bold">Method</th>
              <th className="py-2 font-bold">Useful member in top 3</th>
              <th className="py-2 font-bold">Hard conflicts</th>
              <th className="py-2 font-bold">Misleading members</th>
            </tr>
          </thead>
          <tbody>
            {retrieval.map(([m, rows]) => {
              const obs = rows as { caseId: string; observation: RetrievalObs }[];
              const hits = obs.filter((r) => relevantCases.has(r.caseId) && r.observation.relevantInTop3.length).length;
              return (
                <tr key={m} className="border-b border-dashed border-border">
                  <td className="py-2">{METHOD_LABEL[m] ?? m} <span className="text-xs text-muted-foreground">· retrieval only</span></td>
                  <td className="py-2 font-semibold tabular-nums">{pct(hits, relevantCases.size)}</td>
                  <td className="py-2 tabular-nums">{obs.reduce((n, r) => n + r.observation.hardConflictsInTop3.length, 0)} in top 3</td>
                  <td className="py-2 tabular-nums">{obs.reduce((n, r) => n + r.observation.misleadingInTop3.length, 0)} in top 3</td>
                </tr>
              );
            })}
            {pipeline.map(([m, rows]) => {
              const obs = rows as { caseId: string; observation: PipelineObs }[];
              const rel = obs.filter((r) => r.observation.usefulMemberInTop3 !== null);
              return (
                <tr key={m} className="border-b border-dashed border-border last:border-b-0">
                  <td className="py-2 font-semibold">{METHOD_LABEL[m] ?? m}</td>
                  <td className="py-2 font-semibold tabular-nums">{pct(rel.filter((r) => r.observation.usefulMemberInTop3).length, rel.length)}</td>
                  <td className="py-2 tabular-nums">{obs.reduce((n, r) => n + r.observation.hardConflictSurvived.length, 0)} recommended</td>
                  <td className="py-2 tabular-nums">{obs.reduce((n, r) => n + r.observation.misleadingRecommended.length, 0)} recommended</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">Retrieval ranks members before any constraint check, so hard conflicts are expected there. The pipeline rows count what reached a recommendation.</p>
      </div>
      {full.length ? (
        <div className="overflow-x-auto border-t border-border px-5 py-3">
          <h3 className="mb-2 text-[13px] font-bold">What public evidence added, per case</h3>
          <table className="w-full min-w-[720px] text-[12.5px]">
            <thead>
              <tr className="border-b border-border text-left text-[10.5px] tracking-[0.1em] text-muted-foreground uppercase">
                <th className="py-1.5 font-bold">Case</th>
                <th className="py-1.5 font-bold">Public or combined options</th>
                <th className="py-1.5 font-bold">Conditions confirmed / unverified / unknown</th>
                <th className="py-1.5 font-bold">Follow-up search</th>
                <th className="py-1.5 font-bold">Expected</th>
              </tr>
            </thead>
            <tbody>
              {full.map((r) => (
                <tr key={r.caseId} className="border-b border-dashed border-border last:border-b-0">
                  <td className="py-1.5">{r.caseId}</td>
                  <td className="py-1.5 tabular-nums">{r.observation.publicOptionsRecommended}</td>
                  <td className="py-1.5 tabular-nums">
                    {r.observation.conditions.confirmed} / {r.observation.conditions.unverified} / {r.observation.conditions.unknown}
                  </td>
                  <td className="py-1.5">{r.observation.followUp.status === "succeeded" ? "ran" : r.observation.followUp.status}</td>
                  <td className="py-1.5 text-muted-foreground">{r.observation.followUp.expected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}
