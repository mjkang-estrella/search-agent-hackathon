"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, Check, ChevronDown, Copy, Globe, Loader2, Plus, Search, Send, Sparkles, Star, X } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSessionId, useStartOver } from "@/components/providers";
import { Account, SignInButton } from "@/components/account";
import { RelayLogo } from "@/components/relay-logo";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { AddMemoryFlow, WaysFooter } from "@/components/add-memory-flow";
import { PersonAvatar } from "@/components/person-avatar";
import { AgentMark, hasAgentMark } from "@/components/agent-mark";
import { PublicPersonCard } from "@/components/public-person-card";
import { SourceMark } from "@/components/stamps";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { errorText } from "@/lib/format";
import { SEARCH_STEPS, searchStep } from "@/lib/search-steps";

type Board = NonNullable<FunctionReturnType<typeof api.board.get>>;
type Overview = NonNullable<FunctionReturnType<typeof api.board.overview>>;
type Memory = Board["memories"][number];
type Intention = Memory["intentions"][number];
type Way = Intention["ways"][number];

const isSearching = (i: Intention) => i.state === "planning" || i.state === "searching";

export default function Page() {
  return <Suspense><Home /></Suspense>;
}

function Home() {
  const sessionId = useSessionId();
  if (!sessionId) return <div role="status" aria-label="Loading" className="flex justify-center pt-24"><Loader2 className="size-6 animate-spin" /></div>;
  return <BoardHome key={sessionId} sessionId={sessionId} />;
}

function BoardHome({ sessionId }: { sessionId: Id<"demoSessions"> }) {
  // Null means the board isn't open to this account yet, as during sign-in or sign-out. Show it as loading.
  const params = useSearchParams();
  const overview = useQuery(api.board.overview, { sessionId }) ?? undefined;
  const [memoryId, setMemoryId] = useState<string | null>(() => params.get("m"));
  const [intentionId, setIntentionId] = useState<string | null>(() => params.get("i"));
  const [adding, setAdding] = useState(false);
  // The sample member whose message preview is open. Set from the idea bar or from the card itself.
  const [composeWay, setComposeWay] = useState<string | null>(null);
  const preferenceKey = `relay.dashboard:${process.env.NEXT_PUBLIC_CONVEX_URL}:${sessionId}`;
  const [view, setView] = useState<"auto" | "guided" | "dashboard">(() => {
    try { return localStorage.getItem(preferenceKey) === "dashboard" ? "dashboard" : "auto"; }
    catch { return "auto"; }
  });
  const [handoff, setHandoff] = useState(false);
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(search.trim()), 200);
    return () => clearTimeout(timer);
  }, [search]);
  const { results: memories, status, loadMore } = usePaginatedQuery(
    api.board.listMemories, sessionId ? { sessionId, search: searchTerm } : "skip", { initialNumItems: 25 },
  );
  const selectedId = memoryId ?? memories[0]?._id;
  const detail = useQuery(api.board.get, sessionId && selectedId ? { sessionId, memoryId: selectedId } : "skip");
  // Show the last copy of a memory while its live query reconnects, so switching back is instant.
  const [seen, setSeen] = useState<Record<string, Memory>>({});
  const live = detail?.memories[0];
  if (live && seen[live._id] !== live) setSeen({ ...seen, [live._id]: live });
  const memory = live ?? (detail === undefined && selectedId ? seen[selectedId] : undefined);
  const missing = detail !== undefined && !live;
  const intention = memory?.intentions.find((i) => i._id === intentionId) ?? memory?.intentions[0];
  const empty = status === "Exhausted" && memories.length === 0 && !searchTerm;
  const onboarding = view === "guided" || (view === "auto" && empty);
  const board = useQuery(api.board.get, onboarding ? { sessionId } : "skip") ?? undefined;
  const intentions = overview?.intentions ?? [];
  const memoryList = useRef<HTMLDivElement>(null);
  const waysColumn = useRef<HTMLElement>(null);
  const progress = { done: intentions.filter((i) => i.state === "ready").length, failed: intentions.filter((i) => i.state === "failed").length, total: intentions.length };

  // A memory from an old link may be gone. Fall back to the first one.
  if (missing && memoryId) setMemoryId(null);

  const shownMemoryId = memory?._id;
  const shownIntentionId = intention?._id;
  useEffect(() => {
    if (!shownMemoryId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("m", shownMemoryId);
    if (shownIntentionId) url.searchParams.set("i", shownIntentionId);
    else url.searchParams.delete("i");
    window.history.replaceState(window.history.state, "", url);
  }, [shownMemoryId, shownIntentionId]);

  // Keep the selected memory in view inside its own scroller: a row on phones, a list on desktop.
  const selectedMemoryId = memory?._id;
  useEffect(() => {
    const list = memoryList.current;
    const tile = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!list || !tile) return;
    const reveal = () => list.scrollTo({
      left: tile.offsetLeft - (list.clientWidth - tile.clientWidth) / 2,
      top: tile.offsetTop - (list.clientHeight - tile.clientHeight) / 2,
      behavior: "instant",
    });
    reveal();
    const observer = new ResizeObserver(reveal);
    observer.observe(list);
    return () => observer.disconnect();
  }, [selectedMemoryId]);

  /** Opens the memory and intention behind an idea. On a phone the columns stack, so bring the ways into view. */
  function openIdea(m: string, i: string, way?: string) {
    setMemoryId(m);
    setIntentionId(i);
    setComposeWay(way ?? null);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => waysColumn.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
    }
  }

  function openDashboard(selection?: { memoryId: string; intentionId: string }) {
    setView("dashboard");
    setHandoff(true);
    setSearch("");
    setSearchTerm("");
    try { localStorage.setItem(preferenceKey, "dashboard"); } catch {}
    if (selection) openIdea(selection.memoryId, selection.intentionId);
  }

  return (
    <div className={cn("min-h-screen", onboarding ? "bg-white" : "bg-[var(--ground)]")}>
      <header className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-5 pt-6 pb-2">
        <Link href="/" aria-label="Relay home" className="shrink-0 rounded-sm">
          <RelayLogo />
        </Link>
        <span className="flex min-w-0 items-center gap-2">
          {status !== "LoadingFirstPage" ? <>
            {!onboarding ? <button className="hidden min-h-9 px-2 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground sm:block" onClick={() => setView("guided")}>Guided discovery</button> : null}
            <ConnectButton onGuided={onboarding ? undefined : () => setView("guided")} />
          </> : null}
          <Account />
        </span>
      </header>

      <main className="mx-auto max-w-[1280px] px-5 pb-12">
        {status === "LoadingFirstPage" && !searchTerm ? (
          <div role="status" aria-label="Loading" className="flex justify-center pt-24">
            <Loader2 className="size-6 animate-spin text-[var(--relay-purple-strong)]" />
          </div>
        ) : onboarding ? (
          <OnboardingFlow key={sessionId} board={board} initialIntentionId={intention?._id} onBegin={() => setView("guided")} onDone={openDashboard} connection={<McpDetails />} />
        ) : (
          <>
            {empty ? (
              <section className="mt-8 rounded-3xl bg-white p-6 sm:p-8">
                <h1 className="text-2xl font-bold">Your board</h1>
                <p className="mt-2 text-muted-foreground">Add a memory to find people and ways forward.</p>
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <Button className="h-11 rounded-full px-5 font-bold" onClick={() => setAdding(true)}><Plus className="size-4" />Add a memory</Button>
                  <button className="min-h-11 text-sm font-semibold text-[var(--relay-purple-strong)] hover:underline" onClick={() => setView("guided")}>Try guided discovery</button>
                </div>
              </section>
            ) : <>
              {handoff && intention ? <div role="status" className="mt-6 rounded-2xl bg-[var(--relay-lavender)] px-5 py-4">
                <p className="font-semibold">{intention.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{isSearching(intention) ? "Search is continuing. Results appear here." : "Your memory, intention, and matches are together below."}</p>
              </div> : null}
              {overview ? <Proposal overview={overview} progress={progress} onOpen={openIdea} /> : <Quiet><Spinner label="Loading ideas" /></Quiet>}
            </>}
            <AddMemoryFlow
              open={adding}
              intentions={intentions}
              onClose={() => setAdding(false)}
              onDone={(m, i) => {
                setAdding(false);
                openIdea(m, i);
              }}
            />

            <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1fr_1fr_1.5fr]">
              <Column
                title="Your memories"
                action={
                  <span className="flex items-center gap-2">
                    <Aside>{memories.length}{status !== "Exhausted" ? "+" : ""}</Aside>
                    <button
                      onClick={() => setAdding(true)}
                      aria-label="Add a memory"
                      className="flex size-8 items-center justify-center rounded-full bg-[var(--relay-purple)] text-[var(--ink)] transition hover:scale-105"
                    >
                      <Plus className="size-4" />
                    </button>
                  </span>
                }
                className="lg:sticky lg:top-4"
              >
                <div className="relative mb-2">
                  <Search aria-hidden className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
                  <Input
                    type="search"
                    aria-label="Search memories"
                    placeholder="Search memories"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setMemoryId(null); setIntentionId(null); }}
                    className="h-10 rounded-xl bg-white pl-9"
                  />
                </div>
                <div
                  ref={memoryList}
                  className="no-scrollbar relative -mx-5 -mt-1 flex snap-x scroll-px-5 gap-2 overflow-x-auto px-5 pt-1 pb-3 lg:-mx-2 lg:max-h-[calc(100dvh-5.5rem)] lg:flex-col lg:overflow-y-auto lg:px-2"
                >
                  {memories.map((m) => (
                    <Tile
                      key={m._id}
                      compact
                      className="w-[232px] shrink-0 snap-start lg:w-full"
                      selected={m._id === selectedId}
                      onClick={() => (setMemoryId(m._id), setIntentionId(null))}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{m.title}</span>
                        <span className={cn("block truncate text-[12.5px] font-medium", m._id === selectedId ? "text-[var(--relay-purple-strong)]" : "text-muted-foreground")}>
                          <AgentMark source={m.source} className="mr-1.5" />
                          {hasAgentMark(m.source) ? (m.category ?? "Memory") : `from ${m.source ?? "you"}${m.category ? ` · ${m.category}` : ""}`}
                        </span>
                      </span>
                      {m.sample ? <span className="text-[12px] opacity-70">Sample</span> : null}
                    </Tile>
                  ))}
                  {status === "LoadingFirstPage" || search.trim() !== searchTerm ? <Spinner label="Searching memories" /> : null}
                  {status === "Exhausted" && memories.length === 0 ? <Quiet>{empty ? "Your memories will appear here." : "No memories match."}</Quiet> : null}
                  {status === "CanLoadMore" || status === "LoadingMore" ? (
                    <Button variant="outline" className="shrink-0 rounded-full" disabled={status === "LoadingMore"} onClick={() => loadMore(25)}>
                      {status === "LoadingMore" ? "Loading…" : "Load more"}
                    </Button>
                  ) : null}
                </div>
              </Column>

              <Column title="What you want" className="lg:sticky lg:top-4">
                {selectedId && !memory ? <Spinner label="Loading memory" /> : null}
                {memory ? <MemoryQuote key={memory._id} memory={memory} /> : null}
                {memory?.intentions.map((i) => (
                  <Tile key={i._id} selected={i._id === intention?._id} onClick={() => openIdea(memory!._id, i._id)}>
                    <span className="min-w-0 flex-1">
                      <span className="block">{i.title}</span>
                      <span className={cn("flex items-center gap-1 text-[12.5px] font-medium", i._id === intention?._id ? "text-[var(--relay-purple-strong)]" : "text-muted-foreground")}>
                        {i.inferred ? <Sparkles className="size-3" /> : null}
                        {i.inferred ? "Spotted by your agent" : i.kind === "offer" ? "You could help" : "You need"}
                      </span>
                    </span>
                    {i.state === "ready" ? (
                      <Count n={i.ways.length + i.people.length} />
                    ) : i.state === "failed" ? (
                      <X aria-label="Failed" className="size-4 text-[var(--danger)]" />
                    ) : (
                      <Spinner label="Searching" />
                    )}
                  </Tile>
                ))}
                {empty ? <Quiet>We find intentions in your memories.</Quiet> : null}
                {memory && memory.intentions.length === 0 ? <Quiet>Nothing to act on here.</Quiet> : null}
              </Column>

              <Column title="People & opportunities" ref={waysColumn} className="scroll-mt-4">
                {!intention ? empty ? <Quiet>People and opportunities will appear here.</Quiet> : null : intention.state === "failed" ? (
                  <>
                    <Quiet>This search didn&apos;t finish. Nothing was lost.</Quiet>
                    <WaysFooter intention={intention} />
                  </>
                ) : (
                  <Ways intention={intention} composeWay={composeWay} onCompose={setComposeWay} />
                )}
              </Column>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/** Everything found for one intention. Public posts can arrive before the search finishes, so they show early. */
function Ways({ intention, composeWay, onCompose }: { intention: Intention; composeWay: string | null; onCompose: (way: string | null) => void }) {
  const searching = isSearching(intention);
  const members = intention.ways.filter((w) => w.member);
  const places = intention.ways.filter((w) => !w.member);
  return (
    <>
      {searching ? <Searching stage={intention.run?.stage} /> : null}
      {members.map((w) => (
        <WayCard key={w._id} way={w} composing={composeWay === w._id} onCompose={(on) => onCompose(on ? w._id : null)} />
      ))}
      {intention.people.length || !searching ? <PeopleList people={intention.people} offer={intention.kind === "offer"} aim={intention.aim} /> : null}
      {!searching ? <ShowMore key={`${intention._id}:people`} intention={intention} target="people" /> : null}
      {places.length > 0 || !searching ? <h3 className="px-1 pt-3 text-[15px] font-bold text-muted-foreground">Places to try</h3> : null}
      {places.map((w) => (
        <WayCard key={w._id} way={w} />
      ))}
      {!searching ? <ShowMore key={`${intention._id}:places`} intention={intention} target="places" /> : null}
      {!searching ? <WaysFooter intention={intention} /> : null}
    </>
  );
}

function ShowMore({ intention, target }: { intention: Intention; target: "people" | "places" }) {
  const sessionId = useSessionId();
  const findMore = useMutation(api.discovery.findMore);
  const [submitting, setSubmitting] = useState(false);
  const run = intention.run;
  const more = run?.more;
  const busy = more?.status === "running";
  const active = more?.target === target;
  return (
    <div className="px-1 pb-2">
      <Button
        variant="outline"
        className="h-10 rounded-full px-4"
        disabled={!sessionId || !run || submitting || busy}
        aria-label={`Show more ${target}`}
        onClick={async () => {
          if (!sessionId || !run) return;
          setSubmitting(true);
          try {
            await findMore({ sessionId, runId: run._id, target });
          } catch (e) {
            toast.error(errorText(e));
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {submitting || (busy && active) ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <Plus aria-hidden className="size-3.5" />}
        {submitting || (busy && active) ? "Searching…" : "Show more"}
      </Button>
      <p role="status" className="mt-1 text-[12.5px] text-muted-foreground">
        {active && more.status === "failed" ? "Search failed. Try again."
          : active && more.status === "succeeded" && more.added === 0 ? "No new matches this time. Try again."
          : active && more.status === "succeeded" ? `${more.added} new ${target === "people" ? "posts" : "places"} found` : null}
      </p>
    </div>
  );
}

/** What the agent saved, so an intention reads next to the words it came from. Tap to read all of it. */
function MemoryQuote({ memory }: { memory: Memory }) {
  const [open, setOpen] = useState(false);
  // Agent notes often open with a heading line such as "From a chat on Saturday:". The preview starts at the first note.
  const lines = memory.text.split("\n").map((l) => l.trim()).filter(Boolean);
  const notes = lines.length > 1 && lines[0].endsWith(":") ? lines.slice(1) : lines;
  const preview = notes.map((l) => l.replace(/^[-*•]\s*/, "")).join(" ");
  return (
    <button
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      className="rounded-2xl bg-[var(--relay-lavender)] px-4 py-3 text-left text-[13.5px] leading-relaxed text-[var(--ink-muted)]"
    >
      <span className="flex items-center gap-1.5 font-bold text-foreground">
        {hasAgentMark(memory.source) ? "Saved" : `${memory.source ?? "You"} saved`}
        <AgentMark source={memory.source} />
      </span>
      {open ? <span className="mt-1 block whitespace-pre-line">{memory.text}</span> : <span className="line-clamp-2">&ldquo;{preview}&rdquo;</span>}
    </button>
  );
}

function McpDetails() {
  const conn = useConnection();
  const enable = useMutation(api.sessions.enableMcp);
  const replace = useMutation(api.sessions.replaceMcpLink);
  const signedIn = conn?.signedIn === true;
  const url = conn?.mcpUrl ?? null;
  useEffect(() => {
    if (signedIn && !url) void enable({}).catch((e) => toast.error(errorText(e)));
  }, [signedIn, url, enable]);
  if (conn === undefined) return <Loader2 className="mt-4 size-4 animate-spin" />;
  if (!signedIn) {
    return (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="min-w-0 flex-1 basis-48 text-[14px] text-muted-foreground">Sign in to get a private link. Your AI uses it to save memories here.</span>
        <SignInButton label="Sign in with Google" className="h-10" />
      </div>
    );
  }
  if (!url) return <Loader2 className="mt-4 size-4 animate-spin" />;
  return (
    <div className="mt-3 grid gap-2">
      <span className="text-[13px] font-semibold text-muted-foreground">Add this link to your AI as an MCP server</span>
      <div className="flex items-center gap-2">
        <code className="block min-w-0 flex-1 break-all select-all rounded-xl bg-[var(--soft)] px-3 py-2.5 text-[13px]">{url}</code>
        <Button
          className="h-10 rounded-full px-4 font-bold"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              toast.success("Copied");
            } catch {
              toast.error("Could not copy. Select the link to copy it.");
            }
          }}
        >
          <Copy className="size-4" /> Copy
        </Button>
      </div>
      <span className="text-[13px] text-muted-foreground">
        Memories your AI saves show up here on their own. Keep the link private.{" "}
        <button
          className="min-h-6 font-semibold text-foreground underline underline-offset-2"
          onClick={() =>
            void replace({})
              .then(() => toast.success("New link ready. Update it in your AI."))
              .catch((e) => toast.error(errorText(e)))
          }
        >
          New link
        </button>
      </span>
    </div>
  );
}

/** The header control for linking an AI. The dot shows only once something feeds this board. */
function ConnectButton({ onGuided }: { onGuided?: () => void }) {
  const conn = useConnection();
  const startOver = useStartOver();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const linked = Boolean(conn?.persona || conn?.mcpUrl);
  return (
    <div ref={root} className="relative min-w-0">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={conn?.persona ? `${conn.persona}, demo persona` : linked ? "Your AI is connected" : "Connect your AI"}
        className="flex h-9 max-w-full items-center gap-2 rounded-full bg-white px-3.5 text-[13px] font-bold whitespace-nowrap shadow-sm sm:px-4"
      >
        {linked ? <span aria-hidden className="size-2 shrink-0 rounded-full bg-[#2f9e6a]" /> : null}
        {conn?.persona ? <span className="truncate">{conn.persona} (demo)</span> : linked ? "AI connected" : <>Connect<span className="hidden sm:inline">&nbsp;your AI</span></>}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[min(420px,calc(100vw-40px))] rounded-2xl bg-white p-4 shadow-lg">
          <span className="block text-[15px] font-bold">{conn?.persona ? `${conn.persona}'s sample memories` : "Connect your AI"}</span>
          <McpDetails />
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3">
            {onGuided ? (
              <Button variant="outline" className="h-9 rounded-full px-4 font-bold sm:hidden" onClick={() => { setOpen(false); onGuided(); }}>
                Guided discovery
              </Button>
            ) : null}
            <Button variant="outline" className="ml-auto h-9 rounded-full px-4 font-bold" onClick={() => void startOver().catch((e) => toast.error(errorText(e)))}>
              Start a new board
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function useConnection() {
  const sessionId = useSessionId();
  return useQuery(api.sessions.getConnection, sessionId ? { sessionId } : "skip");
}

type Progress = { done: number; failed: number; total: number };

function Proposal({ overview, progress, onOpen }: { overview: Overview; progress: Progress; onOpen: (m: string, i: string, way?: string) => void }) {
  const [index, setIndex] = useState(0);
  const proposals = overview.proposals;
  const p = proposals.length ? proposals[index % proposals.length] : undefined;
  const searching = progress.done + progress.failed < progress.total;
  if (!p) {
    return (
      <div className="rounded-3xl bg-[var(--relay-peach-soft)] p-6 text-[var(--ink)]">
        <div className="flex items-center gap-3 text-[17px] font-semibold">
          {searching ? <Loader2 aria-hidden className="size-5 animate-spin" /> : <Check aria-hidden className="size-5" />}
          {searching ? "Finding something for you…" : "No new ideas right now"}
        </div>
        <SearchProgress progress={progress} />
      </div>
    );
  }
  const w = p.way;
  const memory = p.memoryTitle ? { title: p.memoryTitle } : null;
  const open = () => onOpen(p.memoryId, p.intentionId);
  return (
    <div className="rounded-3xl bg-[var(--relay-peach-soft)] p-6 text-[var(--ink)]">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-bold text-[var(--relay-purple-strong)]">
        <Sparkles aria-hidden className="size-4" /> Idea for you
        {memory ? (
          <button onClick={open} className="min-h-6 min-w-0 truncate rounded-full bg-white/50 px-2.5 py-0.5 font-semibold text-[var(--ink)] hover:bg-white/70">
            from &ldquo;{memory.title}&rdquo;
          </button>
        ) : null}
      </div>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <button className="flex min-w-0 flex-1 items-center gap-4 text-left" onClick={open}>
          <Avatar way={w} large />
          <span className="min-w-0">
            <span className="block text-[20px] leading-tight font-bold tracking-[-0.015em] text-balance sm:text-[22px]">{w.title}</span>
            <span className="mt-1 block text-[15px] text-[var(--relay-purple-strong)]">{w.why}</span>
            <span className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--relay-purple-strong)]">
              {w.member ? <>{w.member.name}<SourceMark kind="sample" className="bg-white" /></> : w.source ? <SourceMark kind="public">{w.source.host}</SourceMark> : null}
            </span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          {w.member ? (
            <Button className="h-10 shrink-0 rounded-full bg-white px-4 text-[14px] font-bold text-[var(--relay-purple-strong)] hover:bg-white/90" onClick={() => onOpen(p.memoryId, p.intentionId, w._id)}>
              Say hi
            </Button>
          ) : <OpenSource way={w} light />}
          {proposals.length > 1 ? (
            <Button variant="ghost" className="h-10 rounded-full px-4 text-[var(--ink)] hover:bg-white/40 hover:text-[var(--ink)]" onClick={() => setIndex(index + 1)}>
              Another
            </Button>
          ) : null}
        </div>
      </div>
      <SearchProgress progress={progress} />
    </div>
  );
}

/** One bar for every search in flight. It leaves once all of them finish. */
function SearchProgress({ progress: { done, failed, total } }: { progress: Progress }) {
  if (total === 0 || done + failed >= total) return null;
  return (
    <div role="status" className="mt-5 flex items-center gap-3 text-[13px] font-semibold text-[var(--relay-purple-strong)]">
      <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
        <span className="block h-full rounded-full bg-[var(--relay-purple-strong)] transition-[width] duration-700" style={{ width: `${Math.max(3, ((done + failed) / total) * 100)}%` }} />
      </span>
      {done + failed} of {total} finished{failed ? ` · ${failed} failed` : ""}
    </div>
  );
}

function Column({ title, action, className, ref, children }: { title: string; action?: React.ReactNode; className?: string; ref?: React.Ref<HTMLElement>; children: React.ReactNode }) {
  return (
    <section ref={ref} className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex h-9 items-center justify-between px-1">
        <h2 className="text-[15px] font-bold text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Aside({ children }: { children: React.ReactNode }) {
  return <span className="text-[13px] font-semibold text-muted-foreground">{children}</span>;
}

function Tile({ selected, compact, className, onClick, children }: { selected: boolean; compact?: boolean; className?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-4 text-left font-semibold transition",
        compact ? "py-2.5 text-[15px]" : "py-3.5 text-[16px]",
        selected ? "bg-[var(--relay-purple)] text-[var(--ink)] shadow-md" : "bg-white text-foreground shadow-sm hover:shadow-md",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Count({ n }: { n: number }) {
  return <span aria-label={`${n} found`} className="flex size-7 shrink-0 items-center justify-center rounded-full bg-black/[0.07] text-[13px] font-bold">{n}</span>;
}

/** Sits where a count will go, so it takes the same space. Inherits the tile's text color. */
function Spinner({ label }: { label: string }) {
  return (
    <span role="img" aria-label={label} className="flex size-7 shrink-0 items-center justify-center">
      <Loader2 className="size-4 animate-spin opacity-70" />
    </span>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-white px-4 py-6 text-center text-[15px] text-muted-foreground shadow-sm">{children}</p>;
}

/** The run's stage, folded into three steps a person can follow. */
function Searching({ stage }: { stage?: string }) {
  const current = searchStep(stage);
  return (
    <div role="status" className="rounded-2xl bg-white p-4 shadow-sm">
      <ol className="grid gap-2.5">
        {SEARCH_STEPS.map((step, i) => (
          <li key={step} className={cn("flex items-center gap-3 text-[15px] font-semibold", i > current && "text-muted-foreground")}>
            <span className="flex size-5 shrink-0 items-center justify-center">
              {i < current ? (
                <Check className="size-4 text-[#1f6b47]" />
              ) : i === current ? (
                <Loader2 className="size-4 animate-spin text-[var(--relay-purple-strong)]" />
              ) : (
                <span className="size-1.5 rounded-full bg-[var(--line)]" />
              )}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[13px] text-muted-foreground">Results appear as we find them</p>
    </div>
  );
}

type Person = Intention["people"][number];

function PeopleList({ people, offer, aim }: { people: Person[]; offer: boolean; aim: string }) {
  return (
    <>
      <h3 className="flex items-baseline justify-between gap-3 px-1 pt-3">
        <span className="text-[15px] font-bold text-muted-foreground">{offer ? "People who may need this" : "Related people"}</span>

      </h3>
      {people.map((p) => <PublicPersonCard key={p._id} person={p} aim={aim} />)}
    </>
  );
}

function Avatar({ way: w, large }: { way: Way; large?: boolean }) {
  if (w.member) return <PersonAvatar src={w.member.avatarUrl} name={w.member.name} sample large={large} />;
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-[var(--relay-lavender)] text-[var(--relay-purple-strong)]", large ? "size-14" : "size-11")}>
      <Globe aria-hidden className={large ? "size-6" : "size-5"} />
    </span>
  );
}

function WayCard({ way: w, composing = false, onCompose }: { way: Way; composing?: boolean; onCompose?: (on: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const card = useRef<HTMLElement>(null);
  // "Say hi" in the idea bar opens the preview here, so bring this card into view.
  useEffect(() => {
    if (composing) card.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [composing]);
  const first = w.member?.name.split(" ")[0];
  const state = w.intro?.state;
  const waiting = w.member && w.intro && state !== "accepted" && state !== "declined";
  return (
    <article ref={card} className="min-w-0 scroll-mt-4 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3.5">
        <Avatar way={w} />
        <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-[16px] leading-snug font-bold">{w.member?.name ?? w.title}</h3>
            {w.fit === "strong_fit" ? <Star aria-label="Great fit" className="size-4 fill-[var(--relay-peach)] text-[var(--relay-peach-ink)]" /> : null}
          </div>
          <p className="mt-1 text-[13.5px] leading-snug text-muted-foreground">{w.member?.about ?? w.source?.host}</p>
          <p className="mt-2 flex flex-wrap gap-1.5">
            {w.member ? <SourceMark kind="sample">Sample member · AI photo</SourceMark> : w.source ? <SourceMark kind="public" /> : null}
          </p>
        </div>
      </div>
      <div className="mt-3 text-[14px] leading-relaxed [overflow-wrap:anywhere]">
        <p className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-muted-foreground">Why this fits <SourceMark kind="inferred" /></p>
        <p className="mt-1">{w.why}</p>
        {w.member ? (
          <p className="mt-2 text-[13px] text-muted-foreground"><span className="font-semibold">Looking for </span>{w.member.wants}</p>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button className="inline-flex min-h-8 items-center gap-1 text-[13px] font-semibold text-muted-foreground hover:text-foreground" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Less" : "Details"}<ChevronDown aria-hidden className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </button>
        {!w.member ? <OpenSource way={w} /> : !w.intro && !composing ? (
          <Button className="h-10 shrink-0 rounded-full px-4 text-[14px] font-bold" onClick={() => onCompose?.(true)}>Say hi</Button>
        ) : waiting ? (
          <span role="status" className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
            {state === "pending_acceptance" ? `${first} is replying` : `Sent to ${first}`}
            <span className="font-medium">· simulated</span>
          </span>
        ) : state === "declined" ? <span className="shrink-0 text-[13px] font-semibold text-muted-foreground">Not now · simulated</span> : null}
      </div>
      {w.member && !w.intro && composing ? <IntroPreview way={w} onClose={() => onCompose?.(false)} /> : null}
      {w.member && state === "accepted" ? <Connected name={first!} contact={w.intro!.contact} note={w.intro!.note} /> : null}
      {open ? (
        <div className="mt-3 grid gap-2 border-t border-[var(--line)] pt-3 text-[13px] leading-relaxed [overflow-wrap:anywhere]">
          <p>{w.summary}</p>
          {w.source?.quote ? <blockquote className="text-muted-foreground">&ldquo;{w.source.quote}&rdquo;</blockquote> : null}
          {w.questions.length ? <p className="text-muted-foreground">Still to check: {w.questions.join(" ")}</p> : null}
        </div>
      ) : null}
    </article>
  );
}

/** The message a sample member would get, shown before anything is sent. */
function IntroPreview({ way: w, onClose }: { way: Way; onClose: () => void }) {
  const sessionId = useSessionId();
  const optionId = w._id as Id<"options">;
  const message = useQuery(api.introductions.previewIntroduction, sessionId ? { sessionId, optionId } : "skip");
  const introduce = useMutation(api.introductions.quickIntroduce);
  const [busy, setBusy] = useState(false);
  const first = w.member!.name.split(" ")[0];
  return (
    <div className="reveal mt-3 border-t border-[var(--line)] pt-3">
      <p className="text-[12px] font-bold text-muted-foreground">Your message to {first}</p>
      <p className="mt-1.5 min-h-[4.5rem] rounded-xl bg-[var(--soft)] px-3.5 py-3 text-[14px] leading-relaxed [overflow-wrap:anywhere]">
        {message ?? <Loader2 role="img" aria-label="Writing your message" className="size-4 animate-spin text-muted-foreground" />}
      </p>
      <p className="mt-2 text-[12.5px] text-muted-foreground">{first} is a sample member, so the reply is simulated.</p>
      <div className="mt-3 flex items-center gap-2">
        <Button
          className="h-10 rounded-full px-4 text-[14px] font-bold"
          disabled={busy || !sessionId || !message}
          onClick={async () => {
            setBusy(true);
            try {
              await introduce({ sessionId: sessionId!, optionId });
            } catch (e) {
              toast.error(errorText(e));
              setBusy(false);
            }
          }}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send
        </Button>
        <Button variant="ghost" className="h-10 rounded-full px-4 text-[14px] font-semibold text-muted-foreground" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** The end of the story: the sample member said yes, and their contact is on the card. */
function Connected({ name, contact, note }: { name: string; contact: string | null; note: string | null }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="reveal mt-3 rounded-2xl bg-[#e3f1ea] p-4 text-[#17523a]">
      <p className="flex items-center gap-2.5 text-[16px] font-bold">
        <span className="stamp-in flex size-7 shrink-0 items-center justify-center rounded-full bg-[#1f6b47] text-white" style={{ ["--stamp-rot" as string]: "0deg" }}>
          <Check aria-hidden className="size-4" strokeWidth={3} />
        </span>
        Connected with {name}
      </p>
      {note ? <p className="mt-2 text-[13.5px] leading-relaxed [overflow-wrap:anywhere]">{note}</p> : null}
      {contact ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-white px-3.5 py-2.5">
          <span className="min-w-0 flex-1 basis-40">
            <span className="block text-[15px] font-bold break-all text-[var(--ink)] select-all">{contact}</span>
            <span className="block text-[12px] font-semibold text-[var(--ink-muted)]">Sample contact · simulated reply</span>
          </span>
          <Button
            variant="outline"
            className="h-9 rounded-full px-3.5 text-[13px] font-bold"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(contact);
                setCopied(true);
              } catch {
                toast.error("Could not copy. Select the contact to copy it.");
              }
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Opens the public page behind a way forward. */
function OpenSource({ way: w, light }: { way: Way; light?: boolean }) {
  if (!w.source) return null;
  return (
    <a
      href={w.source.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1 rounded-full px-4 text-[14px] font-bold transition",
        light ? "bg-white text-[var(--relay-purple-strong)] hover:bg-white/90" : "bg-[var(--relay-lavender)] text-[var(--relay-purple-strong)] hover:bg-[#e1d5fb]",
      )}
    >
      Open <ArrowUpRight aria-hidden className="size-4" />
    </a>
  );
}
