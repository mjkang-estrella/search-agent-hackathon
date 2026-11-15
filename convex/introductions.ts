// Sharing selections and acceptance states for introductions to synthetic members.
// drafted (client preview) -> requester_approved -> counterpart_checked -> pending_acceptance -> accepted | declined
import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { modelTask, newThread } from "./agents";
import { counterpartCheck } from "./matching";
import { vSharedFields } from "./validators";
import { requireSession, requireSessionInAction, sessionAccess } from "./sessions";
import { sharedProjection, zIntroDraft, type NetworkCard, type SharedFields } from "../lib/contracts";

async function loadOption(
  ctx: { db: import("./_generated/server").QueryCtx["db"] },
  sessionId: Id<"demoSessions">,
  optionId: Id<"options">,
) {
  const option = await ctx.db.get(optionId);
  if (!option) throw new Error("Option not found");
  const run = await ctx.db.get(option.runId);
  if (!run || run.sessionId !== sessionId) throw new Error("Option not found in this session");
  if (!option.candidateId) throw new Error("This option has no member to introduce");
  if (option.excluded) throw new Error("An excluded option cannot support an introduction");
  const candidate = await ctx.db.get(option.candidateId);
  const intention = await ctx.db.get(run.intentionId);
  if (!candidate || !intention) throw new Error("Introduction inputs are missing");
  return { option, run, candidate, intention };
}

async function createIntroduction(
  ctx: MutationCtx,
  args: { sessionId: Id<"demoSessions">; optionId: Id<"options">; sharedFields: SharedFields; message: string },
): Promise<Id<"introductions">> {
  {
    const { option, run, candidate, intention } = await loadOption(ctx, args.sessionId, args.optionId);
    // Repeating a request returns the existing introduction.
    const existing = await ctx.db.query("introductions").withIndex("by_option", (q) => q.eq("optionId", option._id)).first();
    if (existing) return existing._id;
    if (intention.status !== "approved") throw new Error("A hidden, withdrawn, or edited intention cannot support a new introduction");
    if (intention.revision !== run.revision) throw new Error("This run is stale. Run discovery for the current revision.");
    const counterpartIntention = await ctx.db.get(candidate.intentionId);
    if (!counterpartIntention || counterpartIntention.status !== "approved") throw new Error("The member's intention is no longer available");
    if (!args.message.trim()) throw new Error("Write a short message");
    const now = Date.now();
    const id = await ctx.db.insert("introductions", {
      sessionId: args.sessionId,
      runId: run._id,
      optionId: option._id,
      candidateId: candidate._id,
      requesterIntentionId: intention._id,
      counterpartIntentionId: candidate.intentionId,
      opportunityId: option.opportunityId,
      sharedFields: args.sharedFields,
      sharedCard: sharedProjection(intention.card, args.sharedFields),
      message: args.message.trim().slice(0, 1200),
      state: "requester_approved",
      counterpartOutcome: null,
      counterpartNote: null,
      requesterAccepted: true,
      counterpartAccepted: null,
      synthetic: true,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.introductions.runCounterpartCheck, { introductionId: id });
    return id;
  }
}

export const requestIntroduction = mutation({
  args: { sessionId: v.id("demoSessions"), optionId: v.id("options"), sharedFields: vSharedFields, message: v.string() },
  returns: v.id("introductions"),
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionId);
    return createIntroduction(ctx, args);
  },
});

/** The message a one-click introduction sends. It names the aim and contributions, never private constraints. */
function quickMessage(c: { aim: string; contributions: string[] }, counterpartTitle: string) {
  return [
    `Hi! I'm working on: ${c.aim}`,
    c.contributions.length ? `I can bring: ${c.contributions.slice(0, 2).join("; ")}.` : "",
    `Your intention "${counterpartTitle}" looks like a good fit. Would you like to connect?`,
  ]
    .filter(Boolean)
    .join(" ");
}

/** The exact message quickIntroduce would send, so the person reads it before sending. */
export const previewIntroduction = query({
  args: { sessionId: v.id("demoSessions"), optionId: v.id("options") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { sessionId, optionId }) => {
    if (!(await sessionAccess(ctx, sessionId))) return null;
    const { candidate, intention } = await loadOption(ctx, sessionId, optionId);
    return quickMessage(intention.card, candidate.networkCard.title);
  },
});

/** One-click introduction: shares the aim, need, contributions, and timing, never private constraints. */
export const quickIntroduce = mutation({
  args: { sessionId: v.id("demoSessions"), optionId: v.id("options") },
  returns: v.id("introductions"),
  handler: async (ctx, { sessionId, optionId }) => {
    await requireSession(ctx, sessionId);
    const { candidate, intention } = await loadOption(ctx, sessionId, optionId);
    return createIntroduction(ctx, {
      sessionId,
      optionId,
      sharedFields: { aim: true, blocker: true, contributions: true, timing: true, constraints: false },
      message: quickMessage(intention.card, candidate.networkCard.title),
    });
  },
});

export const loadForCheck = internalQuery({
  args: { introductionId: v.id("introductions") },
  handler: async (ctx, { introductionId }) => {
    const intro = await ctx.db.get(introductionId);
    if (!intro) return null;
    const opp = intro.opportunityId ? await ctx.db.get(intro.opportunityId) : null;
    const member = await ctx.db.get(intro.counterpartIntentionId);
    const memberDoc = member?.owner.kind === "member" ? await ctx.db.get(member.owner.memberId) : null;
    return { intro, opp, memberKey: memberDoc?.key ?? "member" };
  },
});

export const setCheckResult = internalMutation({
  args: {
    introductionId: v.id("introductions"),
    outcome: v.union(v.literal("compatible"), v.literal("needs_input"), v.literal("decline")),
    note: v.string(),
  },
  handler: async (ctx, { introductionId, outcome, note }) => {
    await ctx.db.patch(introductionId, { state: "counterpart_checked", counterpartOutcome: outcome, counterpartNote: note, updatedAt: Date.now() });
    // The checked state is recorded, then the request either waits for the member or ends.
    await ctx.db.patch(introductionId, { state: outcome === "decline" ? "declined" : "pending_acceptance", counterpartAccepted: outcome === "decline" ? false : null });
    // Members are samples, so nobody is there to answer. The reply is simulated after a short pause, and the board labels it.
    if (outcome !== "decline") await ctx.scheduler.runAfter(SIMULATED_REPLY_MS, internal.introductions.simulateAcceptance, { introductionId });
  },
});

const SIMULATED_REPLY_MS = 1800;

/** The sample member's simulated yes. Does nothing if the request already moved on. */
export const simulateAcceptance = internalMutation({
  args: { introductionId: v.id("introductions") },
  handler: async (ctx, { introductionId }) => {
    const intro = await ctx.db.get(introductionId);
    if (intro?.state !== "pending_acceptance") return;
    await ctx.db.patch(introductionId, { state: "accepted", counterpartAccepted: true, updatedAt: Date.now() });
  },
});

/** The counterpart check sees only the fields the requester chose to share, plus the optional public resource. */
export const runCounterpartCheck = internalAction({
  args: { introductionId: v.id("introductions") },
  handler: async (ctx, { introductionId }) => {
    const data = await ctx.runQuery(internal.introductions.loadForCheck, { introductionId });
    if (!data) return;
    const { intro, opp } = data;
    try {
      const result = await counterpartCheck(ctx, { mode: "unrecorded" }, {
        key: `intro:${data.memberKey}`,
        memberIntentionId: intro.counterpartIntentionId,
        requesterCard: intro.sharedCard as NetworkCard,
        publicContext: opp ? `${opp.title} <${opp.url}>. Route: ${opp.participationRoute ?? "unknown"}` : null,
      });
      await ctx.runMutation(internal.introductions.setCheckResult, { introductionId, outcome: result.outcome, note: result.sharedNote });
    } catch (e) {
      await ctx.runMutation(internal.introductions.setCheckResult, {
        introductionId, outcome: "needs_input", note: `The member's agent could not complete its check: ${(e as Error).message}`,
      });
    }
  },
});

/** Simulated member response. The interface labels this control as a simulation. */
export const respondToIntroduction = mutation({
  args: { sessionId: v.id("demoSessions"), introductionId: v.id("introductions"), response: v.union(v.literal("accept"), v.literal("decline")) },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionId);
    const intro = await ctx.db.get(args.introductionId);
    if (!intro || intro.sessionId !== args.sessionId) throw new Error("Introduction not found");
    if (intro.state !== "pending_acceptance") throw new Error(`The introduction is ${intro.state.replace("_", " ")}, not waiting for a response`);
    await ctx.db.patch(intro._id, {
      state: args.response === "accept" ? "accepted" : "declined",
      counterpartAccepted: args.response === "accept",
      updatedAt: Date.now(),
    });
  },
});

export const getIntroduction = query({
  args: { sessionId: v.id("demoSessions"), introductionId: v.id("introductions") },
  handler: async (ctx, { sessionId, introductionId }) => {
    if (!(await sessionAccess(ctx, sessionId))) return null;
    const intro = await ctx.db.get(introductionId);
    if (!intro || intro.sessionId !== sessionId) return null;
    const option = await ctx.db.get(intro.optionId);
    const opp = intro.opportunityId ? await ctx.db.get(intro.opportunityId) : null;
    const counterpart = await ctx.db.get(intro.counterpartIntentionId);
    const member = counterpart?.owner.kind === "member" ? await ctx.db.get(counterpart.owner.memberId) : null;
    const bothAccepted = intro.requesterAccepted && intro.counterpartAccepted === true && intro.state === "accepted";
    return {
      _id: intro._id,
      runId: intro.runId,
      state: intro.state,
      synthetic: intro.synthetic,
      option: option && { title: option.title, kind: option.kind },
      member: member && { displayName: member.displayName, contact: bothAccepted ? member.contact : null },
      counterpartTitle: counterpart?.card.title ?? null,
      counterpartOutcome: intro.counterpartOutcome,
      counterpartNote: intro.counterpartNote,
      requesterAccepted: intro.requesterAccepted,
      counterpartAccepted: intro.counterpartAccepted,
      // Exactly what the counterpart received.
      counterpartView: {
        sharedCard: intro.sharedCard as NetworkCard,
        sharedFields: intro.sharedFields,
        message: intro.message,
        publicOpportunity: opp && { title: opp.title, url: opp.url, participationRoute: opp.participationRoute },
      },
      createdAt: intro.createdAt,
      updatedAt: intro.updatedAt,
    };
  },
});

export const introContext = internalQuery({
  args: { sessionId: v.id("demoSessions"), optionId: v.id("options") },
  handler: async (ctx, { sessionId, optionId }) => {
    const { option, candidate, intention } = await loadOption(ctx, sessionId, optionId);
    const opp = option.opportunityId ? await ctx.db.get(option.opportunityId) : null;
    return { option, candidate, card: intention.card, opp };
  },
});

/** Draft an introduction message from the fields the requester will share. */
export const suggestIntroMessage = action({
  args: { sessionId: v.id("demoSessions"), optionId: v.id("options"), sharedFields: vSharedFields },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    await requireSessionInAction(ctx, args.sessionId);
    const { option, candidate, card, opp } = await ctx.runQuery(internal.introductions.introContext, { sessionId: args.sessionId, optionId: args.optionId });
    const shared = sharedProjection(card, args.sharedFields);
    const threadId = await newThread(ctx, "Introduction draft");
    const { value } = await modelTask(ctx, { mode: "unrecorded" }, {
      key: "intro_draft",
      agent: "requester",
      threadId,
      schema: zIntroDraft,
      prompt: `Write a short, friendly introduction request (60 to 110 words) from the requester to a network member. Use only these shared fields and do not add facts:
${JSON.stringify(shared)}
The member's approved intention: ${candidate.networkCard.title}: ${candidate.networkCard.aim}
Why this option fits: ${option.summary}
${opp ? `Public resource they might use together: ${opp.title}` : ""}
Do not include contact details. Do not claim the member has agreed to anything.`,
    });
    return value.message;
  },
});
