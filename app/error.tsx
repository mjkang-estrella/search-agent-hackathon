"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RelayLogo } from "@/components/relay-logo";
import { Button } from "@/components/ui/button";

/** Shown when a page throws, such as a search link that doesn't exist. */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto flex min-h-screen max-w-[560px] flex-col justify-center px-5 py-12">
      <Link href="/" aria-label="Relay home" className="mb-10 self-start rounded-sm">
        <RelayLogo />
      </Link>
      <h1 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">This page isn&apos;t available</h1>
      <p className="mt-3 text-muted-foreground">The link may be wrong, or the search may belong to another browser. Your board is untouched.</p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link href="/" className="inline-flex h-11 items-center rounded-full bg-[var(--relay-purple)] px-5 font-bold text-[var(--ink)] hover:bg-[#d5c9ef]">
          Open your board
        </Link>
        <Button variant="outline" className="h-11 rounded-full px-5 font-bold" onClick={() => retry()}>
          Try again
        </Button>
      </div>
    </main>
  );
}
