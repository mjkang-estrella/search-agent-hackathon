import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Demo note: no accounts yet, so these trust ownerId like intentions.ts.

export const create = mutation({
  args: { intentionId: v.id("intentions"), ownerId: v.string() },
  handler: async (ctx, { intentionId, ownerId }) => {
    const intention = await ctx.db.get(intentionId);
    if (!intention || intention.ownerId !== ownerId) throw new ConvexError("Intention not found.");
    if (!intention.allowWebSearch) throw new ConvexError("Turn on web search for this intention first.");
    return await ctx.db.insert("discoveryRuns", {
      intentionId,
      ownerId,
      revision: intention.revision,
      mode: "live",
      status: "running",
      stage: "Planning searches",
      startedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("discoveryRuns"),
    stage: v.optional(v.string()),
    status: v.optional(v.union(v.literal("running"), v.literal("done"), v.literal("failed"))),
    plan: v.optional(v.array(v.object({ platform: v.string(), query: v.string(), why: v.string() }))),
    outcomes: v.optional(v.any()),
    stats: v.optional(v.any()),
    people: v.optional(v.any()),
    costUsd: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const done = patch.status === "done" || patch.status === "failed";
    await ctx.db.patch(id, { ...patch, ...(done ? { finishedAt: Date.now() } : {}) });
  },
});

// Keep a finished live run as the replay shown when live search is down.
export const markRecorded = mutation({
  args: { id: v.id("discoveryRuns") },
  handler: async (ctx, { id }) => {
    const run = await ctx.db.get(id);
    if (!run || run.status !== "done") throw new ConvexError("Only a finished run can be recorded.");
    await ctx.db.patch(id, { recordedAt: Date.now() });
  },
});

// Copy the recording into a new run labeled replay, so the UI shows it as
// replayed rather than fresh.
export const replay = mutation({
  args: { intentionId: v.id("intentions"), ownerId: v.string() },
  handler: async (ctx, { intentionId, ownerId }) => {
    const runs = await ctx.db
      .query("discoveryRuns")
      .withIndex("by_intention", (q) => q.eq("intentionId", intentionId))
      .collect();
    const recorded = runs.filter((r) => r.recordedAt && r.ownerId === ownerId).at(-1);
    if (!recorded) throw new ConvexError("No recorded run for this intention.");
    const { _id, _creationTime, ...rest } = recorded;
    void _id;
    void _creationTime;
    return await ctx.db.insert("discoveryRuns", { ...rest, mode: "replay", startedAt: Date.now(), finishedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("discoveryRuns"), ownerId: v.string() },
  handler: async (ctx, { id, ownerId }) => {
    const run = await ctx.db.get(id);
    if (run && run.ownerId === ownerId) await ctx.db.delete(id);
  },
});

export const latest = query({
  args: { intentionId: v.id("intentions"), ownerId: v.string() },
  handler: async (ctx, { intentionId, ownerId }) => {
    const run = await ctx.db
      .query("discoveryRuns")
      .withIndex("by_intention", (q) => q.eq("intentionId", intentionId))
      .order("desc")
      .first();
    if (!run || run.ownerId !== ownerId) return null;
    const hasRecording = (
      await ctx.db
        .query("discoveryRuns")
        .withIndex("by_intention", (q) => q.eq("intentionId", intentionId))
        .collect()
    ).some((r) => r.recordedAt);
    return { run, hasRecording };
  },
});
