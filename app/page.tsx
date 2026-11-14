"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { CATEGORY_LABELS, Chip, SharingChips, StatusChip, timeAgo } from "@/components/badges";
import { DEMO_OWNER_ID } from "@/lib/demo";
import { ImportConversation } from "@/components/ImportConversation";

type Filter = "all" | Doc<"intentions">["category"];

export default function IntentionsPage() {
  const intentions = useQuery(api.intentions.listMine, { ownerId: DEMO_OWNER_ID });
  const [filter, setFilter] = useState<Filter>("all");

  if (intentions === undefined) {
    return <p className="text-muted">Loading…</p>;
  }

  const categories = [...new Set(intentions.map((i) => i.category))];
  const visible = filter === "all" ? intentions : intentions.filter((i) => i.category === filter);
  const groups: { title: string; items: Doc<"intentions">[] }[] = [
    { title: "Active", items: visible.filter((i) => i.status === "active") },
    { title: "Paused", items: visible.filter((i) => i.status === "paused") },
    { title: "Done", items: visible.filter((i) => i.status === "done") },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Your intentions</h1>
        <p className="mt-1 max-w-2xl text-muted">
          Your AI assistant saves what you&apos;re working toward here. Everything starts private.
          Open one to edit it or choose who can see it.
        </p>
      </section>

      <ImportConversation />

      {intentions.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {(["all", ...categories] as Filter[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    filter === c ? "border-accent bg-accent-soft text-accent" : "border-border text-muted"
                  }`}
                >
                  {c === "all" ? "All" : CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          )}
          {groups
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <section key={g.title} className="space-y-3">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
                  {g.title} · {g.items.length}
                </h2>
                <ul className="space-y-3">
                  {g.items.map((i) => (
                    <IntentionCard key={i._id} intention={i} />
                  ))}
                </ul>
              </section>
            ))}
        </>
      )}
    </div>
  );
}

function IntentionCard({ intention: i }: { intention: Doc<"intentions"> }) {
  const hard = i.constraints.filter((c) => c.strength === "hard");
  return (
    <li>
      <Link
        href={`/intentions/${i._id}`}
        className="block rounded-xl border border-border bg-surface p-4 transition hover:border-accent"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Chip>{CATEGORY_LABELS[i.category]}</Chip>
          <StatusChip status={i.status} />
          <SharingChips intention={i} />
        </div>
        <p className="mt-3 font-medium">{i.aim}</p>
        {i.counterpart && <p className="mt-1 text-sm">Needs: {i.counterpart}</p>}
        {i.blocker && <p className="mt-1 text-sm text-muted">Blocker: {i.blocker}</p>}
        {hard.length > 0 && (
          <p className="mt-1 text-sm text-muted">
            Must have:{" "}
            {hard.map((c) => (c.visibility === "private" ? `${c.text} (private)` : c.text)).join(" · ")}
          </p>
        )}
        <p className="mt-3 text-xs text-muted">
          Updated {timeAgo(i.updatedAt)} · revision {i.revision} · saved from {i.createdFrom}
        </p>
      </Link>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center">
      <p className="font-medium">No intentions yet</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Connect Search Agent to Claude and tell it what you&apos;re trying to do, for example
        &ldquo;I need a technical co-founder for a healthcare AI tool.&rdquo;
      </p>
    </div>
  );
}
