"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import type { Assessment } from "@/lib/discovery/infer";
import { Chip, timeAgo } from "@/components/badges";
import { DEMO_OWNER_ID } from "@/lib/demo";

interface StoredPerson {
  id: string;
  accounts: { platform: string; handle: string; name: string; bio: string; location: string | null; profileUrl: string }[];
  posts: { url: string; date: string; platform: string; text: string }[];
  assessment: Assessment | null;
  unverifiedQuotes: string[];
}

const KIND_LABELS: Record<Assessment["kind"], string> = {
  individual_builder: "Individual builders",
  founder_with_company: "Already running a company",
  employee: "Employed elsewhere",
  company_account: "Company accounts",
  content_or_influencer: "Content and promo accounts",
  recruiter_or_jobs: "Recruiters and job posts",
  unrelated: "Unrelated",
};

const PLATFORM_LABELS: Record<string, string> = { x: "X", linkedin: "LinkedIn", substack: "Substack" };

export function DiscoveryPanel({ intention }: { intention: Doc<"intentions"> }) {
  const data = useQuery(api.runs.latest, { intentionId: intention._id, ownerId: DEMO_OWNER_ID });
  const markRecorded = useMutation(api.runs.markRecorded);
  const replay = useMutation(api.runs.replay);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = data?.run;
  const running = run?.status === "running";

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentionId: intention._id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start.");
    } finally {
      setStarting(false);
    }
  }

  const people = (run?.people ?? []) as StoredPerson[];
  const matches = people.filter((p) => p.assessment && p.assessment.fit !== "not_a_fit");
  const excluded = people.filter((p) => p.assessment?.fit === "not_a_fit");
  const stale = run && run.revision !== intention.revision;

  return (
    <section className="space-y-5 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">People who could help</h2>
          <p className="text-sm text-muted">
            Recent public posts on X, LinkedIn, and Substack (via Telem), read and judged by Claude against this
            intention.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {data?.hasRecording && !running && (
            <button
              onClick={() => replay({ intentionId: intention._id, ownerId: DEMO_OWNER_ID })}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              Show recording
            </button>
          )}
          <button
            onClick={start}
            disabled={starting || running || !intention.allowWebSearch}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {running ? "Searching…" : run ? "Search again" : "Find people"}
          </button>
        </div>
      </div>

      {!intention.allowWebSearch && (
        <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          Turn on &ldquo;Use for public web search&rdquo; above to search. Only the aim, what you offer, and
          non-private conditions are used.
        </p>
      )}
      {error && <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{error}</p>}

      {run && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {run.mode === "replay" ? (
            <Chip tone="warn">Replay of run recorded {run.recordedAt ? new Date(run.recordedAt).toLocaleString() : ""}</Chip>
          ) : (
            <Chip tone="ok">Live</Chip>
          )}
          {stale && <Chip tone="warn">Intention changed since this run</Chip>}
          <span className="text-muted">
            {run.status === "running" ? run.stage : run.status === "failed" ? `Failed: ${run.error}` : `Finished ${timeAgo(run.finishedAt ?? run.startedAt)}`}
            {run.costUsd !== undefined && ` · $${run.costUsd.toFixed(2)} model cost`}
          </span>
          {run.status === "done" && run.mode === "live" && !run.recordedAt && (
            <button onClick={() => markRecorded({ id: run._id })} className="text-xs text-accent underline">
              Keep as demo recording
            </button>
          )}
        </div>
      )}

      {run?.plan && (
        <details className="text-sm" open={running}>
          <summary className="cursor-pointer text-muted">
            Search plan: {run.plan.length} queries Claude wrote from this intention
          </summary>
          <ul className="mt-2 space-y-1">
            {run.plan.map((q, n) => {
              const outcome = (run.outcomes as { query: string; kept: number; status: string; provider: string | null }[] | undefined)?.find((o) => o.query === q.query);
              return (
                <li key={n} className="flex flex-wrap gap-2">
                  <Chip>{PLATFORM_LABELS[q.platform] ?? q.platform}</Chip>
                  <span>{q.query}</span>
                  <span className="text-muted">— {q.why}</span>
                  {outcome && (
                    <span className="text-muted">
                      {outcome.status === "ok" ? `${outcome.kept} posts via ${outcome.provider}` : "provider unavailable"}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}

      {run?.stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Posts read" value={run.stats.posts} />
          <Stat label="People" value={run.stats.people} />
          <Stat label="Worth a look" value={matches.length} />
          <Stat label="Ruled out" value={excluded.length} />
        </div>
      )}

      {run?.status === "done" && (
        <>
          {matches.length === 0 ? (
            <p className="text-sm text-muted">No one fits yet. That&apos;s common for a rare counterpart.</p>
          ) : (
            <ul className="space-y-3">
              {matches.map((p) => (
                <PersonCard key={p.id} person={p} />
              ))}
            </ul>
          )}
          {excluded.length > 0 && <Excluded people={excluded} />}
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-background px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function PersonCard({ person }: { person: StoredPerson }) {
  const a = person.assessment!;
  const acct = person.accounts[0];
  const evidence = [...a.intent.evidence, ...a.skill.evidence].slice(0, 3);
  return (
    <li className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={a.fit === "strong" ? "ok" : "warn"}>{a.fit === "strong" ? "Strong fit" : "Possible fit"}</Chip>
        <a href={acct.profileUrl} target="_blank" rel="noreferrer" className="font-medium hover:underline">
          {acct.name}
        </a>
        <span className="text-xs text-muted">
          {PLATFORM_LABELS[acct.platform]} @{acct.handle}
          {acct.location ? ` · ${acct.location}` : ""}
        </span>
      </div>
      {acct.bio && <p className="mt-1 text-xs text-muted">{acct.bio}</p>}
      <p className="mt-3 text-sm">{a.intent.summary}</p>
      <p className="mt-1 text-sm text-muted">{a.reason}</p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Chip tone={a.skill.level === "proven" ? "ok" : a.skill.level === "some" ? "accent" : "neutral"}>Skill: {a.skill.level}</Chip>
        <Chip tone={a.intent.likelihood === "high" ? "ok" : a.intent.likelihood === "medium" ? "accent" : "neutral"}>
          Intent now: {a.intent.likelihood}
        </Chip>
        {a.constraints.map((c, n) => (
          <Chip key={n} tone={c.status === "meets" ? "ok" : c.status === "conflicts" ? "warn" : "neutral"}>
            {c.status === "meets" ? "✓" : c.status === "conflicts" ? "✗" : "?"} {c.text}
          </Chip>
        ))}
      </div>

      {evidence.length > 0 && (
        <ul className="mt-3 space-y-1">
          {evidence.map((e, n) => (
            <li key={n} className="border-l-2 border-border pl-3 text-sm">
              &ldquo;{e.quote}&rdquo;{" "}
              <a href={e.url} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">
                source
              </a>
            </li>
          ))}
        </ul>
      )}
      {person.unverifiedQuotes.length > 0 && (
        <p className="mt-1 text-xs text-warn">{person.unverifiedQuotes.length} quote(s) could not be found in the source.</p>
      )}

      {(a.youCanOffer || a.openQuestion) && (
        <div className="mt-3 space-y-1 rounded-lg bg-background p-3 text-sm">
          {a.youCanOffer && (
            <p>
              <span className="text-muted">You could offer: </span>
              {a.youCanOffer}
            </p>
          )}
          {a.openQuestion && (
            <p>
              <span className="text-muted">Ask first: </span>
              {a.openQuestion}
            </p>
          )}
        </div>
      )}
      <p className="mt-2 text-xs text-muted">A public post is a lead, not consent. Reach out yourself.</p>
    </li>
  );
}

function Excluded({ people }: { people: StoredPerson[] }) {
  const groups = new Map<Assessment["kind"], StoredPerson[]>();
  for (const p of people) {
    const k = p.assessment!.kind;
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted">
        Ruled out {people.length}:{" "}
        {[...groups.entries()]
          .sort((a, b) => b[1].length - a[1].length)
          .map(([k, v]) => `${KIND_LABELS[k]} ${v.length}`)
          .join(" · ")}
      </summary>
      <ul className="mt-2 space-y-2">
        {people.map((p) => (
          <li key={p.id} className="text-sm">
            <span className="font-medium">{p.accounts[0].name}</span>{" "}
            <span className="text-xs text-muted">
              {PLATFORM_LABELS[p.accounts[0].platform]} · {KIND_LABELS[p.assessment!.kind]}
            </span>
            <div className="text-muted">{p.assessment!.reason}</div>
          </li>
        ))}
      </ul>
    </details>
  );
}
