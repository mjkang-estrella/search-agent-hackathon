// Drafts, approval, revisions, solution plans, and approved projections.
import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query, type ActionCtx } from "./_generated/server";
import { createRun } from "./discovery";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { modelName, modelTask, newThread } from "./agents";
import { vIntentionCard, vScenarioId } from "./validators";
import { PROMPT_VERSION, zExtraction, zSolutionPlan, type IntentionCard } from "../lib/contracts";
import { guardQuery, quoteExists } from "../lib/rules";
import { SCENARIOS } from "./fixtures/data";
import { DEMO_PERSONA } from "./fixtures/persona";

const EMAIL_G = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

export const createSession = mutation({
  args: {},
  returns: v.id("demoSessions"),
  handler: async (ctx) => ctx.db.insert("demoSessions", { createdAt: Date.now() }),
});

export const listScenarios = query({
  args: {},
  handler: async () =>
    SCENARIOS.map((s) => ({ id: s.id, label: s.label, requesterName: s.requesterName, context: s.context })),
});

async function ownedIntention(
  ctx: { db: { get: (id: Id<"intentions">) => Promise<Doc<"intentions"> | null> } },
  sessionId: Id<"demoSessions">,
  intentionId: Id<"intentions">,
) {
  const intention = await ctx.db.get(intentionId);
  if (!intention || intention.owner.kind !== "requester" || intention.owner.sessionId !== sessionId) {
    throw new Error("Intention not found in this session");
  }
  return intention;
}

// ---------- Extraction ----------

const vDraft = v.object({
  kind: v.union(v.literal("need"), v.literal("offer")),
  inferred: v.boolean(),
  card: vIntentionCard,
  evidence: v.array(v.object({ quote: v.string(), field: v.any(), verified: v.boolean() })),
  questions: v.array(v.string()),
  blockedTerms: v.array(v.string()),
});

/** Extracts up to three intentions from one memory and stores them. */
async function extractMemory(
  ctx: ActionCtx,
  args: { sessionId: Id<"demoSessions">; text: string; scenarioId: "creative" | "firmware" | "civic" | null; auto: boolean; source?: string; sample?: boolean; category?: string; createdAt?: number },
): Promise<Id<"intentions">[]> {
  const text = args.text.trim();
  if (text.length < 20) throw new Error("Add at least a sentence");
  if (text.length > 8000) throw new Error("A memory is limited to 8,000 characters");
  const threadId = await newThread(ctx, "Extraction");
  const { value } = await modelTask(ctx, { mode: "unrecorded" }, {
    key: "extraction",
    agent: "requester",
    threadId,
    schema: zExtraction,
    prompt: `Read the person's memory below and extract the distinct things they are trying to do. Return one to three intentions; most memories hold one or two. Do not split one goal into steps.

Rules for each intention:
- kind: need when they want something, offer when they could give something to others.
- A memory may state no goal, only an interest, skill, habit, or spare resource ("I like washing cars", "my 3D printer sits idle"). Then propose an offer: what they could do for people who need it, for pay, a trade, or goodwill. Set inferred to true. Example: "I like washing cars" becomes the offer "Wash cars for people who'd pay or trade". A skill they rarely use or miss using is an offer too: "I speak Korean but rarely use it" becomes "Help Korean learners practice".
- title: 2 to 5 plain words, starting with a verb, e.g. "Turn a poem into a song" or "Wash cars for neighbors".
- aim: what they are trying to achieve. blocker: what would help them move forward. contributions: what they could offer others.
- hardConstraints make a connection unusable if violated (schedule, budget ceiling, location, language). softConstraints are preferences.
- privateConstraints are personal details that matter for matching but should not be shown to other members (health, employer, family). Keep them out of every other field.
- topics are generic public phrases (e.g. "songwriting collaboration", "ESP32 I2C sensor"). No names, emails, street addresses, or private details.
- evidence quotes must be copied exactly from the memory.
- blockedTerms: names of people, emails, phone numbers, street addresses, employers, and health details that must never appear in a public web query. Never block cities, neighborhoods, countries, or general topics: they make searches useful.
- questions: at most two, only about missing facts that would change which options fit. Leave unknown values null rather than guessing.

<memory>
${text}
</memory>`,
  });
  const emails = text.match(EMAIL_G) ?? [];
  return await ctx.runMutation(internal.intentions.insertMemory, {
    sessionId: args.sessionId,
    scenarioId: args.scenarioId,
    title: value.memoryTitle,
    text,
    source: args.source,
    sample: args.sample,
    category: args.category,
    createdAt: args.createdAt,
    auto: args.auto,
    drafts: value.intentions.map((d) => ({
      kind: d.kind,
      inferred: d.inferred,
      card: {
        title: d.title,
        aim: d.aim,
        blocker: d.blocker,
        contributions: d.contributions,
        timing: d.timing,
        topics: d.topics,
        hardConstraints: d.hardConstraints,
        softConstraints: d.softConstraints,
        privateConstraints: d.privateConstraints,
      },
      evidence: d.evidence.map((e) => ({ ...e, verified: quoteExists(e.quote, text) })),
      questions: d.questions.slice(0, 2),
      blockedTerms: [...new Set([...d.blockedTerms, ...emails])],
    })),
  });
}

/** Stores a memory, extracts its intentions, and starts discovery for each without an approval step. */
export const addMemory = action({
  args: { sessionId: v.id("demoSessions"), text: v.string(), scenarioId: v.union(vScenarioId, v.null()) },
  returns: v.array(v.id("intentions")),
  handler: async (ctx, args): Promise<Id<"intentions">[]> => extractMemory(ctx, { ...args, auto: true }),
});

/** Called by the memory MCP endpoint when an agent saves a memory. */
export const ingestMemory = internalAction({
  args: { sessionId: v.id("demoSessions"), text: v.string(), source: v.string() },
  handler: async (ctx, args): Promise<Id<"intentions">[]> =>
    extractMemory(ctx, { sessionId: args.sessionId, text: args.text, scenarioId: null, auto: true, source: args.source }),
});

export const getPersona = query({
  args: {},
  handler: async () => ({
    name: DEMO_PERSONA.name,
    tagline: DEMO_PERSONA.tagline,
    memories: DEMO_PERSONA.memories.length,
    agents: [...new Set(DEMO_PERSONA.memories.map((m) => m.source))],
  }),
});

/** Loads the demo persona's sample memories, as if Dot, Grok, and Muse had saved them through the MCP. */
export const startDemoPersona = action({
  args: { sessionId: v.id("demoSessions") },
  handler: async (ctx, { sessionId }): Promise<void> => {
    const already: boolean = await ctx.runMutation(internal.intentions.markPersona, { sessionId, persona: DEMO_PERSONA.name });
    if (already) return;
    // Timestamps follow list order, so the first memories stay on top however fast each extraction finishes.
    const base = Date.now();
    await Promise.all(
      DEMO_PERSONA.memories.map((m, i) =>
        extractMemory(ctx, {
          sessionId, text: m.text, scenarioId: m.scenarioId, auto: true, source: m.source, sample: true, category: m.category, createdAt: base - i * 1000,
        }),
      ),
    );
  },
});

export const markPersona = internalMutation({
  args: { sessionId: v.id("demoSessions"), persona: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { sessionId, persona }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");
    if (session.persona) return true;
    await ctx.db.patch(sessionId, { persona });
    return false;
  },
});

function mcpUrl(key: string): string {
  const site = process.env.CONVEX_SITE_URL ?? "";
  return `${site}/mcp?key=${key}`;
}

export const getConnection = query({
  args: { sessionId: v.id("demoSessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) return null;
    return { mcpUrl: session.mcpKey ? mcpUrl(session.mcpKey) : null, persona: session.persona ?? null };
  },
});

/** Creates this session's memory MCP address. Anyone with the address can save memories here. */
export const enableMcp = mutation({
  args: { sessionId: v.id("demoSessions") },
  returns: v.string(),
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");
    if (session.mcpKey) return mcpUrl(session.mcpKey);
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    const key = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    await ctx.db.patch(sessionId, { mcpKey: key });
    return mcpUrl(key);
  },
});

export const sessionByMcpKey = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => ctx.db.query("demoSessions").withIndex("by_mcp_key", (q) => q.eq("mcpKey", key)).first(),
});

export const listMemoriesForMcp = internalQuery({
  args: { sessionId: v.id("demoSessions") },
  handler: async (ctx, { sessionId }) => {
    const rows = await ctx.db.query("memorySources").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).order("desc").take(50);
    return rows.map((m) => ({ title: m.title ?? null, source: m.source ?? null, text: m.text, savedAt: new Date(m.createdAt).toISOString() }));
  },
});

/** Draft-only extraction used by the review flow and scripts. Returns the first intention. */
export const extractIntentions = action({
  args: { sessionId: v.id("demoSessions"), selectedText: v.string(), scenarioId: v.union(vScenarioId, v.null()) },
  returns: v.id("intentions"),
  handler: async (ctx, args): Promise<Id<"intentions">> =>
    (await extractMemory(ctx, { sessionId: args.sessionId, text: args.selectedText, scenarioId: args.scenarioId, auto: false }))[0],
});

export const insertMemory = internalMutation({
  args: {
    sessionId: v.id("demoSessions"),
    scenarioId: v.union(vScenarioId, v.null()),
    title: v.string(),
    text: v.string(),
    source: v.optional(v.string()),
    sample: v.optional(v.boolean()),
    category: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    auto: v.boolean(),
    drafts: v.array(vDraft),
  },
  returns: v.array(v.id("intentions")),
  handler: async (ctx, args) => {
    const now = Date.now();
    const memorySourceId = await ctx.db.insert("memorySources", {
      sessionId: args.sessionId, scenarioId: args.scenarioId, title: args.title, text: args.text, source: args.source, sample: args.sample, category: args.category, createdAt: args.createdAt ?? now,
    });
    const ids: Id<"intentions">[] = [];
    for (const d of args.drafts) {
      const id = await ctx.db.insert("intentions", {
        owner: { kind: "requester", sessionId: args.sessionId },
        memorySourceId,
        scenarioId: args.scenarioId,
        status: args.auto ? "approved" : "draft",
        audience: "network",
        revision: 1,
        card: d.card,
        evidence: d.evidence,
        questions: d.questions,
        blockedTerms: d.blockedTerms,
        kind: d.kind,
        inferred: d.inferred,
        auto: args.auto ? { state: "planning", error: null } : undefined,
        createdAt: now,
        updatedAt: now,
      });
      ids.push(id);
      if (args.auto) await ctx.scheduler.runAfter(0, internal.intentions.autoDiscover, { intentionId: id });
    }
    return ids;
  },
});

/** Plans an intention, approves its guarded public queries on the user's standing instruction, and starts a live run. */
export const autoDiscover = internalAction({
  args: { intentionId: v.id("intentions") },
  handler: async (ctx, { intentionId }): Promise<void> => {
    const intention: Doc<"intentions"> | null = await ctx.runQuery(internal.intentions.getForPlanning, { intentionId });
    if (!intention || intention.owner.kind !== "requester") return;
    try {
      const threadId = await newThread(ctx, `Solution plan: ${intention.card.title}`);
      const { value, proposedQueries, rejectedQueries, peopleQueries } = await solutionPlan(ctx, intention.card, intention.blockedTerms, threadId);
      if (!proposedQueries.length) throw new Error("Every proposed query was blocked by the outbound guard");
      const planId = await ctx.runMutation(internal.intentions.insertPlan, {
        intentionId, revision: intention.revision, hypotheses: value.hypotheses, capabilities: value.capabilities,
        proposedQueries, peopleQueries, rejectedQueries, model: modelName(), threadId,
      });
      await ctx.runMutation(internal.intentions.autoApproveAndRun, { intentionId, planId });
    } catch (e) {
      await ctx.runMutation(internal.intentions.setAuto, { intentionId, state: "failed", error: (e as Error).message });
    }
  },
});

export const setAuto = internalMutation({
  args: { intentionId: v.id("intentions"), state: v.union(v.literal("planning"), v.literal("started"), v.literal("failed")), error: v.union(v.string(), v.null()) },
  handler: async (ctx, { intentionId, state, error }) => ctx.db.patch(intentionId, { auto: { state, error } }),
});

export const autoApproveAndRun = internalMutation({
  args: { intentionId: v.id("intentions"), planId: v.id("solutionPlans") },
  handler: async (ctx, { intentionId, planId }) => {
    const intention = await ctx.db.get(intentionId);
    const plan = await ctx.db.get(planId);
    if (!intention || !plan || intention.owner.kind !== "requester") return;
    const briefId = await ctx.db.insert("searchBriefs", {
      intentionId,
      revision: intention.revision,
      planId,
      sharedTopics: intention.card.topics.filter((t) => !guardQuery(t, intention.blockedTerms)),
      initialQueries: plan.proposedQueries.slice(0, 6),
      allowExpansion: true,
      blockedTerms: intention.blockedTerms,
      approvedAt: Date.now(),
    });
    await createRun(ctx, {
      sessionId: intention.owner.sessionId, intention, briefId, mode: "live", replayOf: null, recordedAt: null, variant: "full",
    });
    await ctx.db.patch(intentionId, { auto: { state: "started", error: null } });
  },
});

/** Direct entry without pasted context. Same pipeline, no scenario template. */
export const createDirectIntention = mutation({
  args: { sessionId: v.id("demoSessions"), card: vIntentionCard },
  returns: v.id("intentions"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("intentions", {
      owner: { kind: "requester", sessionId: args.sessionId },
      memorySourceId: null,
      scenarioId: null,
      status: "draft",
      audience: "network",
      revision: 1,
      card: args.card,
      evidence: [],
      questions: [],
      blockedTerms: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ---------- Owner view and edits ----------

export const getIntention = query({
  args: { sessionId: v.id("demoSessions"), intentionId: v.id("intentions") },
  handler: async (ctx, { sessionId, intentionId }) => {
    const intention = await ownedIntention(ctx, sessionId, intentionId);
    const memory = intention.memorySourceId ? await ctx.db.get(intention.memorySourceId) : null;
    const plan = await ctx.db
      .query("solutionPlans")
      .withIndex("by_intention_revision", (q) => q.eq("intentionId", intentionId).eq("revision", intention.revision))
      .order("desc")
      .first();
    const brief = await ctx.db
      .query("searchBriefs")
      .withIndex("by_intention_revision", (q) => q.eq("intentionId", intentionId).eq("revision", intention.revision))
      .order("desc")
      .first();
    const runs = await ctx.db
      .query("runs")
      .withIndex("by_intention_revision", (q) => q.eq("intentionId", intentionId))
      .order("desc")
      .take(10);
    return {
      _id: intention._id,
      status: intention.status,
      audience: intention.audience,
      revision: intention.revision,
      scenarioId: intention.scenarioId,
      card: intention.card,
      evidence: intention.evidence,
      questions: intention.questions,
      blockedTerms: intention.blockedTerms,
      memoryText: memory?.text ?? null,
      plan: plan && {
        _id: plan._id,
        hypotheses: plan.hypotheses,
        capabilities: plan.capabilities,
        proposedQueries: plan.proposedQueries,
        rejectedQueries: plan.rejectedQueries,
        model: plan.model,
      },
      brief,
      runs: runs.map((r) => ({
        _id: r._id,
        mode: r.mode,
        status: r.status,
        stage: r.stage,
        revision: r.revision,
        stale: r.revision !== intention.revision,
        startedAt: r.startedAt,
        recordedAt: r.recordedAt,
      })),
    };
  },
});

export const listSessionIntentions = query({
  args: { sessionId: v.id("demoSessions") },
  handler: async (ctx, { sessionId }) => {
    const rows = await ctx.db
      .query("intentions")
      .withIndex("by_session", (q) => q.eq("owner.sessionId", sessionId))
      .order("desc")
      .take(20);
    return rows.map((r) => ({ _id: r._id, title: r.card.title, status: r.status, revision: r.revision, updatedAt: r.updatedAt }));
  },
});

export const updateIntention = mutation({
  args: {
    sessionId: v.id("demoSessions"),
    intentionId: v.id("intentions"),
    expectedRevision: v.number(),
    card: vIntentionCard,
    answeredQuestions: v.optional(v.array(v.string())),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const intention = await ownedIntention(ctx, args.sessionId, args.intentionId);
    if (intention.revision !== args.expectedRevision) {
      throw new Error(`This intention changed (revision ${intention.revision}). Reload before editing.`);
    }
    const revision = intention.revision + 1;
    // Edits create a new revision. Earlier runs become stale and approval must be repeated.
    await ctx.db.patch(intention._id, {
      card: args.card,
      revision,
      status: intention.status === "withdrawn" ? "withdrawn" : "draft",
      questions: intention.questions.filter((q) => !(args.answeredQuestions ?? []).includes(q)),
      updatedAt: Date.now(),
    });
    return revision;
  },
});

export const setIntentionStatus = mutation({
  args: {
    sessionId: v.id("demoSessions"),
    intentionId: v.id("intentions"),
    status: v.union(v.literal("hidden"), v.literal("withdrawn"), v.literal("draft")),
  },
  handler: async (ctx, args) => {
    const intention = await ownedIntention(ctx, args.sessionId, args.intentionId);
    await ctx.db.patch(intention._id, { status: args.status, updatedAt: Date.now() });
  },
});

export const addBlockedTerm = mutation({
  args: { sessionId: v.id("demoSessions"), intentionId: v.id("intentions"), term: v.string() },
  handler: async (ctx, args) => {
    const intention = await ownedIntention(ctx, args.sessionId, args.intentionId);
    const term = args.term.trim();
    if (!term) return;
    await ctx.db.patch(intention._id, { blockedTerms: [...new Set([...intention.blockedTerms, term])] });
  },
});

// ---------- Solution planning ----------

export const getForPlanning = internalQuery({
  args: { intentionId: v.id("intentions") },
  handler: async (ctx, { intentionId }) => ctx.db.get(intentionId),
});

/** Solution and search planning from general knowledge. No web search. Queries pass the outbound guard. */
export async function solutionPlan(ctx: ActionCtx, c: IntentionCard, blockedTerms: string[], threadId: string | null) {
    const { value } = await modelTask(ctx, { mode: "unrecorded" }, {
      key: "solution_plan",
      agent: "requester",
      threadId,
      schema: zSolutionPlan,
      prompt: `Propose ways this person could fulfill their intention, and who could help. Use general knowledge. Do not assume any website exists.

Intention:
- Aim: ${c.aim}
- Blocker: ${c.blocker ?? "unknown"}
- Can contribute: ${c.contributions.join("; ") || "none stated"}
- Timing: ${c.timing ?? "unknown"}
- Hard constraints: ${c.hardConstraints.map((x) => `${x.label}: ${x.value ?? "unknown"}`).join("; ") || "none"}
- Soft preferences: ${c.softConstraints.map((x) => `${x.label}: ${x.value ?? "unknown"}`).join("; ") || "none"}

If the intention is an offer (something the person could give), the ways forward are people and places that need it: requests, gigs, posts asking for help, and members who want to delegate it, for pay, a trade, or goodwill.

Return:
- hypotheses: 2 to 5 distinct ways forward. Mark each as a public resource (an existing service, group, listing, event, open request, or project), a member connection (a person who could work with them), or either.
- capabilities: 1 to 4 counterpart roles or capabilities. memberQuery describes the intention such a member would have written, e.g. "composer with unfinished melodies looking for a lyricist".
- publicQueries: 3 to 6 web queries that would find current public evidence for these hypotheses: real collaboration requests, groups, services, events, issues, or listings. Build them only from these approved topics and generic words: ${c.topics.join(", ")}. Never include names, emails, street addresses, or private details. A city name is allowed only if it appears in a hard constraint.
- peopleQueries: 0 to 2 social media searches (X, TikTok, Reddit, Instagram, Facebook, LinkedIn), phrased the way the right person would post. For a need, find people who have the experience. For an offer, find people asking for exactly this help, e.g. "anyone know someone who washes cars at home paid". Use them when talking to someone who has done it would help, such as a recent traveler or someone who solved the same problem. Same privacy rules.`,
    });
    const rejectedQueries: { query: string; reason: string }[] = [];
    const proposedQueries: string[] = [];
    // A blocked term is removed from the query. The query is kept if what remains passes the guard.
    const scrub = (q: string) => {
      let out = q;
      for (const t of blockedTerms) out = out.replace(new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), " ");
      out = out.replace(/\s+/g, " ").trim();
      return out.split(" ").length >= 3 && !guardQuery(out, blockedTerms) ? out : null;
    };
    for (const q of value.publicQueries) {
      const reason = guardQuery(q, blockedTerms);
      const kept = reason ? scrub(q) : q;
      if (kept) proposedQueries.push(kept);
      else rejectedQueries.push({ query: q, reason: reason! });
    }
    const peopleQueries = value.peopleQueries.map((q) => (guardQuery(q, blockedTerms) ? scrub(q) : q)).filter((q): q is string => !!q);
  return { value, proposedQueries, rejectedQueries, peopleQueries };
}

/**
 * The LLM proposes ways forward, counterpart capabilities, and public queries for one revision.
 * This runs before approval so the person approves the exact queries that will leave the app.
 */
export const planSolutions = action({
  args: { sessionId: v.id("demoSessions"), intentionId: v.id("intentions"), revision: v.number() },
  returns: v.id("solutionPlans"),
  handler: async (ctx, args): Promise<Id<"solutionPlans">> => {
    const intention: Doc<"intentions"> | null = await ctx.runQuery(internal.intentions.getForPlanning, { intentionId: args.intentionId });
    if (!intention || intention.owner.kind !== "requester" || intention.owner.sessionId !== args.sessionId) {
      throw new Error("Intention not found in this session");
    }
    if (intention.revision !== args.revision) throw new Error("This intention has a newer revision");
    const threadId = await newThread(ctx, `Solution plan: ${intention.card.title}`);
    const { value, proposedQueries, rejectedQueries } = await solutionPlan(ctx, intention.card, intention.blockedTerms, threadId);
    return await ctx.runMutation(internal.intentions.insertPlan, {
      intentionId: args.intentionId,
      revision: args.revision,
      hypotheses: value.hypotheses,
      capabilities: value.capabilities,
      proposedQueries,
      rejectedQueries,
      model: modelName(),
      threadId,
    });
  },
});

export const insertPlan = internalMutation({
  args: {
    intentionId: v.id("intentions"),
    revision: v.number(),
    hypotheses: v.array(v.object({ solution: v.string(), path: v.union(v.literal("public_resource"), v.literal("member_connection"), v.literal("either")), rationale: v.string() })),
    capabilities: v.array(v.object({ capability: v.string(), rationale: v.string(), memberQuery: v.string() })),
    proposedQueries: v.array(v.string()),
    peopleQueries: v.optional(v.array(v.string())),
    rejectedQueries: v.array(v.object({ query: v.string(), reason: v.string() })),
    model: v.string(),
    threadId: v.string(),
  },
  returns: v.id("solutionPlans"),
  handler: async (ctx, args) =>
    ctx.db.insert("solutionPlans", { ...args, promptVersion: PROMPT_VERSION, createdAt: Date.now() }),
});

// ---------- Approval ----------

export const approveIntention = mutation({
  args: {
    sessionId: v.id("demoSessions"),
    intentionId: v.id("intentions"),
    expectedRevision: v.number(),
    planId: v.id("solutionPlans"),
    sharedTopics: v.array(v.string()),
    initialQueries: v.array(v.string()),
    allowExpansion: v.boolean(),
  },
  returns: v.id("searchBriefs"),
  handler: async (ctx, args) => {
    const intention = await ownedIntention(ctx, args.sessionId, args.intentionId);
    if (intention.revision !== args.expectedRevision) throw new Error("This intention changed. Review the new revision first.");
    if (intention.status === "withdrawn") throw new Error("A withdrawn intention cannot be approved");
    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.intentionId !== intention._id || plan.revision !== intention.revision) {
      throw new Error("The solution plan belongs to a different revision");
    }
    const queries = args.initialQueries.map((q) => q.trim()).filter(Boolean);
    if (queries.length < 1 || queries.length > 6) throw new Error("Approve between one and six public queries");
    for (const q of [...queries, ...args.sharedTopics]) {
      const reason = guardQuery(q, intention.blockedTerms);
      if (reason) throw new Error(`"${q}" cannot leave the app: ${reason}`);
    }
    await ctx.db.patch(intention._id, { status: "approved", updatedAt: Date.now() });
    return await ctx.db.insert("searchBriefs", {
      intentionId: intention._id,
      revision: intention.revision,
      planId: plan._id,
      sharedTopics: args.sharedTopics,
      initialQueries: queries,
      allowExpansion: args.allowExpansion,
      blockedTerms: intention.blockedTerms,
      approvedAt: Date.now(),
    });
  },
});

