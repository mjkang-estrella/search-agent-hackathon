import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { editableFields, source, status } from "./validators";

export default defineSchema({
  intentions: defineTable({
    // The demo has no accounts yet. ownerId is a fixed demo id for the
    // requester and a member id for each synthetic member.
    ownerId: v.string(),
    ownerName: v.string(),
    isSynthetic: v.boolean(),
    ...editableFields,
    status,
    // Both start false. Only the owner can turn them on, from the dashboard.
    shareWithNetwork: v.boolean(),
    allowWebSearch: v.boolean(),
    revision: v.number(),
    createdFrom: source,
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId", "updatedAt"])
    .index("by_network", ["shareWithNetwork", "status"]),

  // One discovery run for one intention revision. `people` holds public
  // posts and assessments; it is shown only to the intention's owner.
  discoveryRuns: defineTable({
    intentionId: v.id("intentions"),
    ownerId: v.string(),
    revision: v.number(),
    mode: v.union(v.literal("live"), v.literal("replay")),
    status: v.union(v.literal("running"), v.literal("done"), v.literal("failed")),
    stage: v.string(),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    // Set when a finished live run is kept as the demo recording.
    recordedAt: v.optional(v.number()),
    plan: v.optional(v.array(v.object({ platform: v.string(), query: v.string(), why: v.string() }))),
    outcomes: v.optional(v.any()),
    stats: v.optional(v.any()),
    people: v.optional(v.any()),
    costUsd: v.optional(v.number()),
    error: v.optional(v.string()),
  }).index("by_intention", ["intentionId", "startedAt"]),

  // One row per change, so the dashboard can show what Claude or the
  // owner changed and when.
  intentionEvents: defineTable({
    intentionId: v.id("intentions"),
    revision: v.number(),
    source,
    summary: v.string(),
    at: v.number(),
  }).index("by_intention", ["intentionId", "at"]),
});
