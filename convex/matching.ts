// Member retrieval and the two permission-separated compatibility checks.
import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { embedTexts, modelTask, newThread, type Io } from "./agents";
import { toNetworkCard, zCounterpartCheck, zRequesterChecks, type IntentionCard, type NetworkCard } from "../lib/contracts";
import { normalizeText } from "../lib/rules";

const TOP_PER_QUERY = 4;

export type RetrievalQuery = {
  label: string; // shown in the trace, e.g. "aim" or "capability: composer seeking lyrics"
  text: string;
  fields: ("aim" | "blocker" | "contribution" | "profile")[];
};

export type RetrievedMember = {
  intentionId: Id<"intentions">;
  memberId: Id<"members">;
  memberKey: string;
  displayName: string;
  similarity: number;
  retrievedBy: string[];
  networkCard: NetworkCard;
};

/** Build retrieval queries from the intention and the inferred capabilities. */
export function retrievalQueries(card: IntentionCard, capabilities: { capability: string; memberQuery: string }[]): RetrievalQuery[] {
  const qs: RetrievalQuery[] = [{ label: "aim", text: card.aim, fields: ["aim", "contribution"] }];
  if (card.blocker) qs.push({ label: "blocker vs contributions", text: card.blocker, fields: ["contribution"] });
  if (card.contributions.length) {
    qs.push({ label: "contributions vs needs", text: card.contributions.join("; "), fields: ["blocker", "aim"] });
  }
  for (const c of capabilities) {
    qs.push({ label: `capability: ${c.capability}`, text: c.memberQuery, fields: ["aim", "contribution", "blocker"] });
  }
  return qs;
}

export async function vectorRetrieve(
  ctx: ActionCtx,
  io: Io,
  embedKey: string,
  queries: RetrievalQuery[],
  opts: { perQuery?: number; excludeIntentionId?: Id<"intentions"> } = {},
): Promise<RetrievedMember[]> {
  const vectors = await embedTexts(ctx, io, embedKey, queries.map((q) => q.text));
  const scores = new Map<Id<"intentions">, { score: number; by: Set<string> }>();
  await Promise.all(
    queries.map(async (q, i) => {
      const hits = await ctx.vectorSearch("facets", "by_embedding", {
        vector: vectors[i],
        limit: opts.perQuery ?? 12,
        filter: (f) => f.or(...q.fields.map((field) => f.eq("searchKey", `on:${field}`))),
      });
      const docs = await ctx.runQuery(internal.matching.facetIntentions, { facetIds: hits.map((h) => h._id) });
      // A query "retrieved" an intention only when that intention is among the query's top results.
      const seen = new Set<Id<"intentions">>();
      hits.forEach((h, j) => {
        const intentionId = docs[j];
        if (!intentionId) return;
        const entry = scores.get(intentionId) ?? { score: 0, by: new Set<string>() };
        entry.score = Math.max(entry.score, h._score);
        if (!seen.has(intentionId)) {
          seen.add(intentionId);
          if (seen.size <= TOP_PER_QUERY) entry.by.add(q.label);
        }
        scores.set(intentionId, entry);
      });
    }),
  );
  return await hydrate(ctx, scores, opts.excludeIntentionId);
}

async function hydrate(
  ctx: ActionCtx,
  scores: Map<Id<"intentions">, { score: number; by: Set<string> }>,
  exclude?: Id<"intentions">,
): Promise<RetrievedMember[]> {
  const ids = [...scores.keys()].filter((id) => id !== exclude);
  // Recheck approval and audience after retrieval.
  const rows = await ctx.runQuery(internal.matching.approvedMemberIntentions, { intentionIds: ids });
  return rows
    .map((r) => {
      const s = scores.get(r.intentionId)!;
      return { ...r, similarity: Math.round(s.score * 1000) / 1000, retrievedBy: [...s.by] };
    })
    .sort((a, b) => b.similarity - a.similarity);
}

/** Keyword baseline over whole intention text. Evaluation only. */
export async function keywordRetrieve(ctx: ActionCtx, text: string): Promise<RetrievedMember[]> {
  const hits = await ctx.runQuery(internal.matching.keywordSearch, { text });
  const scores = new Map<Id<"intentions">, { score: number; by: Set<string> }>();
  hits.forEach((id, i) => {
    if (!scores.has(id)) scores.set(id, { score: 1 - i / (hits.length + 1), by: new Set(["keyword"]) });
  });
  return await hydrate(ctx, scores);
}

export const facetIntentions = internalQuery({
  args: { facetIds: v.array(v.id("facets")) },
  handler: async (ctx, { facetIds }) =>
    Promise.all(facetIds.map(async (id) => (await ctx.db.get(id))?.intentionId ?? null)),
});

export const keywordSearch = internalQuery({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    const rows = await ctx.db
      .query("facets")
      .withSearchIndex("by_text", (q) => q.search("text", text.slice(0, 400)).eq("searchKey", "on:intention_text"))
      .take(12);
    return rows.map((r) => r.intentionId);
  },
});

export const approvedMemberIntentions = internalQuery({
  args: { intentionIds: v.array(v.id("intentions")) },
  handler: async (ctx, { intentionIds }) => {
    const out: Omit<RetrievedMember, "similarity" | "retrievedBy">[] = [];
    for (const id of intentionIds) {
      const it = await ctx.db.get(id);
      if (!it || it.owner.kind !== "member" || it.status !== "approved" || it.audience !== "network") continue;
      const member = await ctx.db.get(it.owner.memberId);
      if (!member) continue;
      out.push({
        intentionId: it._id,
        memberId: member._id,
        memberKey: member.key,
        displayName: member.displayName,
        networkCard: toNetworkCard(it.card),
      });
    }
    return out;
  },
});

/** The counterpart check may read the member's private constraints. Never returned to a client. */
export const counterpartContext = internalQuery({
  args: { intentionId: v.id("intentions") },
  handler: async (ctx, { intentionId }) => {
    const it = await ctx.db.get(intentionId);
    if (!it || it.owner.kind !== "member") return null;
    const member = (await ctx.db.get(it.owner.memberId)) as Doc<"members"> | null;
    if (!member) return null;
    return { card: it.card, status: it.status, shareable: member.shareableWithRequesters, displayName: member.displayName };
  },
});

// ---------- Checks ----------

function cardText(c: NetworkCard): string {
  return [
    `Aim: ${c.aim}`,
    `Needs: ${c.blocker ?? "unknown"}`,
    `Offers: ${c.contributions.join("; ") || "none stated"}`,
    `Timing: ${c.timing ?? "unknown"}`,
    `Hard constraints: ${c.hardConstraints.map((x) => `${x.label}: ${x.value ?? "unknown"}`).join("; ") || "none"}`,
    `Preferences: ${c.softConstraints.map((x) => `${x.label}: ${x.value ?? "unknown"}`).join("; ") || "none"}`,
  ].join("\n");
}

/** Requester-side check. Sees the requester's own card and only network-approved candidate fields. */
export async function requesterChecks(
  ctx: ActionCtx,
  io: Io,
  threadId: string | null,
  requester: IntentionCard,
  candidates: { alias: string; card: NetworkCard }[],
  offer = false,
) {
  if (candidates.length === 0) return [];
  const { value } = await modelTask(ctx, io, {
    key: "requester_checks",
    agent: "requester",
    threadId,
    schema: zRequesterChecks,
    prompt: `Check each candidate member against the requester's intention. Shared interests alone are not enough: mark relevant=false when the candidate's intention would not help or be helped by the requester.
Complementary intentions are relevant: the requester's contribution meets the candidate's need, the candidate's contribution meets the requester's need, or both share the same aim. Who starts the collaboration does not matter.${offer ? "\nThe requester is OFFERING this. A candidate who offers or sells the same thing is a competitor: mark relevant=false. Relevant candidates are people who need it." : ""}
For every requester hard constraint, return meets, conflicts, or unknown. Use unknown when the candidate's card does not state the fact. Do not infer availability from interests.

Requester:
${cardText(requester)}
Private requester constraints (use for checking only): ${requester.privateConstraints.map((x) => `${x.label}: ${x.value ?? "unknown"}`).join("; ") || "none"}

Candidates:
${candidates.map((c) => `<candidate id="${c.alias}">\n${cardText(c.card)}\n</candidate>`).join("\n")}`,
  });
  return value.checks;
}

/**
 * Counterpart-side check for one candidate. Runs in its own thread with the member's private
 * constraints, and sees only the requester fields the requester approved for the network.
 */
export async function counterpartCheck(
  ctx: ActionCtx,
  io: Io,
  args: { key: string; memberIntentionId: Id<"intentions">; requesterCard: NetworkCard; publicContext: string | null },
) {
  const member = await ctx.runQuery(internal.matching.counterpartContext, { intentionId: args.memberIntentionId });
  if (!member) throw new Error("Counterpart intention is unavailable");
  if (member.status !== "approved") {
    return { outcome: "decline" as const, reasonForMember: "Intention is no longer approved", sharedNote: "This member is not available.", questions: [], threadId: "" };
  }
  const threadId = io.mode === "replay" ? "" : await newThread(ctx, `Counterpart check for ${member.displayName}`);
  const { value } = await modelTask(ctx, io, {
    key: `counterpart:${args.key}`,
    agent: "counterpart",
    threadId: threadId || null,
    schema: zCounterpartCheck,
    prompt: `You represent this member. Decide whether a connection with the requester suits them.
- compatible: their intention and constraints fit.
- needs_input: plausible, but a stated fact is missing. Ask for it.
- decline: a hard or private constraint rules it out, or the request does not serve their intention.

Member intention (private to you):
${cardText(toNetworkCard(member.card))}
Member private constraints: ${member.card.privateConstraints.map((x) => `${x.label}: ${x.value ?? "unknown"}`).join("; ") || "none"}
Details the member permits sharing: ${member.shareable.join("; ") || "none"}

Requester (fields they approved for the network):
${cardText(args.requesterCard)}
${args.publicContext ? `\nPublic resource the pair might use:\n${args.publicContext}` : ""}

sharedNote is all the requester will learn. Use only permitted details. Do not mention private constraints, even indirectly.`,
  });
  // Field-level guard: drop a shared note that repeats a private constraint value.
  const leaks = member.card.privateConstraints
    .map((c) => c.value)
    .filter((val): val is string => !!val && val.length > 3)
    .some((val) => normalizeText(value.sharedNote).includes(normalizeText(val)));
  return {
    ...value,
    sharedNote: leaks ? "This member's agent responded, but its note referenced a private detail and was withheld." : value.sharedNote,
    threadId,
  };
}
