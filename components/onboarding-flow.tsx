"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Compass,
  Loader2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSessionId } from "./providers";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { PersonAvatar } from "./person-avatar";
import { AgentMark, hasAgentMark } from "./agent-mark";
import { WaysFooter } from "./add-memory-flow";
import { errorText } from "@/lib/format";
import { introDraft, publicHttpUrl } from "@/lib/people";
import { SEARCH_STEPS, searchStep } from "@/lib/search-steps";
import { cn } from "@/lib/utils";

type Board = NonNullable<FunctionReturnType<typeof api.board.get>>;
type Intention = Board["memories"][number]["intentions"][number];
type Person = Intention["people"][number];
type Way = Intention["ways"][number];
type Step = "write" | "reading" | "notice" | "results" | "people" | "knowledge";
const primary = "h-12 rounded-xl px-5 text-base font-semibold shadow-none";
const heading =
  "text-[34px] leading-[1.13] font-bold tracking-[-0.025em] sm:text-[46px]";
const link =
  "inline-flex min-h-8 items-center text-[var(--relay-purple-strong)] hover:underline underline-offset-4";

/** A guided first discovery. Searches start as soon as a memory is submitted. */
export function OnboardingFlow({
  board,
  initialIntentionId,
  onBegin,
  onDone,
  connection,
}: {
  board: Board | undefined;
  onBegin: () => void;
  initialIntentionId?: Id<"intentions">;
  onDone: (selection?: { memoryId: string; intentionId: string }) => void;
  connection: React.ReactNode;
}) {
  const sessionId = useSessionId();
  const add = useAction(api.intentions.addMemory);
  const demo = useAction(api.intentions.startDemoPersona);
  const persona = useQuery(api.intentions.getPersona);
  const update = useMutation(api.intentions.updateIntention);
  const again = useMutation(api.intentions.searchAgain);
  const [step, setStep] = useState<Step>(
    initialIntentionId ? "results" : "write",
  );
  const [text, setText] = useState("");
  const [ids, setIds] = useState<Id<"intentions">[] | null>(null);
  const [selected, setSelected] = useState<Id<"intentions"> | null>(
    initialIntentionId ?? null,
  );
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [why, setWhy] = useState(false);
  const [others, setOthers] = useState(false);
  const [editing, setEditing] = useState(false);
  const [aim, setAim] = useState("");
  const [draftPerson, setDraftPerson] = useState<Person | null>(null);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const all =
    board?.memories.flatMap((memory) =>
      memory.intentions.map((intention) => ({ memory, intention })),
    ) ?? [];
  const found = all.filter(
    ({ intention }) => ids === null || ids.includes(intention._id),
  );
  const active =
    found.find(({ intention }) => intention._id === selected) ?? found[0];
  const intention = active?.intention;
  const detail = useQuery(
    api.intentions.getIntention,
    sessionId && intention ? { sessionId, intentionId: intention._id } : "skip",
  );
  const quotes = detail?.evidence.filter((e) => e.verified) ?? [];
  const view = step === "reading" && !busy && found.length ? "notice" : step;
  const searching =
    intention?.state === "planning" || intention?.state === "searching";

  function openDashboard() {
    onDone(
      active
        ? { memoryId: active.memory._id, intentionId: active.intention._id }
        : undefined,
    );
  }

  async function submit(sample: boolean) {
    if (!sessionId || submitting.current) return;
    submitting.current = true;
    onBegin();
    setBusy(true);
    setError(null);
    setStep("reading");
    try {
      if (sample) {
        setIds(null);
        await demo({ sessionId });
      } else {
        setIds(await add({ sessionId, text: text.trim(), scenarioId: null }));
      }
    } catch (e) {
      setError(errorText(e));
      setStep("write");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!sessionId || !intention || !detail || !aim.trim()) return;
    setBusy(true);
    try {
      await update({
        sessionId,
        intentionId: intention._id,
        expectedRevision: detail.revision,
        card: { ...detail.card, title: aim.trim(), aim: aim.trim() },
      });
      await again({ sessionId, intentionId: intention._id });
      setEditing(false);
      setStep("results");
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  function select(id: Id<"intentions">) {
    setSelected(id);
    setWhy(false);
    setOthers(false);
    setEditing(false);
    setStep("notice");
  }

  function compose(person: Person) {
    setDraftPerson(person);
    setCopied(false);
    setDraft(introDraft(person, intention?.aim || intention?.title));
  }

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-100px)] max-w-[720px] flex-col py-8 sm:py-12">
      <div className="mb-10 flex items-center justify-between gap-4 text-sm">
        <span className="text-muted-foreground">
          {view === "write" || view === "reading"
            ? "1 · Your memories"
            : view === "notice"
              ? "2 · What you want"
              : "3 · People & opportunities"}
        </span>
        {draftPerson || view === "results" || view === "people" || view === "knowledge" ? null : (
          <button
            className="min-h-8 shrink-0 text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
            onClick={openDashboard}
          >
            Skip for now
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <div
          key={draftPerson ? "draft" : view}
          className="onboarding-enter w-full"
        >
          {draftPerson ? (
            <>
              <Back onClick={() => setDraftPerson(null)} />
              <h1 className={heading}>
                Say hi to {(draftPerson.author || "this person").split(" ")[0]}
              </h1>
              <p className="mt-3 text-muted-foreground">
                Edit your message, then copy it to reach out.
              </p>
              <Textarea
                aria-label="Introduction message"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setCopied(false);
                }}
                rows={6}
                className="mt-10 resize-y rounded-2xl border-[var(--line)] bg-white p-6 text-base leading-relaxed shadow-none"
              />
              <div className="mt-6 flex flex-wrap items-center gap-6">
                <Button
                  className={primary}
                  disabled={!draft.trim()}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(draft);
                      setCopied(true);
                    } catch {
                      toast.error(
                        "Could not copy. Select the message to copy it.",
                      );
                    }
                  }}
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {copied ? "Copied" : "Copy message"}
                </Button>
                {publicHttpUrl(draftPerson.profileUrl) ||
                publicHttpUrl(draftPerson.url) ? (
                  <a
                    className={cn(link, "inline-flex items-center gap-1")}
                    href={
                      publicHttpUrl(draftPerson.profileUrl) ??
                      publicHttpUrl(draftPerson.url) ??
                      undefined
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open on {draftPerson.platform}
                    <ArrowUpRight className="size-4" />
                  </a>
                ) : null}
              </div>
            </>
          ) : view === "write" ? (
            <>
              <h1 className={heading}>What have you been telling your AI?</h1>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit(false);
                }}
              >
                <Textarea
                  aria-label="Paste a conversation or memory"
                  placeholder={
                    "Paste a chat or memory from your AI.\n\nSomething you want to do, a problem you're working on, or an idea you keep coming back to."
                  }
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  minLength={20}
                  maxLength={8000}
                  required
                  rows={7}
                  aria-describedby="onboarding-hint"
                  className="mt-10 resize-y rounded-2xl border-[var(--line)] bg-white p-5 text-base leading-relaxed shadow-none"
                />
                <p id="onboarding-hint" className={cn("mt-3 text-sm text-muted-foreground", text.trim().length >= 20 && "invisible")}>
                  {text.trim() ? "Add a little more detail. Use at least 20 characters." : "A sentence or two is enough."}
                </p>
                {error ? (
                  <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
                    {error}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                  <button
                    type="button"
                    className={cn(link, "text-sm disabled:opacity-50 disabled:hover:no-underline")}
                    disabled={busy || !sessionId || !persona}
                    onClick={() => void submit(true)}
                  >
                    Try {persona?.name ?? "a demo"}&apos;s sample memories
                  </button>
                  <Button
                    type="submit"
                    className={primary}
                    disabled={text.trim().length < 20 || busy || !sessionId}
                  >
                    Find what I need
                  </Button>
                </div>
              </form>
              <details className="mt-10 text-sm text-muted-foreground">
                <summary className="flex min-h-8 cursor-pointer items-center">
                  Connect your AI
                </summary>
                <div className="pt-2">{connection}</div>
              </details>
            </>
          ) : view === "reading" ? (
            <>
              <h1 className={heading}>
                Reading your {ids === null ? "memories" : "conversation"}...
              </h1>
              <div role="status" aria-live="polite" className="mt-10">
                <div className="h-1 overflow-hidden rounded-full bg-[var(--soft)]">
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--ink)]" />
                </div>
                <p className="mt-9 flex items-center gap-3">
                  <Loader2 className="size-5 animate-spin" />
                  Working out what you want
                </p>
                <p className="mt-5 text-muted-foreground">
                  Then we search the web and people
                </p>
              </div>
              <button
                className={cn(link, "mt-10 text-sm")}
                onClick={openDashboard}
              >
                Open board
              </button>
            </>
          ) : view === "knowledge" ? (
            <>
              <h1 className={heading}>What your AI knows</h1>
              <p className="mt-3 text-muted-foreground">
                Choose which intentions to use for future searches.
              </p>
              <div className="mt-10 divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
                {all.map(({ memory, intention: item }) => (
                  <SearchPreference
                    key={item._id}
                    intention={item}
                    source={memory.source}
                    sample={memory.sample}
                  />
                ))}
              </div>
              <Button className={cn(primary, "mt-10")} onClick={openDashboard}>
                Open board
              </Button>
            </>
          ) : intention ? (
            <>
              <Back
                onClick={() => {
                  if (view === "notice" && !text) setText(active.memory.text);
                  setStep(view === "people" ? "results" : view === "results" ? "notice" : "write");
                }}
              />
              {view === "people" ? (
                <>
                  <h1 className={heading}>
                    {intention.people.length}{" "}
                    {intention.people.length === 1 ? "person" : "people"} worth
                    a look
                  </h1>
                  <p className="mt-3 text-muted-foreground">
                    Public posts. Availability is unconfirmed.
                  </p>
                  <div className="mt-10 divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
                    {intention.people.map((person, index) => (
                      <PersonResult
                        key={person._id}
                        person={person}
                        onDraft={() => compose(person)}
                        expanded={index === 0}
                      />
                    ))}
                  </div>
                  <div className="mt-5">
                    <WaysFooter intention={intention} />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      {active.memory.sample
                        ? "Sample memory"
                        : active.memory.source && !hasAgentMark(active.memory.source)
                          ? `From ${active.memory.source}`
                          : "From your conversation"}
                      <AgentMark source={active.memory.source} />
                    </span>
                    <button
                      className={cn(link, "inline-flex items-center gap-1")}
                      aria-expanded={why}
                      onClick={() => setWhy(!why)}
                    >
                      {why ? "Hide" : "See why"}
                      <ChevronDown
                        className={cn("size-3.5", why && "rotate-180")}
                      />
                    </button>
                  </div>
                  {why ? (
                    <div className="mt-5 grid gap-3 text-muted-foreground">
                      {quotes.length ? (
                        quotes.map((e, index) => (
                          <blockquote
                            key={index}
                            className="border-l-2 border-[var(--line)] pl-4"
                          >
                            &ldquo;{e.quote}&rdquo;
                          </blockquote>
                        ))
                      ) : (
                        <p className="whitespace-pre-line border-l-2 border-[var(--line)] pl-4">
                          {active.memory.text}
                        </p>
                      )}
                    </div>
                  ) : null}
                  {intention.inferred ? (
                    <span className="mt-5 inline-block rounded-full bg-[var(--soft)] px-3 py-1 text-sm text-muted-foreground">
                      Something you might not have asked for
                    </span>
                  ) : null}
                  {editing ? (
                    <div className="mt-6">
                      <label
                        htmlFor="onboarding-aim"
                        className="text-sm font-semibold"
                      >
                        What are you trying to do?
                      </label>
                      <Textarea
                        id="onboarding-aim"
                        value={aim}
                        onChange={(e) => setAim(e.target.value)}
                        maxLength={300}
                        className="mt-3 bg-white p-4 text-lg"
                      />
                      <div className="mt-5 flex gap-4">
                        <Button
                          className={primary}
                          disabled={busy || !aim.trim() || !detail}
                          onClick={saveEdit}
                        >
                          {busy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : null}
                          Save and search
                        </Button>
                        <button
                          onClick={() => setEditing(false)}
                          className="min-h-8 text-muted-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h1
                        className={cn(heading, "mt-6 [overflow-wrap:anywhere]")}
                      >
                        {intention.title}
                      </h1>
                      {view === "notice" ? (
                        <div className="mt-8 flex items-center gap-6">
                          <Button
                            className={primary}
                            onClick={() => setStep("results")}
                          >
                            See what we found
                          </Button>
                          <button
                            className="min-h-8 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setAim(intention.aim);
                              setEditing(true);
                            }}
                          >
                            Change it
                          </button>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm">
                          <button
                            className={link}
                            onClick={() => {
                              setAim(intention.aim);
                              setEditing(true);
                            }}
                          >
                            Edit
                          </button>
                        </p>
                      )}
                    </>
                  )}
                  {view === "results" && !editing ? (
                    <div className="mt-10">
                      {intention.people[0] ? (
                        <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
                          <PersonResult
                            person={intention.people[0]}
                            onDraft={() => compose(intention.people[0])}
                            expanded
                          />
                          {intention.people.length > 1 ? (
                            <button
                              className={cn(link, "mx-6 mb-6")}
                              onClick={() => setStep("people")}
                            >
                              See {intention.people.length - 1} more{" "}
                              {intention.people.length === 2
                                ? "person"
                                : "people"}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                      {searching ? (
                        <SearchProgress intention={intention} />
                      ) : intention.state === "failed" ? (
                        <div role="alert" className="mt-6">
                          <p className="text-[var(--danger)]">This search didn&apos;t finish. Nothing was lost.</p>
                          <div className="mt-2"><WaysFooter intention={intention} /></div>
                        </div>
                      ) : !intention.people.length ? (
                        <p className="text-muted-foreground">
                          No public people matched this time.
                        </p>
                      ) : null}
                      {intention.ways.length ? (
                        <div className="mt-6 grid gap-3">
                          <h2 className="text-sm font-semibold text-muted-foreground">
                            People & opportunities to explore
                          </h2>
                          {intention.ways.slice(0, 3).map((way) => (
                            <DiscoveryWay
                              key={way._id}
                              way={way}
                              onOpenBoard={openDashboard}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {found.length > 1 && !editing ? (
                    <div className="mt-10">
                      <button
                        className="min-h-8 text-sm text-muted-foreground hover:text-foreground"
                        onClick={() => setOthers(!others)}
                        aria-expanded={others}
                      >
                        {found.length - 1} other{" "}
                        {found.length === 2 ? "thing" : "things"} noticed
                        <ChevronDown className="ml-1 inline size-3.5" />
                      </button>
                      {others ? (
                        <div className="mt-3 grid gap-2">
                          {found
                            .filter(
                              ({ intention: i }) => i._id !== intention._id,
                            )
                            .map(({ intention: i }) => (
                              <button
                                key={i._id}
                                className="rounded-xl border border-[var(--line)] bg-white p-4 text-left"
                                onClick={() => select(i._id)}
                              >
                                {i.title}
                              </button>
                            ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </>
          ) : (
            <>
              <h1 className={heading}>Your memories are ready</h1>
              <Button className={cn(primary, "mt-8")} onClick={openDashboard}>
                Open board
              </Button>
            </>
          )}
          {draftPerson || view === "results" || view === "people" ? (
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[var(--line)] pt-6">
              <Button
                variant="outline"
                className={primary}
                onClick={openDashboard}
              >
                Continue on board
                <ArrowUpRight className="size-4" />
              </Button>
              <button
                className={cn(link, "text-sm")}
                onClick={() => {
                  setDraftPerson(null);
                  setStep("knowledge");
                }}
              >
                What your AI knows
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button
      aria-label="Back"
      className="mb-7 flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-[var(--soft)]"
      onClick={onClick}
    >
      <ArrowLeft className="size-5" />
    </button>
  );
}

function SearchProgress({ intention }: { intention: Intention }) {
  const current = intention.state === "planning" ? 0 : searchStep(intention.run?.stage);
  return (
    <div role="status" aria-live="polite" className="my-7 space-y-4 text-sm">
      {SEARCH_STEPS.map((label, index) => (
        <p
          key={label}
          className={cn(
            "flex items-center gap-3",
            index > current && "text-muted-foreground",
          )}
        >
          {index < current ? (
            <Check className="size-5" />
          ) : index === current ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <span className="size-5 rounded-full border border-[var(--line)]" />
          )}
          {label}
        </p>
      ))}
    </div>
  );
}

function PersonResult({
  person,
  onDraft,
  expanded = false,
}: {
  person: Person;
  onDraft: () => void;
  expanded?: boolean;
}) {
  const [open, setOpen] = useState(expanded);
  const name = person.author || "Public author";
  return (
    <article className="p-6 sm:p-8">
      <button
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full flex-wrap items-center gap-3 text-left"
      >
        <PersonAvatar name={name} src={publicHttpUrl(person.avatarUrl)} />
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold">{name}</span>
          <span className="text-sm text-muted-foreground">
            {person.platform}
          </span>
        </span>
        <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-xs text-muted-foreground">
          Availability unknown
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="mt-6 space-y-5 text-base leading-relaxed">
          <blockquote>
            {person.evidenceQuote || person.excerpt || person.title}
          </blockquote>
          {person.reason ? (
            <p className="text-muted-foreground">{person.reason}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-6">
            <Button className={primary} onClick={onDraft}>
              Draft an intro
            </Button>
            {publicHttpUrl(person.url) ? (
              <a
                className={cn(link, "text-sm")}
                href={person.url}
                target="_blank"
                rel="noreferrer"
              >
                View post
                <ArrowUpRight className="ml-1 inline size-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      ) : person.reason ? (
        <p className="mt-3 text-sm text-muted-foreground">{person.reason}</p>
      ) : null}
    </article>
  );
}

function DiscoveryWay({
  way,
  onOpenBoard,
}: {
  way: Way;
  onOpenBoard: () => void;
}) {
  const Icon = way.member ? UserRound : Compass;
  const sourceUrl = publicHttpUrl(way.source?.url);

  return (
    <details className="group overflow-hidden rounded-2xl border border-[var(--line)] bg-white open:border-[var(--relay-purple-strong)]">
      <summary className="flex cursor-pointer list-none items-start gap-4 p-5 transition-colors hover:bg-[var(--soft)] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[var(--relay-purple-strong)] [&::-webkit-details-marker]:hidden">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--soft)] text-[var(--relay-purple-strong)]">
          <Icon aria-hidden className="size-5" />
        </span>
        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
          <span className="block text-xs font-medium text-muted-foreground">
            {way.member ? "Person · Sample member" : "Opportunity · Public page"}
          </span>
          <span className="mt-1 block font-semibold">
            {way.member?.name ?? way.title}
          </span>
          {way.member ? (
            <span className="mt-1 block text-sm">{way.title}</span>
          ) : null}
          <span className="mt-2 block text-sm text-muted-foreground">
            {way.why}
          </span>
          <span className={cn(link, "mt-3 inline-flex items-center gap-1 text-sm font-medium")}>
            <span className="group-open:hidden">See details & next step</span>
            <span className="hidden group-open:inline">Hide details</span>
            <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
          </span>
        </span>
      </summary>
      <div className="mx-5 space-y-4 border-t border-[var(--line)] py-5 text-sm leading-relaxed [overflow-wrap:anywhere]">
        <p>{way.summary}</p>
        {way.member ? (
          <div className="space-y-2 text-muted-foreground">
            <p>{way.member.about}</p>
            <p><span className="font-semibold">Looking for: </span>{way.member.wants}</p>
          </div>
        ) : null}
        <div>
          <h3 className="font-semibold">Suggested next step</h3>
          <p className="mt-1">{way.nextStep}</p>
        </div>
        {way.questions.length ? (
          <p className="text-muted-foreground">Still to check: {way.questions.join(" ")}</p>
        ) : null}
        {way.member ? (
          <Button className="rounded-xl" onClick={onOpenBoard}>
            Meet {way.member.name.split(" ")[0]} on the board
            <ArrowUpRight aria-hidden className="size-4" />
          </Button>
        ) : sourceUrl ? (
          <a className={cn(link, "inline-flex items-center gap-1 font-medium")} href={sourceUrl} target="_blank" rel="noreferrer">
            Visit {way.source?.host || "source"}
            <ArrowUpRight aria-hidden className="size-4" />
          </a>
        ) : (
          <Button className="rounded-xl" onClick={onOpenBoard}>
            View on board
            <ArrowUpRight aria-hidden className="size-4" />
          </Button>
        )}
      </div>
    </details>
  );
}

function SearchPreference({
  intention,
  source,
  sample,
}: {
  intention: Intention;
  source: string | null;
  sample: boolean;
}) {
  const sessionId = useSessionId();
  const status = useMutation(api.intentions.setIntentionStatus);
  const again = useMutation(api.intentions.searchAgain);
  const [busy, setBusy] = useState(false);
  const enabled =
    intention.status !== "withdrawn" && intention.status !== "hidden";
  return (
    <div className="flex items-center justify-between gap-5 p-6">
      <div>
        <p className="font-semibold">{intention.title}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          {sample ? "Sample · " : ""}
          {source && !hasAgentMark(source) ? `From ${source}` : "From your conversation"}
          <AgentMark source={source} />
        </p>
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        aria-label={`Use ${intention.title} for future searches`}
        disabled={busy || !sessionId}
        className="flex shrink-0 items-center gap-3 disabled:opacity-50"
        onClick={async () => {
          if (!sessionId) return;
          setBusy(true);
          try {
            if (enabled)
              await status({
                sessionId,
                intentionId: intention._id,
                status: "withdrawn",
              });
            else await again({ sessionId, intentionId: intention._id });
          } catch (e) {
            toast.error(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <span className="hidden text-sm text-muted-foreground sm:inline">
          Use for search
        </span>
        <span
          className={cn(
            "flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
            enabled ? "bg-[var(--ink)]" : "bg-gray-300",
          )}
        >
          <span
            className={cn(
              "size-4 rounded-full bg-white transition-transform",
              enabled && "translate-x-4",
            )}
          />
        </span>
      </button>
    </div>
  );
}
