"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { introDraft, publicHttpUrl } from "@/lib/people";
import { SourceMark } from "./stamps";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { PersonAvatar } from "./person-avatar";

type Person = NonNullable<FunctionReturnType<typeof api.board.get>>["memories"][number]["intentions"][number]["people"][number];
const PLATFORM_COLOR: Record<string, string> = {
  X: "#111111", TikTok: "#141414", Reddit: "#b83200", Facebook: "#0b5cc4", Instagram: "#b51c65", LinkedIn: "#0a66c2",
};

function postDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** A public post and its author. With an aim, the card can draft a first message to copy. */
export function PublicPersonCard({ person: p, aim }: { person: Person; aim?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const name = p.author || "Public author";
  const date = postDate(p.publishedAt);
  const profile = publicHttpUrl(p.profileUrl);
  return (
    <article className="min-w-0 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <PersonAvatar src={publicHttpUrl(p.avatarUrl)} name={name} />
        <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {profile ? <a href={profile} target="_blank" rel="noreferrer" className="text-[16px] font-bold hover:underline">{name}</a> : <h4 className="text-[16px] font-bold">{name}</h4>}
            <span className="rounded-full bg-[var(--soft)] px-2 py-0.5 text-[11px] font-bold" style={{ color: PLATFORM_COLOR[p.platform] ?? "#1d2433" }}>{p.platform}</span>
          </div>
          {p.about ? <p className="mt-0.5 text-[13.5px] leading-snug text-muted-foreground">{p.about}</p> : null}
        </div>
      </div>
      <div className="mt-3 text-[14px] leading-relaxed [overflow-wrap:anywhere]">
        <p className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-muted-foreground">{p.matchChecked ? <>Why this fits <SourceMark kind="inferred" /></> : "Potential match · not checked"}</p>
        {p.reason ? <p className="mt-1">{p.reason}</p> : null}
        <div className="mt-2 rounded-xl bg-[var(--soft)] px-3 py-2 text-[13px] text-[var(--ink-muted)]">
          {p.evidenceQuote ? <blockquote className="line-clamp-3">&ldquo;{p.evidenceQuote}&rdquo;</blockquote> : <p className="line-clamp-3">{p.excerpt || p.title}</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span className="flex items-center gap-2 text-[12px] text-muted-foreground"><SourceMark kind="public">Public post</SourceMark>{date}</span>
        <span className="flex items-center gap-1">
          {publicHttpUrl(p.url) ? <a href={p.url} target="_blank" rel="noreferrer" aria-label={`View post by ${name} on ${p.platform}`} className="inline-flex h-9 items-center gap-1 rounded-full px-3 font-bold text-[var(--relay-purple-strong)] hover:bg-[var(--soft)]">View post <ArrowUpRight aria-hidden className="size-3.5" /></a> : null}
          {aim && draft === null ? (
            <Button className="h-9 rounded-full bg-[var(--relay-lavender)] px-3.5 text-[13px] font-bold text-[var(--relay-purple-strong)] hover:bg-[#e1d5fb]" onClick={() => { setDraft(introDraft(p, aim)); setCopied(false); }}>
              Draft an intro
            </Button>
          ) : null}
        </span>
      </div>
      {draft !== null ? (
        <div className="reveal mt-3 border-t border-[var(--line)] pt-3">
          <Textarea
            aria-label={`Message to ${name}`}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setCopied(false); }}
            rows={5}
            className="resize-y rounded-xl bg-[var(--soft)] p-3 text-[14px] leading-relaxed shadow-none"
          />
          <p className="mt-2 text-[12.5px] text-muted-foreground">Relay doesn&apos;t send this. Copy it and reach out on {p.platform}.</p>
          <div className="mt-3 flex items-center gap-2">
            <Button
              className="h-10 rounded-full px-4 text-[14px] font-bold"
              disabled={!draft.trim()}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(draft);
                  setCopied(true);
                } catch {
                  toast.error("Could not copy. Select the message to copy it.");
                }
              }}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy message"}
            </Button>
            <Button variant="ghost" className="h-10 rounded-full px-4 text-[14px] font-semibold text-muted-foreground" onClick={() => setDraft(null)}>Close</Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
