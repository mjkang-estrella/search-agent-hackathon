// End-to-end run through the public operations: extract, plan, approve, discover, and (optionally) replay.
// Usage: npx tsx scripts/e2e.ts [creative|firmware|civic|"<typed intention text>"] [--replay]
import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "node:fs";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

function convexUrl(): string {
  if (process.env.NEXT_PUBLIC_CONVEX_URL) return process.env.NEXT_PUBLIC_CONVEX_URL;
  const env = readFileSync(".env.local", "utf8");
  const m = env.match(/NEXT_PUBLIC_CONVEX_URL=(.+)/);
  if (!m) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  return m[1].trim();
}

const client = new ConvexHttpClient(convexUrl());
const arg = process.argv[2] ?? "creative";
const replay = process.argv.includes("--replay");

async function waitForRun(sessionId: Id<"demoSessions">, runId: Id<"runs">) {
  const started = Date.now();
  let lastEvents = 0;
  for (;;) {
    const view = await client.query(api.discovery.getDiscovery, { sessionId, runId });
    if (!view) throw new Error("Run not visible");
    for (const e of view.events.slice(lastEvents)) {
      console.log(`  [${e.stage}] ${e.kind} ${e.status}: ${e.label}${e.durationMs ? ` (${e.durationMs}ms)` : ""}${e.error ? ` ERROR ${e.error}` : ""}`);
    }
    lastEvents = view.events.length;
    if (view.run.status !== "running") return view;
    if (Date.now() - started > 600_000) throw new Error("Run did not finish in 10 minutes");
    await new Promise((r) => setTimeout(r, 1500));
  }
}

async function main() {
  const scenarios = await client.query(api.intentions.listScenarios, {});
  const scenario = scenarios.find((s) => s.id === arg);
  const sessionId = await client.mutation(api.sessions.openSession, {});
  const text = scenario ? scenario.context : arg;
  console.log(`Extracting from ${scenario ? `scenario ${scenario.id}` : "typed text"}...`);
  let t = Date.now();
  const intentionId = await client.action(api.intentions.extractIntentions, {
    sessionId, selectedText: text, scenarioId: scenario ? scenario.id : null,
  });
  let intention = await client.query(api.intentions.getIntention, { sessionId, intentionId });
  console.log(`  ${Date.now() - t}ms  "${intention.card.title}"  questions=${JSON.stringify(intention.questions)}`);
  console.log(`  evidence verified ${intention.evidence.filter((e) => e.verified).length}/${intention.evidence.length}; blocked=${JSON.stringify(intention.blockedTerms)}`);

  t = Date.now();
  const planId = await client.action(api.intentions.planSolutions, { sessionId, intentionId, revision: intention.revision });
  intention = await client.query(api.intentions.getIntention, { sessionId, intentionId });
  const plan = intention.plan!;
  console.log(`Plan ${Date.now() - t}ms: ${plan.hypotheses.length} hypotheses, capabilities=${JSON.stringify(plan.capabilities.map((c) => c.capability))}`);
  console.log(`  queries=${JSON.stringify(plan.proposedQueries)} rejected=${JSON.stringify(plan.rejectedQueries)}`);

  const briefId = await client.mutation(api.intentions.approveIntention, {
    sessionId, intentionId, expectedRevision: intention.revision, planId,
    sharedTopics: intention.card.topics, initialQueries: plan.proposedQueries, allowExpansion: true,
  });

  const runId = await client.mutation(api.discovery.startDiscovery, { sessionId, intentionId, revision: intention.revision, briefId, mode: "live" });
  console.log(`Live run ${runId}`);
  let view = await waitForRun(sessionId, runId);
  summarize(view);

  if (replay) {
    const replayId = await client.mutation(api.discovery.startDiscovery, { sessionId, intentionId, revision: intention.revision, briefId, mode: "replay" });
    console.log(`Replay run ${replayId}`);
    view = await waitForRun(sessionId, replayId);
    summarize(view);
  }
  console.log(`\nsessionId=${sessionId} intentionId=${intentionId} runId=${runId}`);
}

function summarize(view: NonNullable<Awaited<ReturnType<typeof client.query<typeof api.discovery.getDiscovery>>>>) {
  const r = view.run;
  console.log(`\nRun ${r.mode} ${r.status} in ${(r.completedAt ?? Date.now()) - r.startedAt}ms budget=${JSON.stringify(r.budget)} followUp=${JSON.stringify(r.followUp)}`);
  console.log(`Sources ${view.sources.length}, fetched ${view.sources.filter((s) => s.fetch.status === "succeeded").length}, failed ${view.sources.filter((s) => s.fetch.status === "failed").length}`);
  for (const o of view.opportunities) {
    console.log(`  OPP ${o.title} <${o.url}> fetched=${o.fetched} ${o.conditions.map((c) => `${c.label}=${c.value}[${c.status}]`).join("; ")}`);
  }
  for (const c of view.candidates) {
    console.log(`  CAND ${c.member.displayName} sim=${c.similarity} ${c.status} by=${JSON.stringify(c.retrievedBy)} ${c.counterpart ? `cp=${c.counterpart.outcome}` : ""} ${c.rejectionReason ?? ""}`);
  }
  for (const o of view.options) {
    console.log(`  OPTION #${o.rank} [${o.kind}] ${o.fitCategory}${o.excluded ? ` EXCLUDED(${o.excludedReason})` : ""}: ${o.title}`);
    console.log(`     ${o.constraintResults.map((c) => `${c.constraint}:${c.result}`).join(", ")}  Q=${JSON.stringify(o.questions)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
