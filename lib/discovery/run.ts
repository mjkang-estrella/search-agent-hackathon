import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api.js";
import type { Doc, Id } from "../../convex/_generated/dataModel.js";
import { costUsd, inferPerson, type RequesterBrief } from "./infer.ts";
import { groupIntoPeople } from "./people.ts";
import { planSearch, type PublicBrief } from "./plan.ts";
import { mapLimited, searchPosts } from "./telem.ts";

const SIX_MONTHS_MS = 182 * 24 * 3600 * 1000;

// Runs one discovery pass and reports each stage to Convex, so the
// dashboard updates while it works.
export async function runDiscovery(convex: ConvexHttpClient, runId: Id<"discoveryRuns">, intention: Doc<"intentions">) {
  const update = (patch: Omit<Parameters<typeof convex.mutation<typeof api.runs.update>>[1], "id">) =>
    convex.mutation(api.runs.update, { id: runId, ...patch });
  let usage = { input: 0, output: 0 };

  try {
    // Only network-visible fields leave the account.
    const brief: PublicBrief = {
      aim: intention.aim,
      counterpart: intention.counterpart,
      contributions: intention.contributions,
      location: intention.location,
      constraints: intention.constraints.filter((c) => c.visibility === "network").map((c) => c.text),
    };
    const plan = await planSearch(brief);
    await update({ plan, stage: `Searching ${plan.length} queries on X, LinkedIn, Substack` });

    const since = new Date(Date.now() - SIX_MONTHS_MS).toISOString().slice(0, 10);
    const searched = await mapLimited(plan, 2, (q) => searchPosts(q, { since }));
    const posts = searched.flatMap((s) => s.posts);
    const outcomes = searched.map((s) => ({
      platform: s.outcome.query.platform,
      query: s.outcome.query.query,
      provider: s.outcome.provider,
      status: s.outcome.status,
      kept: s.outcome.kept,
      droppedOld: s.outcome.droppedOld,
      tried: s.outcome.tried,
    }));
    const people = groupIntoPeople(posts);
    await update({ outcomes, stage: `Reading ${people.length} people's posts` });

    // The owner's own check may use private constraints; nothing here is
    // shown to the people being assessed.
    const requester: RequesterBrief = {
      aim: intention.aim,
      counterpart: intention.counterpart,
      contributions: intention.contributions,
      location: intention.location,
      constraints: intention.constraints,
    };
    let done = 0;
    const results = await mapLimited(people, 6, async (p) => {
      const r = await inferPerson(p, requester);
      done++;
      if (done % 10 === 0) await update({ stage: `Reading people's posts (${done}/${people.length})` });
      return r;
    });
    usage = results.reduce((s, r) => ({ input: s.input + r.usage.input, output: s.output + r.usage.output }), usage);

    const byId = new Map(people.map((p) => [p.id, p]));
    const order = { strong: 0, possible: 1, not_a_fit: 2 } as const;
    const stored = results
      .map((r) => {
        const p = byId.get(r.personId)!;
        return {
          id: p.id,
          accounts: p.accounts.map(({ platform, handle, name, bio, location, profileUrl }) => ({ platform, handle, name, bio, location, profileUrl })),
          posts: p.posts.slice(0, 3).map((x) => ({ url: x.url, date: x.publishedAt, platform: x.platform, text: x.text.slice(0, 320) })),
          assessment: r.assessment,
          unverifiedQuotes: r.unverifiedQuotes,
          error: r.error,
        };
      })
      .sort((a, b) => (a.assessment ? order[a.assessment.fit] : 3) - (b.assessment ? order[b.assessment.fit] : 3));

    const byKind: Record<string, number> = {};
    const byFit: Record<string, number> = {};
    for (const s of stored) {
      if (!s.assessment) continue;
      byKind[s.assessment.kind] = (byKind[s.assessment.kind] ?? 0) + 1;
      byFit[s.assessment.fit] = (byFit[s.assessment.fit] ?? 0) + 1;
    }
    await update({
      people: stored,
      stats: { posts: posts.length, people: people.length, byKind, byFit, errors: results.filter((r) => r.error).length },
      costUsd: Number(costUsd(usage).toFixed(2)),
      stage: "Done",
      status: "done",
    });
  } catch (e) {
    await update({ status: "failed", stage: "Failed", error: e instanceof Error ? e.message : String(e) });
  }
}
