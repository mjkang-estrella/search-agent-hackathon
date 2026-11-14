// The one-page view: memories, their intentions, ways forward, and a proposal.
// Returns client-safe projections only: no member private constraints, no counterpart reasoning, no page content.
import { demoPortrait } from "../lib/demo-portraits";
import { recordedPostPreviews } from "../lib/people";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { sessionAccess } from "./sessions";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const KIND_ORDER = { combined: 0, member: 1, public: 2 } as const;
const FIT_ORDER = { strong_fit: 0, possible_fit: 1, not_a_fit: 2 } as const;

async function waysFor(ctx: QueryCtx, run: Doc<"runs">, sessionId: Id<"demoSessions">) {
  const [options, candidates] = await Promise.all([
    ctx.db.query("options").withIndex("by_run", (q) => q.eq("runId", run._id)).collect(),
    ctx.db.query("candidates").withIndex("by_run", (q) => q.eq("runId", run._id)).collect(),
  ]);
  const ways = await Promise.all(options.filter((x) => !x.excluded).sort((a, b) => a.rank - b.rank).map(async (o) => {
    const cand = o.candidateId ? candidates.find((c) => c._id === o.candidateId) : undefined;
    const member = cand ? await ctx.db.get(cand.memberId) : null;
    const opp = o.opportunityId ? await ctx.db.get(o.opportunityId) : null;
    const source = opp ? await ctx.db.get(opp.sourceId) : null;
    const intro = await ctx.db.query("introductions").withIndex("by_option", (q) => q.eq("optionId", o._id)).first();
    const quote = opp?.conditions.find((c) => c.status === "confirmed" && c.quote)?.quote ?? null;
    return {
      _id: o._id,
      kind: o.kind,
      title: o.title,
      why: o.why ?? o.summary.split(/(?<=[.!?])\s/)[0],
      fit: o.fitCategory,
      nextStep: o.nextStep,
      summary: o.summary,
      questions: o.questions.slice(0, 2),
      constraints: o.constraintResults.map((r) => ({ label: r.constraint.split(":")[0].trim(), result: r.result })),
      member: member && cand ? { name: member.displayName, avatarUrl: demoPortrait(member.key), about: cand.networkCard.contributions.slice(0, 2).join(". ") || cand.networkCard.aim, wants: cand.networkCard.aim, agent: cand.counterpart?.outcome ?? null, note: cand.counterpart?.sharedNote ?? null } : null,
      source: opp
        ? { title: opp.title, url: opp.url, host: hostOf(opp.url), read: opp.fetched, quote, provider: source?.fetch.provider ?? source?.hits[0]?.provider ?? null, route: opp.participationRoute }
        : null,
      intro: intro?.sessionId === sessionId
        ? {
            _id: intro._id,
            state: intro.state,
            note: intro.counterpartNote,
            contact: intro.state === "accepted" && intro.counterpartAccepted === true && member ? member.contact : null,
          }
        : null,
    };
  }));
  // Show each person once and each website once. The list is already in rank order, so the first one wins.
  const seen = new Set<string>();
  const unique = ways.filter((w) => {
    const key = w.member ? `member:${w.member.name}` : `site:${w.source?.host}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { ways: unique, excluded: candidates.filter((c) => c.status === "rejected").length + options.filter((o) => o.excluded).length };
}

async function loadBoard(ctx: QueryCtx, sessionId: Id<"demoSessions">, memoryId?: string) {
  // The id can come from the page URL, so a malformed one reads as "not found" instead of failing the query.
  const normalized = memoryId ? ctx.db.normalizeId("memorySources", memoryId) : null;
  const selected = normalized ? await ctx.db.get(normalized) : null;
  const memories = memoryId ? (selected?.sessionId === sessionId ? [selected] : []) : (await ctx.db.query("memorySources").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect()).sort(
    (a, b) => b.createdAt - a.createdAt,
  );
  const out = await Promise.all(memories.map(async (m) => {
    const intentions = await ctx.db.query("intentions").withIndex("by_memory", (q) => q.eq("memorySourceId", m._id)).collect();
    const rows = await Promise.all(intentions.map(async (it) => {
      const run = await ctx.db
        .query("runs")
        .withIndex("by_intention_revision", (q) => q.eq("intentionId", it._id).eq("revision", it.revision))
        .order("desc")
        .first();
      const result = run && run.status !== "running" ? await waysFor(ctx, run, sessionId) : null;
      const people = run ? await ctx.db.query("people").withIndex("by_run", (q) => q.eq("runId", run._id)).take(200) : [];
      // Older saved demos kept only titles. Recover their source previews without another search.
      const recordingRunId = run?.replayOf ?? run?._id;
      const recording = recordingRunId && people.some((p) => !p.excerpt)
        ? await ctx.db.query("callLog").withIndex("by_run_key", (q) => q.eq("runId", recordingRunId).eq("key", "telem:people")).first()
        : null;
      const previews = recordedPostPreviews(recording?.response);
      return {
        _id: it._id,
        title: it.card.title,
        kind: it.kind ?? "need",
        inferred: it.inferred ?? false,
        aim: it.card.aim,
        need: it.card.blocker,
        offers: it.card.contributions,
        status: it.status,
        state: it.auto?.state === "failed" ? "failed" : !run || it.auto?.state === "planning" ? "planning" : run.status === "running" ? "searching" : run.status === "failed" ? "failed" : "ready",
        error: it.auto?.error ?? run?.error ?? null,
        run: run && {
          _id: run._id,
          stage: run.stage,
          mode: run.mode,
          startedAt: run.startedAt,
          completedAt: run.completedAt,
          queries: run.budget.searchQueries,
          pages: run.budget.fetchedPages,
          followUp: run.followUp.status,
          saved: run.mode === "replay",
          more: run.more ?? null,
        },
        ways: result?.ways ?? [],
        people: people.map((p) => ({
          _id: p._id, platform: p.platform, url: p.url, author: p.author, title: p.title,
          reason: p.reason ?? null, about: p.about ?? null, excerpt: p.excerpt ?? previews.get(p.url) ?? null,
          evidenceQuote: p.evidenceQuote ?? null, matchChecked: p.matchChecked ?? false,
          avatarUrl: p.avatarUrl ?? null, profileUrl: p.profileUrl ?? null, publishedAt: p.publishedAt,
        })),
        excluded: result?.excluded ?? 0,
      };
    }));
    return { _id: m._id, title: m.title ?? m.text.slice(0, 48), text: m.text, source: m.source ?? null, sample: m.sample ?? false, category: m.category ?? null, createdAt: m.createdAt, intentions: rows };
  }));

  // The proposal: the best way forward across every ready intention, preferring a person over a page.
  // Skip anyone you already contacted, for any intention, so the next idea is new.
  const contacted = new Set(out.flatMap((m) => m.intentions.flatMap((i) => i.ways.filter((w) => w.intro && w.member).map((w) => w.member!.name))));
  const candidates = out.flatMap((m) =>
    m.intentions.flatMap((i) => {
      return i.ways
        .filter((w) => w.fit !== "not_a_fit" && !w.intro && !(w.member && contacted.has(w.member.name)))
        .map((w) => ({ w, memoryId: m._id, intentionId: i._id, intention: i.title }));
    }),
  );
  candidates.sort((a, b) => FIT_ORDER[a.w.fit] - FIT_ORDER[b.w.fit] || KIND_ORDER[a.w.kind] - KIND_ORDER[b.w.kind]);
  const proposals = candidates.slice(0, 6).map((c) => ({ memoryId: c.memoryId, intentionId: c.intentionId, intention: c.intention, way: c.w }));
  return { memories: out, proposals };
}

/** One memory with everything found for it, or the whole board when no memory is given. */
export const get = query({
  args: { sessionId: v.id("demoSessions"), memoryId: v.optional(v.string()) },
  handler: async (ctx, { sessionId, memoryId }) => {
    if (!(await sessionAccess(ctx, sessionId))) return null;
    return await loadBoard(ctx, sessionId, memoryId);
  },
});

/**
 * What the page needs across all memories: the proposals, each memory's title, and one line per intention.
 * The ways and public posts for a memory come from `get` once that memory is open, so the whole board never
 * crosses the wire on every search update.
 */
export const overview = query({
  args: { sessionId: v.id("demoSessions") },
  handler: async (ctx, { sessionId }) => {
    if (!(await sessionAccess(ctx, sessionId))) return null;
    const board = await loadBoard(ctx, sessionId);
    const titles = new Map(board.memories.map((m) => [m._id, m.title]));
    return {
      proposals: board.proposals.map((p) => ({ ...p, memoryTitle: titles.get(p.memoryId) ?? null })),
      intentions: board.memories.flatMap((m) => m.intentions.map((i) => ({
        _id: i._id,
        memoryId: m._id,
        title: i.title,
        kind: i.kind,
        inferred: i.inferred,
        state: i.state,
        found: i.ways.length + i.people.length,
      }))),
    };
  },
});

/** The memory picker never reads discovery results or fetched page content. */
export const listMemories = query({
  args: { sessionId: v.id("demoSessions"), search: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(v.object({
      _id: v.id("memorySources"), title: v.string(), source: v.union(v.string(), v.null()),
      category: v.union(v.string(), v.null()), sample: v.boolean(),
    })),
    isDone: v.boolean(), continueCursor: v.string(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null())),
  }),
  handler: async (ctx, { sessionId, search, paginationOpts }) => {
    // A board this caller can't open lists nothing, as during sign-in or sign-out. Throwing would break the page.
    if (!(await sessionAccess(ctx, sessionId))) return { page: [], isDone: true, continueCursor: "" };
    const term = search.trim();
    const result = term
      ? await ctx.db.query("memorySources").withSearchIndex("search_text", (q) => q.search("text", term).eq("sessionId", sessionId)).paginate(paginationOpts)
      : await ctx.db.query("memorySources").withIndex("by_session_created_at", (q) => q.eq("sessionId", sessionId)).order("desc").paginate(paginationOpts);
    return { ...result, page: result.page.map((m) => ({
      _id: m._id, title: m.title ?? m.text.slice(0, 48), source: m.source ?? null,
      category: m.category ?? null, sample: m.sample ?? false,
    })) };
  },
});
