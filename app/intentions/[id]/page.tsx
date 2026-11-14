"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { CATEGORY_LABELS, SEEKING_LABELS, SharingChips, StatusChip, timeAgo } from "@/components/badges";
import { DEMO_OWNER_ID } from "@/lib/demo";
import { DiscoveryPanel } from "@/components/DiscoveryPanel";

type Intention = Doc<"intentions">;
type Draft = Pick<
  Intention,
  "aim" | "blocker" | "counterpart" | "contributions" | "timing" | "location" | "constraints" | "category" | "seeking" | "status"
>;

function toDraft(i: Intention): Draft {
  return {
    aim: i.aim,
    blocker: i.blocker,
    counterpart: i.counterpart,
    contributions: i.contributions,
    timing: i.timing,
    location: i.location,
    constraints: i.constraints,
    category: i.category,
    seeking: i.seeking,
    status: i.status,
  };
}

export default function IntentionPage() {
  const { id } = useParams<{ id: string }>();
  const data = useQuery(api.intentions.get, { id: id as Id<"intentions">, ownerId: DEMO_OWNER_ID });

  if (data === undefined) return <p className="text-muted">Loading…</p>;
  if (data === null) {
    return (
      <p>
        Intention not found. <Link href="/" className="text-accent underline">Back to list</Link>
      </p>
    );
  }
  return <IntentionDetail intention={data.intention} events={data.events} />;
}

function IntentionDetail({
  intention,
  events,
}: {
  intention: Intention;
  events: Doc<"intentionEvents">[];
}) {
  const update = useMutation(api.intentions.update);
  const [draft, setDraft] = useState<Draft>(() => toDraft(intention));
  const [baseRevision, setBaseRevision] = useState(intention.revision);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(intention));
  const changedElsewhere = intention.revision !== baseRevision;

  // Follow live changes (e.g. Claude updated it) while there are no local edits.
  useEffect(() => {
    if (!dirty) {
      setDraft(toDraft(intention));
      setBaseRevision(intention.revision);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intention.revision]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const { status, ...patch } = draft;
      await update({
        id: intention._id,
        ownerId: DEMO_OWNER_ID,
        source: "dashboard",
        patch: {
          ...patch,
          // "" tells the server to clear the field.
          blocker: patch.blocker ?? "",
          counterpart: patch.counterpart ?? "",
          timing: patch.timing ?? "",
          location: patch.location ?? "",
        },
        status,
        expectedRevision: baseRevision,
      });
    } catch (e) {
      setError(e instanceof ConvexError ? String(e.data) : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setDraft(toDraft(intention));
    setBaseRevision(intention.revision);
    setError(null);
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← All intentions
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusChip status={intention.status} />
          <SharingChips intention={intention} />
          <span className="text-xs text-muted">
            Revision {intention.revision} · updated {timeAgo(intention.updatedAt)}
          </span>
        </div>
      </div>

      <SharingPanel intention={intention} />

      <DiscoveryPanel intention={intention} />

      <section className="space-y-5 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Intention</h2>

        <Field label="Aim" hint="What you're trying to achieve.">
          <textarea className={inputClass} rows={2} value={draft.aim} onChange={(e) => set("aim", e.target.value)} />
        </Field>
        <Field label="Blocker" hint="What would help you move forward.">
          <input
            className={inputClass}
            value={draft.blocker ?? ""}
            onChange={(e) => set("blocker", e.target.value || undefined)}
          />
        </Field>
        <Field label="Who would help" hint="What Claude thinks would unblock you. This drives the search.">
          <textarea
            className={inputClass}
            rows={2}
            value={draft.counterpart ?? ""}
            onChange={(e) => set("counterpart", e.target.value || undefined)}
          />
        </Field>
        <ListField
          label="What you can offer"
          hint="Experience, skills, or resources a counterpart might value."
          items={draft.contributions}
          onChange={(v) => set("contributions", v)}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Timing">
            <input
              className={inputClass}
              value={draft.timing ?? ""}
              onChange={(e) => set("timing", e.target.value || undefined)}
            />
          </Field>
          <Field label="Location">
            <input
              className={inputClass}
              value={draft.location ?? ""}
              onChange={(e) => set("location", e.target.value || undefined)}
            />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Category">
            <select
              className={inputClass}
              value={draft.category}
              onChange={(e) => set("category", e.target.value as Draft["category"])}
            >
              {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Looking for">
            <select
              className={inputClass}
              value={draft.seeking}
              onChange={(e) => set("seeking", e.target.value as Draft["seeking"])}
            >
              {Object.entries(SEEKING_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              className={inputClass}
              value={draft.status}
              onChange={(e) => set("status", e.target.value as Draft["status"])}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="done">Done</option>
            </select>
          </Field>
        </div>

        <ConstraintsEditor constraints={draft.constraints} onChange={(v) => set("constraints", v)} />

        {changedElsewhere && dirty && (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
            This intention changed while you were editing. Discard to load the latest version.
          </p>
        )}
        {error && <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={!dirty || saving || !draft.aim.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            onClick={discard}
            disabled={!dirty}
            className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40"
          >
            Discard
          </button>
        </div>
      </section>

      {intention.excerpts.length > 0 && (
        <section className="space-y-2 rounded-xl border border-border bg-surface p-5">
          <h2 className="font-semibold">From your conversation</h2>
          <p className="text-sm text-muted">Private. Used only to explain this intention to you.</p>
          <ul className="space-y-2">
            {intention.excerpts.map((x, n) => (
              <li key={n} className="border-l-2 border-border pl-3 text-sm italic">
                &ldquo;{x}&rdquo;
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">History</h2>
        <ul className="space-y-1 text-sm">
          {events.map((e) => (
            <li key={e._id} className="flex gap-3 text-muted">
              <span className="w-24 shrink-0">{timeAgo(e.at)}</span>
              <span className="w-20 shrink-0 capitalize">{e.source}</span>
              <span className="text-foreground">
                r{e.revision}: {e.summary}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SharingPanel({ intention }: { intention: Intention }) {
  const setSharing = useMutation(api.intentions.setSharing);
  const toggle = (next: { shareWithNetwork: boolean; allowWebSearch: boolean }) =>
    setSharing({ id: intention._id, ownerId: DEMO_OWNER_ID, ...next });

  const privateConstraints = intention.constraints.filter((c) => c.visibility === "private").length;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div>
        <h2 className="font-semibold">Who can use this</h2>
        <p className="text-sm text-muted">Only you can change this. Your assistant can&apos;t.</p>
      </div>
      <Toggle
        checked={intention.shareWithNetwork}
        onChange={(v) => toggle({ shareWithNetwork: v, allowWebSearch: intention.allowWebSearch })}
        title="Share with the network"
        description={`Other members' agents can find this and suggest an introduction. They see your aim, what you offer, and non-private constraints${
          privateConstraints
            ? ` (${privateConstraints === 1 ? "1 private condition stays" : `${privateConstraints} private conditions stay`} hidden)`
            : ""
        }. Your name and contact stay hidden until you both accept.`}
      />
      <Toggle
        checked={intention.allowWebSearch}
        onChange={(v) => toggle({ shareWithNetwork: intention.shareWithNetwork, allowWebSearch: v })}
        title="Use for public web search"
        description="Topics from this intention can be sent to Telem to search X, LinkedIn, Product Hunt, Substack, and the web. Your name, conversation excerpts, and private constraints are never sent."
      />
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer gap-3">
      <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--accent)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-sm text-muted">{description}</span>
      </span>
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="block text-xs text-muted">{hint}</span>}
      {children}
    </label>
  );
}

function ListField({
  label,
  hint,
  items,
  onChange,
}: {
  label: string;
  hint?: string;
  items: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="block text-xs text-muted">{hint}</span>}
      {items.map((item, n) => (
        <div key={n} className="flex gap-2">
          <input
            className={inputClass}
            value={item}
            onChange={(e) => onChange(items.map((x, i) => (i === n ? e.target.value : x)))}
          />
          <RemoveButton onClick={() => onChange(items.filter((_, i) => i !== n))} />
        </div>
      ))}
      <AddButton onClick={() => onChange([...items, ""])} />
    </div>
  );
}

function ConstraintsEditor({
  constraints,
  onChange,
}: {
  constraints: Intention["constraints"];
  onChange: (v: Intention["constraints"]) => void;
}) {
  const patch = (n: number, value: Partial<Intention["constraints"][number]>) =>
    onChange(constraints.map((c, i) => (i === n ? { ...c, ...value } : c)));
  return (
    <div className="space-y-1">
      <span className="text-sm font-medium">Conditions</span>
      <span className="block text-xs text-muted">
        Must-have conditions rule out a match. Preferences only change the order. Private conditions are
        checked for you but never shown to anyone.
      </span>
      {constraints.map((c, n) => (
        <div key={n} className="flex flex-wrap gap-2 sm:flex-nowrap">
          <input className={inputClass} value={c.text} onChange={(e) => patch(n, { text: e.target.value })} />
          <select
            className={`${inputClass} sm:w-36`}
            value={c.strength}
            onChange={(e) => patch(n, { strength: e.target.value as "hard" | "soft" })}
          >
            <option value="hard">Must have</option>
            <option value="soft">Preference</option>
          </select>
          <select
            className={`${inputClass} sm:w-32`}
            value={c.visibility}
            onChange={(e) => patch(n, { visibility: e.target.value as "network" | "private" })}
          >
            <option value="network">Visible</option>
            <option value="private">Private</option>
          </select>
          <RemoveButton onClick={() => onChange(constraints.filter((_, i) => i !== n))} />
        </div>
      ))}
      <AddButton onClick={() => onChange([...constraints, { text: "", strength: "hard", visibility: "network" }])} />
    </div>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-sm text-accent">
      + Add
    </button>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove"
      className="shrink-0 rounded-lg border border-border px-3 text-sm text-muted hover:text-foreground"
    >
      ×
    </button>
  );
}
