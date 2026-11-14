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
        "stamp-in inline-flex shrink-0 flex-col items-center justify-center rounded-[50%] border-[1.5px] text-center font-extrabold uppercase leading-[1.15] whitespace-nowrap text-[var(--postmark)]",
        "outline outline-1",
        size === "sm" ? "px-3 py-[3px] text-[8.5px] tracking-[0.09em] outline-offset-[1.5px]" : "px-4 py-1 text-[9.5px] tracking-[0.09em] outline-offset-2",
        kind === "inferred" && "border-dashed outline-dashed",
        className,
      )}
      style={{ ["--stamp-rot" as string]: `${tilt}deg`, transform: `rotate(${tilt}deg)`, borderColor: "currentColor", outlineColor: "currentColor" }}
      title={kind === "inferred" ? "Inferred by the language model from general knowledge, without a web search" : kind === "public" ? "Found in a public source retrieved through Telem" : "Taken from another member's approved intention"}
    >
      {PROVENANCE_LABEL[kind]}
      {detail ? (
        <i className={cn("mt-0.5 border-t border-current pt-px font-semibold not-italic tracking-[0.12em]", size === "sm" ? "text-[8px]" : "text-[8.5px]")}>{detail}</i>
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
