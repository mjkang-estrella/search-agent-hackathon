// Saved demo results. The demo persona runs live once into a hidden template session.
// "Start with demo persona" then copies that session, so a demo does not search again every time.
// Copied runs are marked as replays of the recorded run, with its recording time.
//
// Build:  npx convex run demo:buildTemplate
// Check:  npx convex run demo:templateStatus
import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, query, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { DEMO_PERSONA, DEMO_VERSION } from "./fixtures/persona";
import { loadPersonaLive } from "./intentions";

export const buildTemplate = internalAction({
  args: {},
  handler: async (ctx): Promise<string> => {
    const sessionId: Id<"demoSessions"> = await ctx.runMutation(internal.demo.startTemplate, {});
    await loadPersonaLive(ctx, sessionId);
    return `Template session ${sessionId} is searching. Run demo:templateStatus until it is ready.`;
  },
});

export const startTemplate = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sessionId = await ctx.db.insert("demoSessions", { createdAt: Date.now(), persona: `${DEMO_PERSONA.name} template` });
    await ctx.db.insert("demoTemplates", { version: DEMO_VERSION, sessionId, status: "building", createdAt: Date.now() });
    return sessionId;
  },
});

/** Marks the newest template ready once every intention has a finished run. */
export const templateStatus = internalMutation({
  args: {},
  handler: async (ctx): Promise<string> => {
    const template = await ctx.db.query("demoTemplates").withIndex("by_version", (q) => q.eq("version", DEMO_VERSION)).order("desc").first();
    if (!template) return `No template for ${DEMO_VERSION}. Run demo:buildTemplate.`;
    const intentions = await ctx.db.query("intentions").withIndex("by_session", (q) => q.eq("owner.sessionId", template.sessionId)).collect();
    const memories = await ctx.db.query("memorySources").withIndex("by_session", (q) => q.eq("sessionId", template.sessionId)).collect();
    let done = 0;
    let failed = 0;
    for (const it of intentions) {
      const run = await ctx.db.query("runs").withIndex("by_intention_revision", (q) => q.eq("intentionId", it._id)).order("desc").first();
      if (it.auto?.state === "failed" || run?.status === "failed") failed++;
      else if (run && run.status !== "running") done++;
    }
    const complete = memories.length === DEMO_PERSONA.memories.length && done + failed === intentions.length && intentions.length > 0;
    if (complete && template.status !== "ready") await ctx.db.patch(template._id, { status: "ready" });
    return `${DEMO_VERSION}: ${memories.length}/${DEMO_PERSONA.memories.length} memories, ${intentions.length} intentions, ${done} done, ${failed} failed, status ${complete ? "ready" : template.status}`;
  },
});

export const readyTemplate = internalQuery({
  args: {},
  handler: async (ctx) => {
    const t = await ctx.db.query("demoTemplates").withIndex("by_version", (q) => q.eq("version", DEMO_VERSION)).order("desc").first();
    if (!t || t.status !== "ready") return null;
    const memories = await ctx.db.query("memorySources").withIndex("by_session", (q) => q.eq("sessionId", t.sessionId)).collect();
    return { memoryIds: memories.sort((a, b) => b.createdAt - a.createdAt).map((m) => m._id) };
  },
});

export const hasSavedResults = query({
  args: {},
  handler: async (ctx) => {
    const t = await ctx.db.query("demoTemplates").withIndex("by_version", (q) => q.eq("version", DEMO_VERSION)).order("desc").first();
    return t?.status === "ready";
  },
});

/** Copies the ready template into a session. Returns false when no template is ready. */
export const copyTemplate = internalAction({
  args: { sessionId: v.id("demoSessions") },
  handler: async (ctx, { sessionId }): Promise<boolean> => {
    const t = await ctx.runQuery(internal.demo.readyTemplate, {});
    if (!t) return false;
    const base = Date.now();
    // One mutation per memory keeps each copy well under Convex write limits.
    await Promise.all(t.memoryIds.map((memoryId, i) => ctx.runMutation(internal.demo.copyMemory, { memoryId, sessionId, createdAt: base - i * 1000 })));
    return true;
  },
});

export const copyMemory = internalMutation({
  args: { memoryId: v.id("memorySources"), sessionId: v.id("demoSessions"), createdAt: v.number() },
  handler: async (ctx, { memoryId, sessionId, createdAt }) => {
    const memory = (await ctx.db.get(memoryId))!;
    const { _id: _m, _creationTime: _mc, ...memoryRest } = memory;
    const newMemoryId = await ctx.db.insert("memorySources", { ...memoryRest, sessionId, createdAt });
    const intentions = await ctx.db.query("intentions").withIndex("by_memory", (q) => q.eq("memorySourceId", memoryId)).collect();
    for (const it of intentions) {
      const { _id, _creationTime, ...rest } = it;
      const newIntentionId = await ctx.db.insert("intentions", {
        ...rest,
        owner: { kind: "requester", sessionId },
        memorySourceId: newMemoryId,
        auto: { state: "started", error: null },
      });
      const run = await ctx.db.query("runs").withIndex("by_intention_revision", (q) => q.eq("intentionId", _id).eq("revision", it.revision)).order("desc").first();
      if (run) await copyRun(ctx, run, newIntentionId, sessionId);
    }
  },
});


function strip<T extends { _id: unknown; _creationTime: number }>(doc: T): Omit<T, "_id" | "_creationTime"> {
  const { _id, _creationTime, ...rest } = doc;
  return rest;
}

async function copyRun(ctx: MutationCtx, run: Doc<"runs">, intentionId: Id<"intentions">, sessionId: Id<"demoSessions">) {
  const brief = await ctx.db.get(run.briefId);
  const plan = brief ? await ctx.db.get(brief.planId) : null;
  const planId = plan ? await ctx.db.insert("solutionPlans", { ...strip(plan), intentionId }) : null;
  const briefId = brief && planId ? await ctx.db.insert("searchBriefs", { ...strip(brief), intentionId, planId }) : run.briefId;
  const runId = await ctx.db.insert("runs", {
    ...strip(run),
    sessionId,
    intentionId,
    briefId,
    mode: "replay",
    replayOf: run._id,
    recordedAt: run.startedAt,
    threadId: null,
  });
  const src = run._id;
  for (const e of await ctx.db.query("runEvents").withIndex("by_run", (q) => q.eq("runId", src)).collect()) await ctx.db.insert("runEvents", { ...strip(e), runId });
  for (const h of await ctx.db.query("hypotheses").withIndex("by_run", (q) => q.eq("runId", src)).collect()) await ctx.db.insert("hypotheses", { ...strip(h), runId });
  for (const p of await ctx.db.query("people").withIndex("by_run", (q) => q.eq("runId", src)).collect()) await ctx.db.insert("people", { ...strip(p), runId });
  const sourceMap = new Map<Id<"sources">, Id<"sources">>();
  for (const s of await ctx.db.query("sources").withIndex("by_run", (q) => q.eq("runId", src)).collect()) {
    sourceMap.set(s._id, await ctx.db.insert("sources", { ...strip(s), runId }));
  }
  const oppMap = new Map<Id<"opportunities">, Id<"opportunities">>();
  for (const o of await ctx.db.query("opportunities").withIndex("by_run", (q) => q.eq("runId", src)).collect()) {
    oppMap.set(o._id, await ctx.db.insert("opportunities", { ...strip(o), runId, sourceId: sourceMap.get(o.sourceId) ?? o.sourceId }));
  }
  const candMap = new Map<Id<"candidates">, Id<"candidates">>();
  for (const c of await ctx.db.query("candidates").withIndex("by_run", (q) => q.eq("runId", src)).collect()) {
    candMap.set(c._id, await ctx.db.insert("candidates", { ...strip(c), runId }));
  }
  for (const o of await ctx.db.query("options").withIndex("by_run", (q) => q.eq("runId", src)).collect()) {
    await ctx.db.insert("options", {
      ...strip(o),
      runId,
      candidateId: o.candidateId ? (candMap.get(o.candidateId) ?? null) : null,
      opportunityId: o.opportunityId ? (oppMap.get(o.opportunityId) ?? null) : null,
    });
  }
}
