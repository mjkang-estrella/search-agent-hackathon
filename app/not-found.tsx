import Link from "next/link";
import { RelayLogo } from "@/components/relay-logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[560px] flex-col justify-center px-5 py-12">
      <Link href="/" aria-label="Relay home" className="mb-10 self-start rounded-sm">
        <RelayLogo />
      </Link>
      <h1 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">There&apos;s nothing at this address</h1>
      <p className="mt-3 text-muted-foreground">Your memories and matches are on your board.</p>
      <Link href="/" className="mt-8 inline-flex h-11 items-center self-start rounded-full bg-[var(--relay-purple)] px-5 font-bold text-[var(--ink)] hover:bg-[#d5c9ef]">
        Open your board
      </Link>
    </main>
  );
}
