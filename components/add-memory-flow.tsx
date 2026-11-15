"use client";

import { useAction, useMutation } from "convex/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

type Board = NonNullable<FunctionReturnType<typeof api.board.get>>;
type Intention = Board["memories"][number]["intentions"][number];
type IntentionSummary = NonNullable<FunctionReturnType<typeof api.board.overview>>["intentions"][number];

const EXAMPLES = [
  "I like washing cars on weekends. It's relaxing.",
  "My 3D printer sits idle most of the month.",
  "I want to learn to surf this summer but I'm nervous.",
  "Our small team needs a part-time designer for two months.",
];

const searching = (i: Pick<Intention, "state">) => i.state === "planning" || i.state === "searching";

export function intentionLabel(i: Pick<Intention, "inferred" | "kind">) {
  return i.inferred ? "Spotted by your agent" : i.kind === "offer" ? "You could help" : "You need";
}

/**
 * Add a memory by hand: write it, see the intentions Relay finds, and watch each one search.
 * A native modal dialog keeps focus inside and hands it back to the + button when it closes.
 */
export function AddMemoryFlow({
  open,
  intentions,
  onClose,
  onDone,
}: {
  open: boolean;
  intentions: IntentionSummary[];
  onClose: () => void;
  onDone: (memoryId: string, intentionId: string) => void;
}) {
  const sessionId = useSessionId();
  const add = useAction(api.intentions.addMemory);
  const dialog = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  const [step, setStep] = useState<"write" | "reading" | "found">("write");
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // React's autoFocus doesn't reach the dialog's own focus step, so start in the text box by hand.
      d.querySelector("textarea")?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [open]);

  const found = intentions.filter((i) => ids.includes(i._id));
  const memoryId = found[0]?.memoryId;
  // The action returns before the live board includes the new memory. Keep reading until it arrives.
  const view = step === "found" && found.length === 0 ? "reading" : step;

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

  // A finished flow starts fresh next time. A draft stays, so closing by accident loses nothing.
  function close() {
    if (step === "found") reset();
    onClose();
  }

  function finish(intentionId: string) {
    if (!memoryId) return;
    reset();
    onDone(memoryId, intentionId);
  }

  return (
    <dialog
      ref={dialog}
      aria-label="Add a memory"
      // Escape and a click on the backdrop close it, except while the memory is being read.
      onCancel={(e) => {
        e.preventDefault();
        if (step !== "reading") close();
      }}
      onClick={(e) => e.target === e.currentTarget && step !== "reading" && close()}
      className="max-h-[90dvh] overflow-y-auto overscroll-contain mx-auto mt-auto mb-0 w-full max-w-[min(560px,100%)] rounded-t-3xl bg-popover p-5 text-foreground shadow-2xl backdrop:bg-[var(--scrim)]/45 sm:my-auto sm:max-w-[min(560px,calc(100%-3rem))] sm:rounded-3xl sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[20px] font-extrabold tracking-[-0.015em]">
          {view === "write" ? "Add a memory" : view === "reading" ? "Reading your memory" : found.length === 1 ? "Found 1 intention" : `Found ${found.length} intentions`}
        </h2>
        {view !== "reading" ? (
          <button aria-label="Close" onClick={close} className="flex size-10 items-center justify-center rounded-full hover:bg-[var(--chip)]">
            <X aria-hidden className="size-4" />
          </button>
        ) : null}
      </div>

      {step === "write" ? (
        <>
          <Textarea
            autoFocus
            rows={4}
            aria-label="Memory"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Something you want, enjoy, or have lying around"
            className="resize-none rounded-2xl bg-[var(--ground)] p-3.5 text-[16px]"
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setText(ex)}
                className="min-h-9 rounded-full bg-[var(--chip)] px-3 py-1.5 text-left text-[13px] font-medium text-[var(--ink-muted)] hover:bg-[var(--chip-strong)]"
              >
                {ex}
              </button>
            ))}
          </div>
          <Button className="mt-5 h-11 w-full rounded-full text-[15px] font-bold" disabled={text.trim().length < 12 || !sessionId} onClick={submit}>
            Find intentions <ArrowRight aria-hidden className="size-4" />
          </Button>
        </>
      ) : null}

      {view === "reading" ? (
        <div className="grid gap-3">
          <p className="rounded-2xl bg-[var(--ground)] p-3.5 text-[15px] text-[var(--ink-muted)]">&ldquo;{text.trim()}&rdquo;</p>
          <p role="status" className="flex items-center gap-2 text-[15px] font-semibold">
            <Loader2 aria-hidden className="size-4 animate-spin text-[var(--airmail)]" /> Looking for what you want or could offer
          </p>
        </div>
      ) : null}

      {view === "found" ? (
        <>
          <ul className="grid gap-2">
            {found.map((i) => (
              <li key={i._id}>
                <button
                  onClick={() => finish(i._id)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-[var(--ground)] px-4 py-3 text-left transition hover:bg-[var(--tint)]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-bold">{i.title}</span>
                    <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                      {i.inferred ? <Sparkles aria-hidden className="size-3" /> : null}
                      {intentionLabel(i)}
                    </span>
                  </span>
                  <span className={cn("shrink-0 text-[13px] font-semibold", searching(i) ? "text-muted-foreground" : "text-[var(--airmail)]")}>
                    {searching(i) ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 aria-hidden className="size-3.5 animate-spin" /> Searching
                      </span>
                    ) : i.state === "failed" ? (
                      "Failed"
                    ) : (
                      <span className="flex items-center gap-1">
                        <Check aria-hidden className="size-3.5" /> {i.found} found
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex gap-2">
            <Button
              className="h-11 flex-1 rounded-full text-[15px] font-bold"
              disabled={!memoryId}
              onClick={() => found[0] && finish(found[0]._id)}
            >
              See results <ArrowRight aria-hidden className="size-4" />
            </Button>
            <Button variant="outline" className="h-11 rounded-full px-5 font-bold" onClick={reset}>
              Add another
            </Button>
          </div>
        </>
      ) : null}
    </dialog>
  );
}

/** Under the ways: saved-results label, "Search again", and the trace link. */
export function WaysFooter({ intention }: { intention: Pick<Intention, "_id" | "state" | "run"> }) {
  const sessionId = useSessionId();
  const again = useMutation(api.intentions.searchAgain);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pt-1 text-[13px]">
      {intention.run?.saved ? <span className="text-muted-foreground">Saved results</span> : null}
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
        className="flex min-h-8 items-center gap-1 font-semibold text-[var(--relay-purple-strong)] hover:underline disabled:opacity-50"
      >
        <RotateCw className="size-3.5" /> Search again
      </button>
      {intention.run ? <Link href={`/r/${intention.run._id}`} className="inline-flex min-h-8 items-center font-semibold text-[var(--relay-purple-strong)] hover:underline">
        How we found these
      </Link> : null}
    </div>
  );
}
