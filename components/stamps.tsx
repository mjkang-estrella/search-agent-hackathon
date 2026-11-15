import { Globe, UserRound, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type Provenance = "inferred" | "public" | "member";

const PROVENANCE_LABEL: Record<Provenance, string> = {
  inferred: "Inferred",
  public: "Public source",
  member: "Member intention",
};

/** An oval rubber-stamp postmark naming where a claim came from. Inferred claims use a dashed ring. */
export function Postmark({
  kind,
  detail,
  tilt = -4,
  size = "md",
  className,
}: {
  kind: Provenance;
  detail?: string;
  tilt?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "stamp-in inline-flex shrink-0 flex-col items-center justify-center rounded-[50%] border-[1.5px] text-center font-extrabold uppercase leading-[1.15] whitespace-nowrap",
        "outline outline-1",
        size === "sm" ? "px-3 py-[3px] text-[11px] tracking-[0.06em] outline-offset-[1.5px]" : "px-4 py-1 text-[12px] tracking-[0.06em] outline-offset-2",
        kind === "inferred" ? "border-dashed text-[var(--ink-muted)] outline-dashed" : "text-[var(--relay-purple-strong)]",
        className,
      )}
      style={{ ["--stamp-rot" as string]: `${tilt}deg`, transform: `rotate(${tilt}deg)`, borderColor: "currentColor", outlineColor: "currentColor" }}
      title={kind === "inferred" ? "Inferred by the language model from general knowledge, without a web search" : kind === "public" ? "Found in a public source retrieved through Telem" : "Taken from another member's approved intention"}
    >
      {PROVENANCE_LABEL[kind]}
      {detail ? (
        <i className={cn("mt-0.5 border-t border-current pt-px font-semibold not-italic tracking-[0.12em]", "text-[11px]")}>{detail}</i>
      ) : null}
    </span>
  );
}

/** Marks a public condition the source page doesn't state. */
export function UnknownTag({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center rounded-full bg-[var(--kraft-soft)] px-2 text-[11px] font-bold whitespace-nowrap text-[var(--kraft-ink)]", className)}>
      Unknown
    </span>
  );
}

/** Labels a synthetic member or simulated step. Used wherever a sample appears. */
export function SampleTag({ className, children = "Sample" }: { className?: string; children?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center rounded-full bg-[var(--chip)] px-2 text-[11px] font-medium whitespace-nowrap text-muted-foreground", className)}>
      {children}
    </span>
  );
}

type Source = "public" | "sample" | "inferred";

const SOURCE = {
  public: { Icon: Globe, label: "Public page", title: "Found on a public page", className: "border-[color-mix(in_srgb,var(--relay-purple-strong)_35%,transparent)] bg-white text-[var(--relay-purple-strong)]" },
  sample: { Icon: UserRound, label: "Sample member", title: "A fictional member made for this demo", className: "border-[color-mix(in_srgb,var(--relay-peach-ink)_35%,transparent)] bg-[var(--relay-peach-soft)] text-[var(--relay-peach-ink)]" },
  inferred: { Icon: Sparkles, label: "Inferred", title: "Reasoned by the AI, not quoted from a source", className: "border-dashed border-[color-mix(in_srgb,var(--ink-muted)_55%,transparent)] text-[var(--ink-muted)]" },
} as const;

/** Says where a claim on the board came from: a public page, a sample member, or the AI's own reasoning (dashed). */
export function SourceMark({ kind, children, className }: { kind: Source; children?: string; className?: string }) {
  const { Icon, label, title, className: tone } = SOURCE[kind];
  return (
    <span title={title} className={cn("inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full border px-2 text-[11px] leading-none font-bold whitespace-nowrap", tone, className)}>
      <Icon aria-hidden className="size-3" />
      {children ?? label}
    </span>
  );
}
