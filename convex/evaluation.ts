// Evaluation against the 12 labeled cases. Every method uses the same synthetic dataset.
// Run with: npx tsx scripts/evaluate.ts
import { v } from "convex/values";
import { internalAction, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { keywordRetrieve, retrievalQueries, vectorRetrieve, type RetrievedMember } from "./matching";
import { solutionPlan } from "./intentions";
import { createRun } from "./discovery";
import { modelName } from "./agents";
import { DATASET_VERSION, EVAL_CASES } from "./fixtures/data";
import type { IntentionCard } from "../lib/contracts";

function cardText(c: IntentionCard): string {
  return [c.title, c.aim, c.blocker, c.contributions.join(". "), c.timing].filter(Boolean).join(". ");
}

export const listCases = query({
  args: {},
  handler: async () =>
    EVAL_CASES.map((c) => ({
      id: c.id,
      scenarioId: c.scenarioId,
      description: c.description,
      relevant: c.relevantMemberKeys,
      hardConflicts: c.hardConflictMemberKeys,
      misleading: c.misleadingMemberKeys,
      followUp: c.followUp,
    })),
});

/** Ranks the first five members under each retrieval method. */
export const retrievalEval = internalAction({
  args: { caseId: v.string() },
  handler: async (ctx, { caseId }): Promise<Record<string, { keys: string[]; capabilities?: string[] }>> => {
    const c = EVAL_CASES.find((x) => x.id === caseId);
    if (!c) throw new Error(`Unknown case ${caseId}`);
    const io = { mode: "unrecorded" as const };
    const top = (rows: RetrievedMember[]) => rows.slice(0, 5).map((r) => r.memberKey);

    const keyword = await keywordRetrieve(ctx, cardText(c.requester));
    const profile = await vectorRetrieve(ctx, io, `eval:${caseId}:profile`, [{ label: "profile", text: cardText(c.requester), fields: ["profile"] }], { perQuery: 16 });
    const fields = await vectorRetrieve(ctx, io, `eval:${caseId}:fields`, retrievalQueries(c.requester, []));
    const { value: plan } = await solutionPlan(ctx, c.requester, [], null);
    const withCaps = await vectorRetrieve(ctx, io, `eval:${caseId}:caps`, retrievalQueries(c.requester, plan.capabilities));
    return {
      keyword: { keys: top(keyword) },
      profile_embedding: { keys: top(profile) },
      intention_fields: { keys: top(fields) },
      fields_plus_llm_capabilities: { keys: top(withCaps), capabilities: plan.capabilities.map((x) => x.capability) },
    };
  },
});

export const createEvalSession = internalMutation({
  args: { caseId: v.string() },
  handler: async (ctx, { caseId }) => {
    const c = EVAL_CASES.find((x) => x.id === caseId);
    if (!c) throw new Error(`Unknown case ${caseId}`);
    const sessionId = await ctx.db.insert("demoSessions", { createdAt: Date.now() });
    const now = Date.now();
    const intentionId = await ctx.db.insert("intentions", {
      owner: { kind: "requester", sessionId },
      memorySourceId: null,
      scenarioId: c.scenarioId,
      status: "draft",
      audience: "network",
      revision: 1,
      card: c.requester,
      evidence: [],
      questions: [],
      blockedTerms: [],
      createdAt: now,
      updatedAt: now,
    });
    return { sessionId, intentionId };
  },
});

export const approveAndRun = internalMutation({
  args: {
    sessionId: v.id("demoSessions"),
    intentionId: v.id("intentions"),
    planId: v.id("solutionPlans"),
    queries: v.array(v.string()),
    variants: v.array(v.union(v.literal("full"), v.literal("members_only"))),
  },
  handler: async (ctx, args) => {
    const intention = (await ctx.db.get(args.intentionId)) as Doc<"intentions">;
    await ctx.db.patch(intention._id, { status: "approved" });
    const briefId = await ctx.db.insert("searchBriefs", {
      intentionId: intention._id,
      revision: intention.revision,
      planId: args.planId,
      sharedTopics: intention.card.topics,
      initialQueries: args.queries.slice(0, 6),
      allowExpansion: true,
      blockedTerms: [],
      approvedAt: Date.now(),
    });
    const approved = { ...intention, status: "approved" as const };
    const runs: Record<string, Id<"runs">> = {};
    for (const variant of args.variants) {
      runs[variant] = await createRun(ctx, {
        sessionId: args.sessionId, intention: approved, briefId, mode: "live", replayOf: null, recordedAt: null, variant,
      });
    }
    return runs;
  },
});

/** Creates an approved requester intention for a case, plans it, and starts the full and members-only runs. */
export const startCasePipelines = internalAction({
  args: { caseId: v.string() },
  handler: async (ctx, { caseId }): Promise<{ sessionId: Id<"demoSessions">; runs: Record<string, Id<"runs">> }> => {
    const c = EVAL_CASES.find((x) => x.id === caseId)!;
    const { sessionId, intentionId } = await ctx.runMutation(internal.evaluation.createEvalSession, { caseId });
    const { value, proposedQueries, rejectedQueries } = await solutionPlan(ctx, c.requester, [], null);
    const planId = await ctx.runMutation(internal.intentions.insertPlan, {
      intentionId, revision: 1, hypotheses: value.hypotheses, capabilities: value.capabilities,
      proposedQueries, rejectedQueries, model: modelName(), threadId: "",
    });
    const runs = await ctx.runMutation(internal.evaluation.approveAndRun, {
      sessionId, intentionId, planId, queries: proposedQueries, variants: ["full", "members_only"],
    });
    return { sessionId, runs };
  },
});

export const saveResults = internalMutation({
  args: { rows: v.array(v.object({ method: v.string(), caseId: v.string(), observation: v.any() })) },
  handler: async (ctx, { rows }) => {
    const old = await ctx.db.query("evalResults").withIndex("by_dataset", (q) => q.eq("datasetVersion", DATASET_VERSION)).collect();
    for (const r of old) await ctx.db.delete(r._id);
    const createdAt = Date.now();
    for (const r of rows) await ctx.db.insert("evalResults", { datasetVersion: DATASET_VERSION, createdAt, ...r });
  },
});

export const latestResults = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("evalResults").withIndex("by_dataset", (q) => q.eq("datasetVersion", DATASET_VERSION)).collect();
    return { datasetVersion: DATASET_VERSION, createdAt: rows[0]?.createdAt ?? null, rows };
  },
});
