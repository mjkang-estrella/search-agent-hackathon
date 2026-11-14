import assert from "node:assert/strict";
import { test } from "node:test";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";

const modules = {
  "./discovery.ts": () => import("../convex/discovery"),
  "./board.ts": () => import("../convex/board"),
  "./_generated/server.ts": () => import("../convex/_generated/server"),
};

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const sessionId = await ctx.db.insert("demoSessions", { createdAt: 0 });
    const otherSessionId = await ctx.db.insert("demoSessions", { createdAt: 0 });
    const memoryId = await ctx.db.insert("memorySources", { sessionId, scenarioId: null, text: "Learn pottery", createdAt: 0 });
    const intentionId = await ctx.db.insert("intentions", {
      owner: { kind: "requester", sessionId }, memorySourceId: memoryId, scenarioId: null,
      status: "approved", audience: "network", revision: 1,
      card: { title: "Learn pottery", aim: "Learn pottery", blocker: null, contributions: [], timing: null, topics: ["pottery"], hardConstraints: [], softConstraints: [], privateConstraints: [] },
      evidence: [], questions: [], blockedTerms: [], createdAt: 0, updatedAt: 0,
    });
    const planId = await ctx.db.insert("solutionPlans", {
      intentionId, revision: 1, hypotheses: [], capabilities: [], proposedQueries: ["pottery classes"], rejectedQueries: [], model: "sample", promptVersion: "sample", threadId: "sample", createdAt: 0,
    });
    const briefId = await ctx.db.insert("searchBriefs", { intentionId, revision: 1, planId, sharedTopics: ["pottery"], initialQueries: ["pottery classes"], allowExpansion: true, blockedTerms: [], approvedAt: 0 });
    const runId = await ctx.db.insert("runs", {
      sessionId, intentionId, revision: 1, briefId, mode: "replay", replayOf: null, recordedAt: 0,
      stage: "complete", status: "succeeded", branches: { public: "succeeded", members: "succeeded" },
      followUp: { status: "skipped", question: null, affects: null, reason: null },
      model: "sample", embeddingModel: "sample", promptVersion: "sample", threadId: null,
      budget: { searchQueries: 2, fetchedPages: 1, modelCalls: 2 }, error: null, startedAt: 0, completedAt: 1,
    });
    for (let i = 0; i < 13; i++) await ctx.db.insert("people", {
      runId, platform: "Reddit", provider: "fetchlayer_reddit", url: `https://reddit.com/sample/${i}`, author: `Sample ${i}`, title: "A pottery post", query: "pottery", publishedAt: null,
    });
    return { sessionId, otherSessionId, memoryId, intentionId, runId };
  });
  return { t, ...ids };
}

test("show more queues one targeted search and preserves existing results", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  context.after(() => context.mock.timers.reset());
  const { t, sessionId, memoryId, runId } = await fixture();
  await t.mutation(api.discovery.findMore, { sessionId, runId, target: "people" });
  await t.mutation(api.discovery.findMore, { sessionId, runId, target: "places" });
  const run = await t.run((ctx) => ctx.db.get(runId));
  assert.equal(run?.more?.attempt, 1);
  assert.equal(run?.more?.target, "people");
  assert.equal(run?.more?.status, "running");
  assert.equal(run?.status, "succeeded");
  assert.equal(run?.mode, "replay");
  const board = await t.query(api.board.get, { sessionId, memoryId });
  assert.equal(board?.memories[0].intentions[0].state, "ready");
  assert.equal(board?.memories[0].intentions[0].people.length, 13);
  assert.equal(board?.memories[0].intentions[0].run?.more?.status, "running");
});

test("show more rejects foreign boards, stale revisions, and unfinished searches", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  context.after(() => context.mock.timers.reset());
  const { t, sessionId, otherSessionId, intentionId, runId } = await fixture();
  await assert.rejects(t.mutation(api.discovery.findMore, { sessionId: otherSessionId, runId, target: "people" }), /not found/);
  await t.run((ctx) => ctx.db.patch(intentionId, { revision: 2 }));
  await assert.rejects(t.mutation(api.discovery.findMore, { sessionId, runId, target: "people" }), /changed/);
  await t.run(async (ctx) => {
    await ctx.db.patch(intentionId, { revision: 1 });
    await ctx.db.patch(runId, { status: "running" });
  });
  await assert.rejects(t.mutation(api.discovery.findMore, { sessionId, runId, target: "people" }), /still running/);
});

test("no new results and failed searches permit retry; late completions cannot replace a new attempt", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  context.after(() => context.mock.timers.reset());
  const { t, sessionId, runId } = await fixture();
  const budget = { searchQueries: 4, fetchedPages: 1, modelCalls: 3 };
  await t.mutation(api.discovery.findMore, { sessionId, runId, target: "people" });
  await t.mutation(internal.discovery.finishMore, { runId, attempt: 1, added: 0, error: null, budget });
  assert.equal((await t.run((ctx) => ctx.db.get(runId)))?.more?.status, "succeeded");
  await t.mutation(api.discovery.findMore, { sessionId, runId, target: "places" });
  await t.mutation(internal.discovery.finishMore, { runId, attempt: 1, added: 5, error: null, budget });
  assert.equal((await t.run((ctx) => ctx.db.get(runId)))?.more?.status, "running");
  await t.mutation(internal.discovery.expireMore, { runId, attempt: 2 });
  assert.equal((await t.run((ctx) => ctx.db.get(runId)))?.more?.status, "failed");
  await t.mutation(api.discovery.findMore, { sessionId, runId, target: "places" });
  assert.equal((await t.run((ctx) => ctx.db.get(runId)))?.more?.attempt, 3);
  await t.mutation(internal.discovery.expireMore, { runId, attempt: 2 });
  assert.equal((await t.run((ctx) => ctx.db.get(runId)))?.more?.status, "running");
});
