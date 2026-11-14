import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TopBar({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex h-[52px] items-center justify-between gap-4 bg-[var(--airmail)] px-4 text-white sm:px-6">
      <Link href="/" className="flex items-center gap-2.5 text-[17px] font-extrabold tracking-[-0.01em]">
        <span aria-hidden className="size-2.5 rounded-full bg-[var(--airmail-red)] ring-[3px] ring-white/20" />
        Wayfinder
      </Link>
      <nav className="flex items-center gap-4 text-[13px] font-semibold text-[var(--airmail-ink)]">{children}</nav>
    </header>
  );
}

export function Panel({ className, children, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(24,32,47,0.05)]", className)} {...rest}>
      {children}
    </section>
  );
}

export function SectionLabel({ children, aside, className }: { children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <h3 className={cn("mb-2 flex items-center justify-between gap-3 text-[10.5px] font-bold tracking-[0.12em] text-muted-foreground uppercase", className)}>
      <span>{children}</span>
      {aside ? <span className="text-xs font-semibold tracking-normal text-[var(--airmail)] normal-case">{aside}</span> : null}
    </h3>
  );
}

export function LoadingBlock({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
      <span className="size-2 animate-pulse rounded-full bg-[var(--airmail)]" />
      {label}
    </div>
  );
}
