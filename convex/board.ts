// The one-page view: memories, their intentions, ways forward, and a proposal.
// Returns client-safe projections only: no member private constraints, no counterpart reasoning, no page content.
import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

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
  const [options, candidates, opportunities, sources, intros] = await Promise.all([
    ctx.db.query("options").withIndex("by_run", (q) => q.eq("runId", run._id)).collect(),
    ctx.db.query("candidates").withIndex("by_run", (q) => q.eq("runId", run._id)).collect(),
    ctx.db.query("opportunities").withIndex("by_run", (q) => q.eq("runId", run._id)).collect(),
    ctx.db.query("sources").withIndex("by_run", (q) => q.eq("runId", run._id)).collect(),
    ctx.db.query("introductions").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect(),
  ]);
  const ways = [];
  for (const o of options.filter((x) => !x.excluded).sort((a, b) => a.rank - b.rank)) {
    const cand = o.candidateId ? candidates.find((c) => c._id === o.candidateId) : undefined;
    const member = cand ? await ctx.db.get(cand.memberId) : null;
    const opp = o.opportunityId ? opportunities.find((x) => x._id === o.opportunityId) : undefined;
    const source = opp ? sources.find((s) => s._id === opp.sourceId) : undefined;
    const intro = intros.find((i) => i.optionId === o._id);
    const quote = opp?.conditions.find((c) => c.status === "confirmed" && c.quote)?.quote ?? null;
    ways.push({
      _id: o._id,
      kind: o.kind,
      title: o.title,
      why: o.why ?? o.summary.split(/(?<=[.!?])\s/)[0],
      fit: o.fitCategory,
      nextStep: o.nextStep,
      questions: o.questions.slice(0, 2),
      constraints: o.constraintResults.map((r) => ({ label: r.constraint.split(":")[0].trim(), result: r.result })),
      member: member && cand ? { name: member.displayName, wants: cand.networkCard.title, agent: cand.counterpart?.outcome ?? null, note: cand.counterpart?.sharedNote ?? null } : null,
      source: opp
        ? { title: opp.title, url: opp.url, host: hostOf(opp.url), read: opp.fetched, quote, provider: source?.fetch.provider ?? source?.hits[0]?.provider ?? null, route: opp.participationRoute }
        : null,
      intro: intro
        ? {
            _id: intro._id,
            state: intro.state,
            note: intro.counterpartNote,
            contact: intro.state === "accepted" && intro.counterpartAccepted === true && member ? member.contact : null,
          }
        : null,
    });
  }
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

export const get = query({
  args: { sessionId: v.id("demoSessions") },
  handler: async (ctx, { sessionId }) => {
    const memories = (await ctx.db.query("memorySources").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect()).sort(
      (a, b) => b.createdAt - a.createdAt,
    );
    const out = [];
    for (const m of memories) {
      const intentions = await ctx.db.query("intentions").withIndex("by_memory", (q) => q.eq("memorySourceId", m._id)).collect();
      const rows = [];
      for (const it of intentions) {
        const run = await ctx.db
          .query("runs")
          .withIndex("by_intention_revision", (q) => q.eq("intentionId", it._id).eq("revision", it.revision))
          .order("desc")
          .first();
        const result = run && run.status !== "running" ? await waysFor(ctx, run, sessionId) : null;
        const people = run ? await ctx.db.query("people").withIndex("by_run", (q) => q.eq("runId", run._id)).take(12) : [];
        rows.push({
          _id: it._id,
          title: it.card.title,
          kind: it.kind ?? "need",
          inferred: it.inferred ?? false,
          aim: it.card.aim,
          need: it.card.blocker,
          offers: it.card.contributions,
          status: it.status,
          state: it.auto?.state === "failed" ? "failed" : !run ? "planning" : run.status === "running" ? "searching" : run.status === "failed" ? "failed" : "ready",
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
          },
          ways: result?.ways ?? [],
          people: people.map((p) => ({ _id: p._id, platform: p.platform, url: p.url, author: p.author, title: p.title, reason: p.reason ?? null, publishedAt: p.publishedAt })),
          excluded: result?.excluded ?? 0,
        });
      }
      out.push({ _id: m._id, title: m.title ?? m.text.slice(0, 48), text: m.text, source: m.source ?? null, sample: m.sample ?? false, category: m.category ?? null, createdAt: m.createdAt, intentions: rows });
    }

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
  },
});
