import assert from "node:assert/strict";
import { test } from "node:test";
import type { FunctionReturnType } from "convex/server";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = {
  "./board.ts": () => import("../convex/board"),
  "./_generated/server.ts": () => import("../convex/_generated/server"),
};

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const sessionId = await ctx.db.insert("demoSessions", { createdAt: 0 });
    const other = await ctx.db.insert("demoSessions", { createdAt: 0 });
    const memoryIds = [];
    for (let i = 0; i < 301; i++) {
      memoryIds.push(await ctx.db.insert("memorySources", {
        sessionId, scenarioId: null, title: `Memory ${i}`, text: i === 0 ? "A pottery class in the community" : `A memory about gardening ${i}`,
        createdAt: i,
      }));
    }
    const foreignId = await ctx.db.insert("memorySources", { sessionId: other, scenarioId: null, text: "A pottery class", createdAt: 500 });
    return { sessionId, other, memoryIds, foreignId };
  });
  return { t, ...ids };
}

test("pages all 301 memories in timestamp order without duplicates", async () => {
  const { t, sessionId, memoryIds } = await fixture();
  let cursor: string | null = null;
  const seen: string[] = [];
  for (;;) {
    const result: FunctionReturnType<typeof api.board.listMemories> = await t.query(api.board.listMemories, { sessionId, search: "  ", paginationOpts: { numItems: 25, cursor } });
    assert.ok(result.page.length <= 25);
    assert.ok(result.page.every((m) => !("text" in m) && !("intentions" in m)));
    seen.push(...result.page.map((m) => m._id));
    if (result.isDone) break;
    cursor = result.continueCursor;
  }
  assert.deepEqual(seen, [...memoryIds].reverse());
});

test("search finds old memories beyond the first page and stays within the session", async () => {
  const { t, sessionId, memoryIds } = await fixture();
  const result: FunctionReturnType<typeof api.board.listMemories> = await t.query(api.board.listMemories, { sessionId, search: " pottery ", paginationOpts: { numItems: 25, cursor: null } });
  assert.deepEqual(result.page.map((m) => m._id), [memoryIds[0]]);
  const none = await t.query(api.board.listMemories, { sessionId, search: "astronaut", paginationOpts: { numItems: 25, cursor: null } });
  assert.equal(none.page.length, 0);
  assert.equal(none.isDone, true);
});

test("selected details return only the requested memory and reject a foreign memory", async () => {
  const { t, sessionId, memoryIds, foreignId } = await fixture();
  const result = await t.query(api.board.get, { sessionId, memoryId: memoryIds[0] });
  assert.ok(result);
  assert.deepEqual(result.memories.map((m) => m._id), [memoryIds[0]]);
  assert.equal(result.memories[0].text, "A pottery class in the community");
  const foreign = await t.query(api.board.get, { sessionId, memoryId: foreignId });
  assert.deepEqual(foreign, { memories: [], proposals: [] });
  // A memory id typed into the page URL can be malformed. It reads as "not found" instead of failing.
  const malformed = await t.query(api.board.get, { sessionId, memoryId: "not-a-memory" });
  assert.deepEqual(malformed, { memories: [], proposals: [] });
});

test("the overview counts each intention's results without sending them", async () => {
  const t = convexTest(schema, modules);
  const { sessionId, memoryId, intentionId } = await t.run(async (ctx) => {
    const sessionId = await ctx.db.insert("demoSessions", { createdAt: 0 });
    const memoryId = await ctx.db.insert("memorySources", { sessionId, scenarioId: null, title: "Learn pottery", text: "Learn pottery", createdAt: 0 });
    const intentionId = await ctx.db.insert("intentions", {
      owner: { kind: "requester", sessionId }, memorySourceId: memoryId, scenarioId: null,
      status: "approved", audience: "network", revision: 1,
      card: { title: "Learn pottery", aim: "Learn pottery", blocker: null, contributions: [], timing: null, topics: ["pottery"], hardConstraints: [], softConstraints: [], privateConstraints: [] },
      evidence: [], questions: [], blockedTerms: [], createdAt: 0, updatedAt: 0,
    });
    const planId = await ctx.db.insert("solutionPlans", {
      intentionId, revision: 1, hypotheses: [], capabilities: [], proposedQueries: [], rejectedQueries: [], model: "sample", promptVersion: "sample", threadId: "sample", createdAt: 0,
    });
    const briefId = await ctx.db.insert("searchBriefs", { intentionId, revision: 1, planId, sharedTopics: [], initialQueries: [], allowExpansion: true, blockedTerms: [], approvedAt: 0 });
    const runId = await ctx.db.insert("runs", {
      sessionId, intentionId, revision: 1, briefId, mode: "replay", replayOf: null, recordedAt: 0,
      stage: "complete", status: "succeeded", branches: { public: "succeeded", members: "succeeded" },
      followUp: { status: "skipped", question: null, affects: null, reason: null },
      model: "sample", embeddingModel: "sample", promptVersion: "sample", threadId: null,
      budget: { searchQueries: 1, fetchedPages: 0, modelCalls: 1 }, error: null, startedAt: 0, completedAt: 1,
    });
    for (let i = 0; i < 3; i++) await ctx.db.insert("people", {
      runId, platform: "Reddit", provider: "fetchlayer_reddit", url: `https://reddit.com/sample/${i}`, author: `Sample ${i}`, title: "A pottery post", query: "pottery", publishedAt: null,
    });
    return { sessionId, memoryId, intentionId };
  });
  const overview = await t.query(api.board.overview, { sessionId });
  assert.ok(overview);
  assert.deepEqual(overview.intentions, [
    { _id: intentionId, memoryId, title: "Learn pottery", kind: "need", inferred: false, state: "ready", found: 3 },
  ]);
  assert.deepEqual(overview.proposals, []);
});

test("guest queries cannot open or search a signed-in user's board", async () => {
  const { t } = await fixture();
  const sessionId = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Sample account" });
    const sessionId = await ctx.db.insert("demoSessions", { createdAt: 0, userId });
    await ctx.db.insert("memorySources", { sessionId, scenarioId: null, text: "A pottery class", createdAt: 0 });
    return sessionId;
  });
  assert.equal(await t.query(api.board.get, { sessionId }), null);
  await assert.rejects(t.query(api.board.listMemories, { sessionId, search: "pottery", paginationOpts: { numItems: 25, cursor: null } }), /belongs to another account/);
});
