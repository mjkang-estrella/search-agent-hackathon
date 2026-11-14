import { cn } from "@/lib/utils";

/** The Relay mark: one point hands off to the next. `plain` drops the blue tile for use on the blue top bar. */
export function RelayMark({ plain = false, className }: { plain?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-6 shrink-0", className)}>
      {plain ? null : <rect width="32" height="32" rx="8" fill="var(--airmail)" />}
      <path d="M9 23 C 9 14, 14 9.5, 20 9.8" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="9" cy="23" r="3.2" fill="#fff" />
      <circle cx="22.5" cy="10" r="4" fill="var(--airmail-red)" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}
