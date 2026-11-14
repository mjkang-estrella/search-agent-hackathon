"use client";

import { useAction, useMutation } from "convex/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Check, Loader2, RotateCw, Sparkles, X } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSessionId } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { errorText } from "@/lib/format";
import { cn } from "@/lib/utils";

type Board = FunctionReturnType<typeof api.board.get>;
type Intention = Board["memories"][number]["intentions"][number];

const EXAMPLES = [
  "I like washing cars on weekends. It's relaxing.",
  "My 3D printer sits idle most of the month.",
  "I want to learn to surf this summer but I'm nervous.",
  "Our small team needs a part-time designer for two months.",
];

const searching = (i: Intention) => i.state === "planning" || i.state === "searching";

export function intentionLabel(i: Pick<Intention, "inferred" | "kind">) {
  return i.inferred ? "Spotted by your agent" : i.kind === "offer" ? "You could help" : "You need";
}

/** Add a memory by hand: write it, see the intentions Wayfinder finds, and watch each one search. */
export function AddMemoryFlow({
  open,
  board,
  onClose,
  onDone,
}: {
  open: boolean;
  board: Board | undefined;
  onClose: () => void;
  onDone: (memoryId: string, intentionId: string) => void;
}) {
  const sessionId = useSessionId();
  const add = useAction(api.intentions.addMemory);
  const [text, setText] = useState("");
  const [step, setStep] = useState<"write" | "reading" | "found">("write");
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && step !== "reading" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step, onClose]);

  if (!open) return null;

  const memory = board?.memories.find((m) => m.intentions.some((i) => ids.includes(i._id)));
  const found = memory?.intentions.filter((i) => ids.includes(i._id)) ?? [];

  async function submit() {
    if (!sessionId) return;
    setStep("reading");
    try {
      setIds(await add({ sessionId, text, scenarioId: null }));
      setStep("found");
    } catch (e) {
      toast.error(errorText(e));
      setStep("write");
    }
  }

  function reset() {
    setText("");
    setIds([]);
    setStep("write");
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#0e1626]/45 p-0 sm:items-center sm:p-6" onClick={() => step !== "reading" && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add a memory"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[20px] font-extrabold tracking-[-0.015em]">
            {step === "write" ? "Add a memory" : step === "reading" ? "Reading your memory" : found.length === 1 ? "Found 1 intention" : `Found ${found.length} intentions`}
          </h2>
          {step !== "reading" ? (
            <button aria-label="Close" onClick={onClose} className="flex size-9 items-center justify-center rounded-full hover:bg-[#eef1f6]">
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        {step === "write" ? (
          <>
            <Textarea
              autoFocus
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Something you want, enjoy, or have lying around"
              className="resize-none rounded-2xl bg-[#f4f6fa] p-3.5 text-[16px]"
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setText(ex)}
                  className="rounded-full bg-[#eef1f6] px-3 py-1.5 text-left text-[13px] font-medium text-[var(--ink-muted)] hover:bg-[#e3e8f1]"
                >
                  {ex}
                </button>
              ))}
            </div>
            <Button className="mt-5 h-11 w-full rounded-full text-[15px] font-bold" disabled={text.trim().length < 12 || !sessionId} onClick={submit}>
              Find intentions <ArrowRight className="size-4" />
            </Button>
          </>
        ) : null}

        {step === "reading" ? (
          <div className="grid gap-3">
            <p className="rounded-2xl bg-[#f4f6fa] p-3.5 text-[15px] text-[var(--ink-muted)]">“{text.trim()}”</p>
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              <Loader2 className="size-4 animate-spin text-[var(--airmail)]" /> Looking for what you want or could offer
            </p>
          </div>
        ) : null}

        {step === "found" ? (
          <>
            <ul className="grid gap-2">
              {found.map((i) => {
                const count = i.ways.length + i.people.length;
                return (
                  <li key={i._id}>
                    <button
                      onClick={() => memory && onDone(memory._id, i._id)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-[#f4f6fa] px-4 py-3 text-left transition hover:bg-[#e9edf4]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] font-bold">{i.title}</span>
                        <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                          {i.inferred ? <Sparkles className="size-3" /> : null}
                          {intentionLabel(i)}
                        </span>
                      </span>
                      <span className={cn("shrink-0 text-[13px] font-semibold", searching(i) ? "text-muted-foreground" : "text-[var(--airmail)]")}>
                        {searching(i) ? (
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="size-3.5 animate-spin" /> Searching
                          </span>
                        ) : i.state === "failed" ? (
                          "Failed"
                        ) : (
                          <span className="flex items-center gap-1">
                            <Check className="size-3.5" /> {count} found
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-5 flex gap-2">
              <Button
                className="h-11 flex-1 rounded-full text-[15px] font-bold"
                disabled={!memory || !found.length}
                onClick={() => memory && found[0] && onDone(memory._id, found[0]._id)}
              >
                See results <ArrowRight className="size-4" />
              </Button>
              <Button variant="outline" className="h-11 rounded-full px-5 font-bold" onClick={reset}>
                Add another
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Under the ways: saved-results label, "Search again", and the trace link. */
export function WaysFooter({ intention }: { intention: Intention }) {
  const sessionId = useSessionId();
  const again = useMutation(api.intentions.searchAgain);
  const [busy, setBusy] = useState(false);
  if (!intention.run) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pt-1 text-[13px]">
      {intention.run.saved ? <span className="text-muted-foreground">Saved results</span> : null}
      <button
        disabled={busy || searching(intention) || !sessionId}
        onClick={async () => {
          setBusy(true);
          try {
            await again({ sessionId: sessionId!, intentionId: intention._id as Id<"intentions"> });
          } catch (e) {
            toast.error(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
        className="flex items-center gap-1 font-semibold text-[var(--airmail)] hover:underline disabled:opacity-50"
      >
        <RotateCw className="size-3.5" /> Search again
      </button>
      <Link href={`/r/${intention.run._id}`} className="font-semibold text-[var(--airmail)] hover:underline">
        How we found these
      </Link>
    </div>
  );
}
