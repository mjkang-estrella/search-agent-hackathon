import assert from "node:assert/strict";
import { test } from "node:test";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";

const modules = {
  "./intentions.ts": () => import("../convex/intentions"),
  "./_generated/server.ts": () => import("../convex/_generated/server"),
};

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const sessionId = await ctx.db.insert("demoSessions", { createdAt: 0 });
    const intentionId = await ctx.db.insert("intentions", {
      owner: { kind: "requester", sessionId },
      memorySourceId: null,
      scenarioId: null,
      status: "approved",
      audience: "private",
      revision: 2,
      card: {
        title: "Learn pottery",
        aim: "Learn pottery with neighbors",
        blocker: null,
        contributions: [],
        timing: null,
        topics: ["pottery"],
        hardConstraints: [],
        softConstraints: [],
        privateConstraints: [],
      },
      evidence: [],
      questions: [],
      blockedTerms: [],
      createdAt: 0,
      updatedAt: 0,
    });
    const planId = await ctx.db.insert("solutionPlans", {
      intentionId,
      revision: 2,
      hypotheses: [],
      capabilities: [],
      proposedQueries: ["pottery classes"],
      rejectedQueries: [],
      model: "test",
      promptVersion: "test",
      threadId: "test",
      createdAt: 0,
    });
    return { sessionId, intentionId, planId };
  });
  return { t, ...ids };
}

test("turning off search persists and prevents a pending plan from starting discovery", async () => {
  const { t, sessionId, intentionId, planId } = await fixture();
  await t.mutation(api.intentions.setIntentionStatus, {
    sessionId,
    intentionId,
    status: "withdrawn",
  });
  await t.mutation(internal.intentions.autoApproveAndRun, {
    intentionId,
    planId,
  });
  const result = await t.run(async (ctx) => ({
    intention: await ctx.db.get(intentionId),
    runs: await ctx.db.query("runs").collect(),
    briefs: await ctx.db.query("searchBriefs").collect(),
  }));
  assert.equal(result.intention?.status, "withdrawn");
  assert.equal(result.runs.length, 0);
  assert.equal(result.briefs.length, 0);
});

test("a late plan for an older revision cannot start discovery after an edit", async () => {
  const { t, intentionId, planId } = await fixture();
  await t.run((ctx) => ctx.db.patch(intentionId, { revision: 3 }));
  await t.mutation(internal.intentions.autoApproveAndRun, {
    intentionId,
    planId,
  });
  assert.deepEqual(await t.run((ctx) => ctx.db.query("runs").collect()), []);
  assert.deepEqual(
    await t.run((ctx) => ctx.db.query("searchBriefs").collect()),
    [],
  );
});

test("run schema preserves earlier additional-search history and accepts runs without it", async () => {
  const { t, sessionId, intentionId, planId } = await fixture();
  await t.run(async (ctx) => {
    const briefId = await ctx.db.insert("searchBriefs", {
      intentionId,
      revision: 2,
      planId,
      sharedTopics: ["pottery"],
      initialQueries: ["pottery classes"],
      allowExpansion: true,
      blockedTerms: [],
      approvedAt: 0,
    });
    const run = {
      sessionId,
      intentionId,
      briefId,
      revision: 2,
      mode: "live",
      replayOf: null,
      recordedAt: null,
      stage: "complete",
      status: "succeeded",
      branches: { public: "succeeded", members: "succeeded" },
      followUp: {
        status: "skipped",
        question: null,
        affects: null,
        reason: null,
      },
      model: "test",
      embeddingModel: "test",
      promptVersion: "test",
      threadId: null,
      budget: { searchQueries: 0, fetchedPages: 0, modelCalls: 0 },
      error: null,
      startedAt: 0,
      completedAt: 1,
    } satisfies Omit<Doc<"runs">, "_id" | "_creationTime">;
    const plainId = await ctx.db.insert("runs", run);
    assert.equal((await ctx.db.get(plainId))?.more, undefined);
    for (const target of ["people", "places"] as const) {
      const more = {
        target,
        status: "succeeded",
        attempt: 1,
        added: 4,
        startedAt: 1,
        error: null,
      } satisfies NonNullable<Doc<"runs">["more"]>;
      const id = await ctx.db.insert("runs", { ...run, more });
      assert.deepEqual((await ctx.db.get(id))?.more, more);
    }
  });
});
