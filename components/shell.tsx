import Link from "next/link";
import type { ReactNode } from "react";
import { RelayLogo } from "@/components/relay-logo";
import { cn } from "@/lib/utils";

/** The one header every page shares: the Relay mark on the left, account controls on the right. */
export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-5 pt-6 pb-2">
      <Link href="/" className="flex shrink-0 items-center gap-2 text-[20px] font-extrabold tracking-[-0.02em] text-[var(--airmail)]">
        <RelayLogo />
      </Link>
      {children ? <span className="flex min-w-0 items-center gap-2">{children}</span> : null}
    </header>
  );
}

export function Panel({ className, children, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("rounded-2xl bg-card shadow-sm", className)} {...rest}>
      {children}
    </section>
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
