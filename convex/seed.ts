// Seeds synthetic members and their approved intentions, then embeds retrieval facets in one batch.
// Run with: npx convex run seed:seedMembers
import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { embedTexts } from "./agents";
import { DATASET_VERSION, MEMBERS } from "./fixtures/data";
import { EXTRA_MEMBERS } from "./fixtures/persona";
import { vIntentionCard, vMemberScenario } from "./validators";
import type { IntentionCard } from "../lib/contracts";

type FacetField = "aim" | "blocker" | "contribution" | "profile" | "intention_text";

export function facetTexts(card: IntentionCard, profile: string): { field: FacetField; text: string }[] {
  const out: { field: FacetField; text: string }[] = [{ field: "aim", text: `${card.title}. ${card.aim}` }];
  if (card.blocker) out.push({ field: "blocker", text: card.blocker });
  if (card.contributions.length) out.push({ field: "contribution", text: card.contributions.join("; ") });
  out.push({ field: "profile", text: profile });
  out.push({
    field: "intention_text",
    text: [card.title, card.aim, card.blocker, card.contributions.join(". "), card.timing, card.topics.join(", ")].filter(Boolean).join(". "),
  });
  return out;
}

export const seededVersion = internalQuery({
  args: {},
  handler: async (ctx) => (await ctx.db.query("members").first())?.datasetVersion ?? null,
});

export const insertMember = internalMutation({
  args: {
    key: v.string(),
    displayName: v.string(),
    scenarioId: vMemberScenario,
    contact: v.string(),
    profile: v.string(),
    shareableWithRequesters: v.array(v.string()),
    notes: v.string(),
    card: vIntentionCard,
    facets: v.array(
      v.object({
        field: v.union(v.literal("aim"), v.literal("blocker"), v.literal("contribution"), v.literal("profile"), v.literal("intention_text")),
        text: v.string(),
        embedding: v.optional(v.array(v.float64())),
      }),
    ),
  },
  handler: async (ctx, { card, facets, ...m }) => {
    const memberId = await ctx.db.insert("members", { ...m, datasetVersion: DATASET_VERSION });
    const now = Date.now();
    const intentionId: Id<"intentions"> = await ctx.db.insert("intentions", {
      owner: { kind: "member", memberId },
      memorySourceId: null,
      scenarioId: m.scenarioId,
      status: "approved",
      audience: "network",
      revision: 1,
      card,
      evidence: [],
      questions: [],
      blockedTerms: [],
      createdAt: now,
      updatedAt: now,
    });
    for (const f of facets) {
      await ctx.db.insert("facets", { intentionId, memberId, field: f.field, searchKey: `on:${f.field}`, text: f.text, embedding: f.embedding, revision: 1 });
    }
  },
});

export const clearMembers = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const f of await ctx.db.query("facets").collect()) await ctx.db.delete(f._id);
    for (const m of await ctx.db.query("members").collect()) {
      const its = await ctx.db.query("intentions").withIndex("by_member", (q) => q.eq("owner.memberId", m._id)).collect();
      for (const it of its) await ctx.db.delete(it._id);
      await ctx.db.delete(m._id);
    }
  },
});

export const existingKeys = internalQuery({
  args: {},
  handler: async (ctx) => (await ctx.db.query("members").collect()).map((m) => m.key),
});

/** Inserts any sample members that are missing. Existing members and their runs are left alone. */
export const seedMembers = internalAction({
  args: {},
  handler: async (ctx): Promise<string> => {
    const have = new Set<string>(await ctx.runQuery(internal.seed.existingKeys, {}));
    const missing = [...MEMBERS, ...EXTRA_MEMBERS].filter((m) => !have.has(m.key));
    if (!missing.length) return "All sample members are already seeded";
    const perMember = missing.map((m) => facetTexts(m.intention, m.profile));
    const toEmbed = perMember.flatMap((fs) => fs.filter((f) => f.field !== "intention_text"));
    const vectors = await embedTexts(ctx, { mode: "unrecorded" }, "seed", toEmbed.map((f) => f.text));
    const embeddingFor = new Map(toEmbed.map((f, j) => [f, vectors[j]]));
    for (const [i, m] of missing.entries()) {
      await ctx.runMutation(internal.seed.insertMember, {
        key: m.key,
        displayName: m.displayName,
        scenarioId: m.scenarioId,
        contact: m.contact,
        profile: m.profile,
        shareableWithRequesters: m.shareableWithRequesters,
        notes: m.notes,
        card: m.intention,
        facets: perMember[i].map((f) => ({ field: f.field, text: f.text, embedding: embeddingFor.get(f) })),
      });
    }
    return `Seeded ${missing.length} sample members`;
  },
});
