"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TopBar } from "@/components/shell";
import { EvaluationPanel } from "@/components/evaluation-panel";

export default function EvaluationPage() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-[1100px] px-4 py-5 sm:px-6">
        <Link href="/" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--airmail)] hover:underline">
          <ArrowLeft className="size-3.5" /> Back to memories
        </Link>
        <EvaluationPanel />
      </main>
    </div>
  );
}
