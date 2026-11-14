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
        size === "sm" ? "px-3 py-[3px] text-[8.5px] tracking-[0.09em] outline-offset-[1.5px]" : "px-4 py-1 text-[9.5px] tracking-[0.09em] outline-offset-2",
        kind === "inferred" ? "border-dashed text-[#6e6880] outline-dashed" : "text-[var(--postmark)]",
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

export type ResultWord = "meets" | "conflicts" | "unknown";

/** A stamped constraint result. Only three words exist; there are no percentages. */
export function ResultStamp({ result, className }: { result: ResultWord; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block min-w-[78px] -rotate-2 rounded-[3px] border-[1.5px] px-1.5 py-px text-center text-[9.5px] font-extrabold uppercase tracking-[0.12em]",
        result === "meets" && "border-[var(--airmail)] text-[var(--airmail)]",
        result === "conflicts" && "border-[var(--airmail-red)] bg-[#fbecec] text-[var(--airmail-red)]",
        result === "unknown" && "border-[var(--kraft)] bg-[var(--kraft-soft)] text-[var(--kraft-ink)]",
        className,
      )}
    >
      {result === "meets" ? "Meets" : result === "conflicts" ? "Conflicts" : "Unknown"}
    </span>
  );
}

export function SyntheticTag({ className, children = "Synthetic member" }: { className?: string; children?: string }) {
  return (
    <span
      className={cn("inline-flex h-5 items-center rounded px-1.5 text-[11px] font-bold whitespace-nowrap text-[var(--postmark)]", className)}
      style={{ background: "var(--postmark-soft)" }}
    >
      {children}
    </span>
  );
}

export function SimulatedTag({ className }: { className?: string }) {
  return <SyntheticTag className={className}>Simulated</SyntheticTag>;
}

/**
 * The circular cancellation mark for a run: LIVE, REPLAY, or CACHED, with its date.
 * Drawn for the airmail-blue header, in white.
 */
export function Cancellation({ mode, at, ring = "TELEM · PUBLIC SEARCH · WAYFINDER ·" }: { mode: "live" | "replay" | "draft"; at: number; ring?: string }) {
  const date = new Date(at)
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
  const word = mode === "live" ? "LIVE" : mode === "replay" ? "REPLAY" : "DRAFT";
  return (
    <svg
      className="stamp-in shrink-0"
      style={{ ["--stamp-rot" as string]: "0deg" }}
      width="176"
      height="88"
      viewBox="0 0 176 88"
      role="img"
      aria-label={`${word} run, ${date}`}
    >
      <defs>
        <path id={`ring-${mode}`} d="M44 44 m-31 0 a31 31 0 1 1 62 0 a31 31 0 1 1 -62 0" />
      </defs>
      <g fill="none" stroke="#fff" strokeOpacity=".85">
        <circle cx="44" cy="44" r="40" strokeWidth="1.6" strokeDasharray={mode === "replay" ? "4 3" : undefined} />
        <circle cx="44" cy="44" r="26" strokeWidth="1" />
        <path
          d="M90 28q8-6 16 0t16 0t16 0t16 0t16 0M90 39q8-6 16 0t16 0t16 0t16 0t16 0M90 50q8-6 16 0t16 0t16 0t16 0t16 0M90 61q8-6 16 0t16 0t16 0t16 0t16 0"
          strokeWidth="1.5"
          strokeOpacity=".45"
        />
      </g>
      <text fill="#fff" fontSize="6.6" fontWeight="700" letterSpacing="1.2">
        <textPath href={`#ring-${mode}`} startOffset="1%">
          {ring}
        </textPath>
      </text>
      <text x="44" y="43" textAnchor="middle" fill="#fff" fontSize={word.length > 4 ? 10.5 : 12.5} fontWeight="800" letterSpacing="1.5">
        {word}
      </text>
      <text x="44" y="53" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700" letterSpacing=".3">
        {date}
      </text>
    </svg>
  );
}

export function KindLabel({ kind }: { kind: "public" | "member" | "combined" }) {
  return <span className="text-[10.5px] font-extrabold tracking-[0.12em] text-[var(--airmail)] uppercase">{kind}</span>;
}

export function FitLabel({ fit }: { fit: "strong_fit" | "possible_fit" | "not_a_fit" }) {
  return (
    <span className={cn("text-xs", fit === "strong_fit" ? "font-semibold text-foreground" : fit === "possible_fit" ? "font-medium text-muted-foreground" : "font-semibold text-[var(--airmail-red)]")}>
      {fit === "strong_fit" ? "Strong fit" : fit === "possible_fit" ? "Possible fit" : "Not a fit"}
    </span>
  );
}
