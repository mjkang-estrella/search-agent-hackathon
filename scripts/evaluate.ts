// Runs the evaluation methods against the 12 labeled cases and writes docs/evaluation-results.md.
// Usage: npx tsx scripts/evaluate.ts [--retrieval-only]
import { ConvexHttpClient } from "convex/browser";
import { execFile } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { DATASET_VERSION, EVAL_CASES } from "../convex/fixtures/data";

const run = promisify(execFile);
const url = process.env.NEXT_PUBLIC_CONVEX_URL ?? readFileSync(".env.local", "utf8").match(/NEXT_PUBLIC_CONVEX_URL=(.+)/)![1].trim();
const client = new ConvexHttpClient(url);
const retrievalOnly = process.argv.includes("--retrieval-only");

async function convexRun<T>(fn: string, args: object): Promise<T> {
  const { stdout } = await run("npx", ["convex", "run", fn, JSON.stringify(args)], { maxBuffer: 20 * 1024 * 1024 });
  return (stdout.trim() ? JSON.parse(stdout) : null) as T;
}

type Retrieval = Record<string, { keys: string[]; capabilities?: string[] }>;
type View = NonNullable<Awaited<ReturnType<typeof client.query<typeof api.discovery.getDiscovery>>>>;

const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${n}/${d} (${Math.round((100 * n) / d)}%)`);

async function waitFor(sessionId: Id<"demoSessions">, runId: Id<"runs">): Promise<View> {
  const started = Date.now();
  for (;;) {
    const view = await client.query(api.discovery.getDiscovery, { sessionId, runId });
    if (view && view.run.status !== "running") return view;
    if (Date.now() - started > 900_000) throw new Error(`Run ${runId} did not finish`);
    await new Promise((r) => setTimeout(r, 3000));
  }
}

function pipelineObservation(view: View, c: (typeof EVAL_CASES)[number]) {
  const keyOf = new Map(view.candidates.map((x) => [x._id as string, x.member.key]));
  const recommended = view.options.filter((o) => !o.excluded);
  const recKeys = recommended.map((o) => (o.candidateId ? keyOf.get(o.candidateId) : undefined)).filter((k): k is string => !!k);
  const top3Keys = recommended.slice(0, 3).map((o) => (o.candidateId ? keyOf.get(o.candidateId) : undefined)).filter((k): k is string => !!k);
  const conditions = view.opportunities.flatMap((o) => o.conditions);
  const publicRecs = recommended.filter((o) => o.kind !== "member");
  const searchEvents = view.events.filter((e) => e.kind === "telem_search" && e.detail);
  return {
    status: view.run.status,
    durationMs: (view.run.completedAt ?? Date.now()) - view.run.startedAt,
    budget: view.run.budget,
    usefulMemberInTop3: c.relevantMemberKeys.length ? top3Keys.some((k) => c.relevantMemberKeys.includes(k)) : null,
    noMatchRespected: c.relevantMemberKeys.length ? null : !recKeys.some((k) => !c.hardConflictMemberKeys.includes(k) && c.misleadingMemberKeys.includes(k)),
    hardConflictSurvived: recKeys.filter((k) => c.hardConflictMemberKeys.includes(k)),
    misleadingRecommended: recKeys.filter((k) => c.misleadingMemberKeys.includes(k)),
    recommendedKinds: recommended.map((o) => o.kind),
    publicOptionsRecommended: publicRecs.length,
    conditions: {
      confirmed: conditions.filter((x) => x.status === "confirmed").length,
      unverified: conditions.filter((x) => x.status === "unverified").length,
      unknown: conditions.filter((x) => x.status === "unknown").length,
    },
    fetch: {
      read: view.sources.filter((s) => s.fetch.status === "succeeded").length,
      failed: view.sources.filter((s) => s.fetch.status === "failed").length,
    },
    providers: [...new Set(searchEvents.flatMap((e) => ((e.detail as { runs?: { provider: string }[] }).runs ?? []).map((r) => r.provider)))],
    duplicates: searchEvents.reduce((n, e) => n + ((e.detail as { duplicates?: number }).duplicates ?? 0), 0),
    followUp: { status: view.run.followUp.status, question: view.run.followUp.question, expected: c.followUp },
    topOptions: recommended.slice(0, 3).map((o) => `${o.kind}: ${o.title}`),
  };
}

async function main() {
  console.log(`Evaluating ${EVAL_CASES.length} cases on dataset ${DATASET_VERSION}`);
  const rows: { method: string; caseId: string; observation: unknown }[] = [];

  // Retrieval methods
  const retrieval = await Promise.all(
    EVAL_CASES.map(async (c) => ({ c, r: await convexRun<Retrieval>("evaluation:retrievalEval", { caseId: c.id }) })),
  );
  const methods = Object.keys(retrieval[0].r);
  const retrievalTable: string[] = [];
  for (const m of methods) {
    let hit = 0, denom = 0, conflicts = 0, misleading = 0;
    for (const { c, r } of retrieval) {
      const top3 = r[m].keys.slice(0, 3);
      const obs = {
        top5: r[m].keys,
        capabilities: r[m].capabilities ?? null,
        relevantInTop3: top3.filter((k) => c.relevantMemberKeys.includes(k)),
        hardConflictsInTop3: top3.filter((k) => c.hardConflictMemberKeys.includes(k)),
        misleadingInTop3: top3.filter((k) => c.misleadingMemberKeys.includes(k)),
      };
      if (c.relevantMemberKeys.length) {
        denom++;
        if (obs.relevantInTop3.length) hit++;
      }
      conflicts += obs.hardConflictsInTop3.length;
      misleading += obs.misleadingInTop3.length;
      rows.push({ method: `retrieval:${m}`, caseId: c.id, observation: obs });
    }
    retrievalTable.push(`| ${m.replaceAll("_", " ")} | ${pct(hit, denom)} | ${conflicts} | ${misleading} |`);
    console.log(`  ${m}: useful member in top 3 ${pct(hit, denom)}; hard conflicts in top 3: ${conflicts}; misleading in top 3: ${misleading}`);
  }

  let pipelineSection = "Pipeline runs were skipped (`--retrieval-only`).";
  if (!retrievalOnly) {
    const started = await Promise.all(
      EVAL_CASES.map(async (c) => ({ c, s: await convexRun<{ sessionId: Id<"demoSessions">; runs: Record<string, Id<"runs">> }>("evaluation:startCasePipelines", { caseId: c.id }) })),
    );
    console.log(`  Started ${started.length * 2} pipeline runs`);
    const results = await Promise.all(
      started.map(async ({ c, s }) => ({
        c,
        full: pipelineObservation(await waitFor(s.sessionId, s.runs.full), c),
        membersOnly: pipelineObservation(await waitFor(s.sessionId, s.runs.members_only), c),
      })),
    );
    const lines: string[] = [];
    const agg = (variant: "full" | "membersOnly") => {
      const obs = results.map((r) => r[variant]);
      const withRel = obs.filter((o) => o.usefulMemberInTop3 !== null);
      return {
        useful: pct(withRel.filter((o) => o.usefulMemberInTop3).length, withRel.length),
        conflicts: obs.reduce((n, o) => n + o.hardConflictSurvived.length, 0),
        misleading: obs.reduce((n, o) => n + o.misleadingRecommended.length, 0),
        publicRecs: obs.reduce((n, o) => n + o.publicOptionsRecommended, 0),
        failed: obs.filter((o) => o.status === "failed").length,
        medianMs: obs.map((o) => o.durationMs).sort((a, b) => a - b)[Math.floor(obs.length / 2)],
      };
    };
    const full = agg("full"), mem = agg("membersOnly");
    for (const r of results) {
      rows.push({ method: "pipeline:full", caseId: r.c.id, observation: r.full });
      rows.push({ method: "pipeline:members_only", caseId: r.c.id, observation: r.membersOnly });
      const fu = r.full.followUp;
      const fuOk = fu.expected === "either" ? "n/a" : (fu.expected === "expected") === (fu.status === "succeeded" || fu.status === "failed") ? "yes" : "no";
      lines.push(`| ${r.c.id} | ${r.full.usefulMemberInTop3 ?? "no-match case"} | ${r.membersOnly.usefulMemberInTop3 ?? "no-match case"} | ${r.full.hardConflictSurvived.join(", ") || "none"} | ${r.full.publicOptionsRecommended} | ${r.full.conditions.confirmed}/${r.full.conditions.unverified}/${r.full.conditions.unknown} | ${r.full.fetch.read}/${r.full.fetch.failed} | ${fu.status} (label: ${fu.expected}, matches: ${fuOk}) | ${Math.round(r.full.durationMs / 1000)} s |`);
    }
    const quotes = results.reduce((a, r) => ({ c: a.c + r.full.conditions.confirmed, u: a.u + r.full.conditions.unverified }), { c: 0, u: 0 });
    pipelineSection = `| Variant | Useful member in top 3 recommendations | Hard conflicts recommended | Misleading members recommended | Public or combined options recommended | Failed runs | Median duration |
| --- | --- | --- | --- | --- | --- | --- |
| Members only (LLM planning and member matching, no Telem) | ${mem.useful} | ${mem.conflicts} | ${mem.misleading} | ${mem.publicRecs} | ${mem.failed} | ${Math.round(mem.medianMs / 1000)} s |
| Full pipeline (with Telem public evidence) | ${full.useful} | ${full.conflicts} | ${full.misleading} | ${full.publicRecs} | ${full.failed} | ${Math.round(full.medianMs / 1000)} s |

Quote existence across extracted public conditions: ${pct(quotes.c, quotes.c + quotes.u)} of stated values had a quote found in the fetched page. This proves the quote exists, not that it supports the claim.

Per case (full pipeline unless noted):

| Case | Useful member in top 3 (full) | Useful member in top 3 (members only) | Hard conflicts recommended | Public or combined options | Conditions confirmed/unverified/unknown | Pages read/failed | Follow-up | Duration |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${lines.join("\n")}`;
    console.log(`  members only: ${JSON.stringify(mem)}\n  full: ${JSON.stringify(full)}`);
  }

  await convexRun("evaluation:saveResults", { rows });
  const report = `# Evaluation results

Generated by \`scripts/evaluate.ts\` on ${new Date().toISOString()} against dataset ${DATASET_VERSION}. The dataset has 51 synthetic members and 12 labeled cases. An agent wrote the labels along with the fixtures; no human has reviewed them yet. Treat these numbers as a smoke test of behavior, not a benchmark. Live web results change between runs.

## Member retrieval

Each method ranks members for the same requester intention. "Useful member in top 3" counts cases where at least one labeled useful member is in the first three results. The no-match case is excluded from that count.

| Method | Useful member in top 3 | Hard-conflict members in top 3 | Misleading members in top 3 |
| --- | --- | --- | --- |
${retrievalTable.join("\n")}

Retrieval does not apply constraints. Hard conflicts in retrieval results are expected; the checks below must remove them.

## Recommendations

${pipelineSection}

## Not measured yet

- Whether each public option actually helps. That needs a person to review the top web options and record the sample size and labeling method.
- Cost. Telem returned no usage fields at the default tier, so no cost is reported.
`;
  writeFileSync("docs/evaluation-results.md", report);
  console.log("Wrote docs/evaluation-results.md");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
