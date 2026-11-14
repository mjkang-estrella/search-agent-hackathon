"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Account } from "@/components/account";
import { SiteHeader } from "@/components/shell";
import { EvaluationPanel } from "@/components/evaluation-panel";

export default function EvaluationPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader>
        <Account />
      </SiteHeader>
      <main className="mx-auto max-w-[1280px] px-5 pt-2 pb-12">
        <Link href="/" className="-ml-1 mb-3 inline-flex min-h-10 items-center gap-1.5 px-1 text-[13px] font-semibold text-[var(--airmail)] hover:underline">
          <ArrowLeft aria-hidden className="size-3.5" /> Back to memories
        </Link>
        <h1 className="sr-only">Evaluation</h1>
        <EvaluationPanel />
      </main>
    </div>
  );
}
