// Stage 1 (collection): run a scenario's search plan through Telem and group
// the posts into people. Intent inference and matching come next.
//
//   node --env-file=.env.local scripts/discover.ts <scenario-id> <out-dir>
//
// The output holds real people's public posts. Write it outside the repo.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { mapLimited, searchPosts } from "../lib/discovery/telem.ts";
import { groupIntoPeople } from "../lib/discovery/people.ts";
import type { PublicPost, QueryOutcome, SearchQuery } from "../lib/discovery/types.ts";

const [scenarioId = "voice-cofounder", outDir] = process.argv.slice(2);
if (!outDir) {
  console.error("usage: scripts/discover.ts <scenario-id> <out-dir>");
  process.exit(1);
}
if (!process.env.TELEM_API_KEY) {
  console.error("TELEM_API_KEY is not set");
  process.exit(1);
}

const scenario = JSON.parse(readFileSync(new URL(`../data/scenarios/${scenarioId}.json`, import.meta.url), "utf8"));
const plan: { since: string; queries: SearchQuery[] } = scenario.searchPlan;

const started = Date.now();
const results = await mapLimited(plan.queries, 2, (q) => searchPosts(q, { since: plan.since }));
const posts: PublicPost[] = results.flatMap((r) => r.posts);
const outcomes: QueryOutcome[] = results.map((r) => r.outcome);
const people = groupIntoPeople(posts);

mkdirSync(outDir, { recursive: true });
const file = `${outDir}/${scenarioId}-collection.json`;
writeFileSync(file, JSON.stringify({ scenarioId, ranAt: new Date().toISOString(), since: plan.since, outcomes, people }, null, 2));

console.log(`\n${scenario.label}: ${plan.queries.length} queries in ${Date.now() - started} ms\n`);
for (const o of outcomes) {
  const tried = o.tried.map((t) => `${t.provider}:${t.httpStatus}${t.reason ? `(${t.reason})` : ""}`).join(" → ");
  console.log(
    `${o.status === "ok" ? "✓" : "✗"} [${o.query.platform}] ${o.query.query}\n    ${tried} | ${o.returned} returned, ${o.kept} kept, ${o.droppedOld} too old`,
  );
}
const multi = people.filter((p) => p.accounts.length > 1);
console.log(`\nposts kept: ${posts.length} | people: ${people.length} | linked across platforms: ${multi.length}`);
for (const p of multi) console.log(`  linked: ${p.linkedBy.join("; ")}`);
console.log(`\nwrote ${file}`);
