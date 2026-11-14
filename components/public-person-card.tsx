import { ArrowUpRight } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { publicHttpUrl } from "@/lib/people";
import { PersonAvatar } from "./person-avatar";

type Person = NonNullable<FunctionReturnType<typeof api.board.get>>["memories"][number]["intentions"][number]["people"][number];
const PLATFORM_COLOR: Record<string, string> = {
  X: "#111111", TikTok: "#141414", Reddit: "#b83200", Facebook: "#1877f2", Instagram: "#b51c65", LinkedIn: "#0a66c2",
};

function postDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function PublicPersonCard({ person: p }: { person: Person }) {
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
            <span className="rounded-full bg-[#f3f5f8] px-2 py-0.5 text-[11px] font-bold" style={{ color: PLATFORM_COLOR[p.platform] ?? "#1d2433" }}>{p.platform}</span>
          </div>
          {p.about ? <p className="mt-0.5 text-[13.5px] leading-snug text-muted-foreground">{p.about}</p> : null}
        </div>
      </div>
      <div className="mt-3 text-[14px] leading-relaxed [overflow-wrap:anywhere]">
        <p className="text-[11px] font-bold text-muted-foreground">{p.matchChecked ? "Why this fits" : "Potential match · not checked"}</p>
        {p.reason ? <p className="mt-0.5">{p.reason}</p> : null}
        <div className="mt-2 rounded-xl bg-[#f3f5f8] px-3 py-2 text-[13px] text-[var(--ink-muted)]">
          {p.evidenceQuote ? <blockquote className="line-clamp-3">&ldquo;{p.evidenceQuote}&rdquo;</blockquote> : <p className="line-clamp-3">{p.excerpt || p.title}</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <span className="text-muted-foreground">Public post{date ? ` · ${date}` : ""}</span>
        {publicHttpUrl(p.url) ? <a href={p.url} target="_blank" rel="noreferrer" aria-label={`View post by ${name} on ${p.platform}`} className="inline-flex items-center gap-1 font-bold text-[var(--airmail)] hover:underline">View post <ArrowUpRight aria-hidden className="size-3.5" /></a> : null}
      </div>
    </article>
  );
}
