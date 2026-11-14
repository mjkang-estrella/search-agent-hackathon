import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { editableFields, editablePatch, source, status } from "./validators";

// Demo note: there are no accounts yet, so these functions trust ownerId.
// Sharing changes are a separate mutation that only the dashboard calls;
// the MCP tools never expose it, so Claude cannot publish an intention.

export const listMine = query({
  args: { ownerId: v.string() },
  handler: async (ctx, { ownerId }) => {
    return await ctx.db
      .query("intentions")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("intentions"), ownerId: v.string() },
  handler: async (ctx, { id, ownerId }) => {
    const intention = await ctx.db.get(id);
    if (!intention || intention.ownerId !== ownerId) return null;
    const events = await ctx.db
      .query("intentionEvents")
      .withIndex("by_intention", (q) => q.eq("intentionId", id))
      .order("desc")
      .take(20);
    return { intention, events };
  },
});

export const create = mutation({
  args: {
    ownerId: v.string(),
    ownerName: v.string(),
    source,
    ...editableFields,
  },
  handler: async (ctx, { ownerId, ownerName, source, ...fields }) => {
    const now = Date.now();
    const id = await ctx.db.insert("intentions", {
      ownerId,
      ownerName,
      isSynthetic: false,
      ...fields,
      status: "active",
      shareWithNetwork: false,
      allowWebSearch: false,
      revision: 1,
      createdFrom: source,
      updatedAt: now,
    });
    await logEvent(ctx, id, 1, source, "Created (private)");
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("intentions"),
    ownerId: v.string(),
    source,
    patch: editablePatch,
    status: v.optional(status),
    // When set, the update fails if someone else changed the intention first.
    expectedRevision: v.optional(v.number()),
  },
  handler: async (ctx, { id, ownerId, source, patch, status, expectedRevision }) => {
    const current = await requireOwned(ctx, id, ownerId);
    if (expectedRevision !== undefined && expectedRevision !== current.revision) {
      throw new ConvexError(
        `This intention changed (now revision ${current.revision}). Reload and try again.`,
      );
    }
    const changes: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(patch)) {
      if (raw === undefined) continue;
      // An empty string clears an optional text field (blocker, timing, location).
      const value = raw === "" && key !== "aim" ? undefined : raw;
      if (JSON.stringify(value) !== JSON.stringify(current[key as keyof typeof current])) {
        changes[key] = value;
      }
    }
    if (status && status !== current.status) changes.status = status;
    const changed = Object.keys(changes);
    if (changed.length === 0) return { revision: current.revision, changed };

    const revision = current.revision + 1;
    await ctx.db.patch(id, { ...changes, revision, updatedAt: Date.now() });
    await logEvent(ctx, id, revision, source, `Changed ${changed.join(", ")}`);
    return { revision, changed };
  },
});

// Dashboard only. Turning sharing on is the owner's approval.
export const setSharing = mutation({
  args: {
    id: v.id("intentions"),
    ownerId: v.string(),
    shareWithNetwork: v.boolean(),
    allowWebSearch: v.boolean(),
  },
  handler: async (ctx, { id, ownerId, shareWithNetwork, allowWebSearch }) => {
    const current = await requireOwned(ctx, id, ownerId);
    if (
      current.shareWithNetwork === shareWithNetwork &&
      current.allowWebSearch === allowWebSearch
    ) {
      return current.revision;
    }
    const revision = current.revision + 1;
    await ctx.db.patch(id, {
      shareWithNetwork,
      allowWebSearch,
      revision,
      updatedAt: Date.now(),
    });
    const parts = [
      shareWithNetwork ? "shared with network" : "hidden from network",
      allowWebSearch ? "web search allowed" : "web search off",
    ];
    await logEvent(ctx, id, revision, "dashboard", parts.join(", "));
    return revision;
  },
});

// Deletes an intention with its history and runs.
export const remove = mutation({
  args: { id: v.id("intentions"), ownerId: v.string() },
  handler: async (ctx, { id, ownerId }) => {
    await requireOwned(ctx, id, ownerId);
    for (const e of await ctx.db.query("intentionEvents").withIndex("by_intention", (q) => q.eq("intentionId", id)).collect()) {
      await ctx.db.delete(e._id);
    }
    for (const r of await ctx.db.query("discoveryRuns").withIndex("by_intention", (q) => q.eq("intentionId", id)).collect()) {
      await ctx.db.delete(r._id);
    }
    await ctx.db.delete(id);
  },
});

async function requireOwned(ctx: MutationCtx, id: Id<"intentions">, ownerId: string) {
  const intention = await ctx.db.get(id);
  if (!intention || intention.ownerId !== ownerId) {
    throw new ConvexError("Intention not found.");
  }
  return intention;
}

async function logEvent(
  ctx: MutationCtx,
  intentionId: Id<"intentions">,
  revision: number,
  eventSource: "claude" | "chatgpt" | "dashboard" | "seed",
  summary: string,
) {
  await ctx.db.insert("intentionEvents", {
    intentionId,
    revision,
    source: eventSource,
    summary,
    at: Date.now(),
  });
}
