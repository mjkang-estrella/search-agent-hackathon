"use client";

import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Copy, Globe, Loader2, Plus, Search, Sparkles, X } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSessionId, useStartOver } from "@/components/providers";
import { Account, SignInButton } from "@/components/account";
import { AddMemoryFlow, WaysFooter, intentionLabel } from "@/components/add-memory-flow";
import { PersonAvatar } from "@/components/person-avatar";
import { PublicPersonCard } from "@/components/public-person-card";
import { SiteHeader } from "@/components/shell";
import { SampleTag } from "@/components/stamps";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AgentMark, hasAgentMark } from "@/components/agent-mark";
import { cn } from "@/lib/utils";
import { errorText } from "@/lib/format";

type Board = NonNullable<FunctionReturnType<typeof api.board.get>>;
type Overview = NonNullable<FunctionReturnType<typeof api.board.overview>>;
type Memory = Board["memories"][number];
type Intention = Memory["intentions"][number];
type Way = Intention["ways"][number];

const isSearching = (i: Pick<Intention, "state">) => i.state === "planning" || i.state === "searching";
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The board reads its selection from the URL, so it renders in the browser behind this boundary. */
export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Home />
    </Suspense>
  );
}

function PageSpinner() {
  return (
    <div role="status" aria-label="Loading" className="flex justify-center pt-32">
      <Loader2 aria-hidden className="size-6 animate-spin text-[var(--airmail)]" />
    </div>
  );
}

function Home() {
  const sessionId = useSessionId();
  const params = useSearchParams();
  // Null means the board isn't open to this account yet, as during sign-in or sign-out. Show it as loading.
  const overview = useQuery(api.board.overview, sessionId ? { sessionId } : "skip") ?? undefined;
  // The URL keeps the open memory and intention, so returning from "How we found these" lands in the same place.
  const [memoryId, setMemoryId] = useState<string | null>(() => params.get("m"));
  const [intentionId, setIntentionId] = useState<string | null>(() => params.get("i"));
  const [adding, setAdding] = useState(false);
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
  const intentions = overview?.intentions ?? [];
  const progress = { done: intentions.filter((i) => i.state === "ready").length, failed: intentions.filter((i) => i.state === "failed").length, total: intentions.length };
  const memoryList = useRef<HTMLDivElement>(null);
  const waysColumn = useRef<HTMLElement>(null);

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
  }, [shownMemoryId]);

  /** Opens the memory and intention behind an idea. On a phone the columns stack, so bring the ways into view. */
  function openIdea(m: string, i: string) {
    setMemoryId(m);
    setIntentionId(i);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => waysColumn.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" }));
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader>
        {!empty && status !== "LoadingFirstPage" ? <McpButton /> : null}
        <Account />
      </SiteHeader>

      <main className="mx-auto max-w-[1280px] px-5 pb-12">
        {status === "LoadingFirstPage" && !searchTerm ? (
          <PageSpinner />
        ) : empty ? (
          <Connect />
        ) : (
          <>
            <h1 className="sr-only">Your memories and ways forward</h1>
            {overview ? <Proposal overview={overview} progress={progress} onOpen={openIdea} /> : <Quiet><Spinner label="Loading ideas" /></Quiet>}
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
                      className="flex size-10 items-center justify-center rounded-full bg-[var(--airmail)] text-white transition hover:bg-[var(--airmail-2)]"
                    >
                      <Plus className="size-4" />
                    </button>
                  </span>
                }
                className="lg:sticky lg:top-4"
              >
                <div className="relative mb-2">
                  <Search aria-hidden className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" />
                  <Input
                    type="search"
                    aria-label="Search memories"
                    placeholder="Search memories"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setMemoryId(null); setIntentionId(null); }}
                    className="h-11 rounded-xl bg-card pl-9"
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
                        <span className={cn("block truncate text-[12.5px] font-medium", m._id === selectedId ? "text-[var(--on-airmail-muted)]" : "text-muted-foreground")}>
                          <AgentMark source={m.source} className="mr-1.5" />
                          {hasAgentMark(m.source) ? (m.category ?? "Memory") : `from ${m.source ?? "you"}${m.category ? ` · ${m.category}` : ""}`}
                        </span>
                      </span>
                      {m.sample ? <span className="text-[12px] opacity-70">Sample</span> : null}
                    </Tile>
                  ))}
                  {status === "LoadingFirstPage" || search.trim() !== searchTerm ? <Spinner label="Searching memories" /> : null}
                  {status === "Exhausted" && memories.length === 0 ? <Quiet>No memories match.</Quiet> : null}
                  {status === "CanLoadMore" || status === "LoadingMore" ? (
                    <Button variant="outline" className="h-10 shrink-0 rounded-full" disabled={status === "LoadingMore"} onClick={() => loadMore(25)}>
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
                      <span className={cn("flex items-center gap-1 text-[12.5px] font-medium", i._id === intention?._id ? "text-[var(--on-airmail-muted)]" : "text-muted-foreground")}>
                        {i.inferred ? <Sparkles aria-hidden className="size-3" /> : null}
                        {intentionLabel(i)}
                      </span>
                    </span>
                    {i.state === "ready" ? (
                      <Count n={i.ways.length + i.people.length} />
                    ) : i.state === "failed" ? (
                      <X role="img" aria-label="Failed" className="size-4 text-[var(--airmail-red)]" />
                    ) : (
                      <Spinner label="Searching" />
                    )}
                  </Tile>
                ))}
                {memory && memory.intentions.length === 0 ? <Quiet>Nothing to act on here.</Quiet> : null}
              </Column>

              <Column title="People & opportunities" ref={waysColumn} className="scroll-mt-4">
                {!intention ? null : intention.state === "failed" ? (
                  <Quiet>Search failed. Your agent can save this memory again.</Quiet>
                ) : (
                  <Ways intention={intention} />
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
function Ways({ intention }: { intention: Intention }) {
  const searching = isSearching(intention);
  const members = intention.ways.filter((w) => w.member);
  const places = intention.ways.filter((w) => !w.member);

  return (
    <>
      {searching ? <Searching stage={intention.run?.stage} /> : null}
      {members.map((w) => (
        <WayCard key={w._id} way={w} heading="h3" />
      ))}
      {intention.people.length || !searching ? (
        <>
          <PeopleList people={intention.people} offer={intention.kind === "offer"} />
          {!searching ? <ShowMore key={`${intention._id}:people`} intention={intention} target="people" /> : null}
        </>
      ) : null}
      {places.length > 0 || !searching ? <h3 className="px-1 pt-3 text-[15px] font-bold text-muted-foreground">Places to try</h3> : null}
      {places.map((w) => (
        <WayCard key={w._id} way={w} heading="h4" />
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

/** What the agent saved, so an intention reads next to the words it came from. Tap anywhere on it to read all of it. */
function MemoryQuote({ memory }: { memory: Memory }) {
  const [open, setOpen] = useState(false);
  // Agent notes often open with a heading line such as "From a chat on Saturday:". The preview starts at the first note.
  const lines = memory.text.split("\n").map((l) => l.trim()).filter(Boolean);
  const notes = lines.length > 1 && lines[0].endsWith(":") ? lines.slice(1) : lines;
  const preview = notes.map((l) => l.replace(/^[-*•]\s*/, "")).join(" ");
  return (
    <div className="relative rounded-2xl bg-[var(--tint)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
      {/* The button's hit area covers the whole box. Its name stays short; the memory reads as ordinary text. */}
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left font-bold text-foreground after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-[var(--airmail-2)]"
      >
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          {hasAgentMark(memory.source) ? "Saved" : `${memory.source ?? "You"} saved`}
          <AgentMark source={memory.source} />
        </span>
        <span className="sr-only">{open ? ", show less" : ", show all"}</span>
        <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open ? <p className="mt-1 whitespace-pre-line">{memory.text}</p> : <p className="line-clamp-2">&ldquo;{preview}&rdquo;</p>}
    </div>
  );
}

function Connect() {
  const sessionId = useSessionId();
  const persona = useQuery(api.intentions.getPersona);
  const start = useAction(api.intentions.startDemoPersona);
  const [busy, setBusy] = useState(false);
  const [showMcp, setShowMcp] = useState(false);

  return (
    <div className="mx-auto max-w-[620px] pt-14">
      <h1 className="text-[34px] leading-tight font-extrabold tracking-[-0.025em] text-balance">Connect your agent&apos;s memory</h1>
      <p className="mt-2 text-[17px] text-muted-foreground">Relay reads what your AI remembers and finds people and places that can help.</p>

      <button
        disabled={busy || !sessionId}
        onClick={async () => {
          setBusy(true);
          try {
            await start({ sessionId: sessionId! });
          } catch (e) {
            toast.error(errorText(e));
            setBusy(false);
          }
        }}
        className="mt-7 flex w-full items-center gap-4 rounded-3xl bg-[var(--airmail)] p-5 text-left text-white shadow-md transition hover:bg-[var(--airmail-2)] disabled:opacity-80"
      >
        <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--red-tint)] text-[20px] font-bold text-[var(--airmail-red)]">D</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[20px] font-bold">Start with demo persona</span>
          <span className="block text-[14px] text-[var(--on-airmail-muted)]">
            {!persona ? "Loading" : busy ? `Reading ${persona.memories} memories…` : `${persona.name} · ${persona.memories} memories from ${persona.agents.join(", ")}`}
          </span>
        </span>
        {busy ? <Loader2 aria-hidden className="size-5 animate-spin" /> : <ArrowRight aria-hidden className="size-5" />}
      </button>

      <div className="mt-4 rounded-3xl bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-bold">Connect your own agent</h2>
            <p className="text-[14px] text-muted-foreground">Grok, Dot, Muse, or any agent that supports MCP</p>
          </div>
          <Button variant="outline" className="h-10 rounded-full px-4 font-bold" aria-expanded={showMcp} onClick={() => setShowMcp(!showMcp)}>
            {showMcp ? "Hide" : "Connect"}
          </Button>
        </div>
        {showMcp ? <McpDetails /> : null}
      </div>
    </div>
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
  if (conn === undefined) return <Loader2 role="img" aria-label="Loading" className="mt-4 size-4 animate-spin" />;
  if (!signedIn) {
    return (
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[14px] text-muted-foreground">Sign in to get your private MCP link.</span>
        <SignInButton label="Sign in with Google" className="h-10" />
      </div>
    );
  }
  if (!url) return <Loader2 role="img" aria-label="Loading" className="mt-4 size-4 animate-spin" />;
  return (
    <div className="mt-4 grid gap-2">
      <span className="text-[13px] font-semibold text-muted-foreground">Add this MCP server to your agent</span>
      <div className="flex items-center gap-2">
        <code className="block min-w-0 flex-1 break-all select-all rounded-xl bg-[var(--chip)] px-3 py-2.5 text-[13px]">{url}</code>
        <Button
          className="h-10 rounded-full px-4 font-bold"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              toast.success("Copied");
            } catch {
              toast.error("Could not copy. Select the URL to copy it.");
            }
          }}
        >
          <Copy aria-hidden className="size-4" /> Copy
        </Button>
      </div>
      <span className="text-[13px] text-muted-foreground">
        Tools: add_memory, list_memories. New memories show up here on their own. Keep the link private.{" "}
        <button
          className="inline-flex min-h-10 items-center font-semibold text-foreground underline underline-offset-2"
          onClick={() =>
            void replace({})
              .then(() => toast.success("New link ready. Update your agent."))
              .catch((e) => toast.error(errorText(e)))
          }
        >
          New link
        </button>
      </span>
    </div>
  );
}

function McpButton() {
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
  return (
    <div ref={root} className="relative min-w-0">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex h-10 max-w-full items-center gap-2 rounded-full bg-card px-4 text-[13px] font-bold shadow-sm">
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-[var(--live)]" />
        <span className="truncate">{conn?.persona ? `${conn.persona} (demo)` : "Memory MCP"}</span>
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[min(420px,calc(100vw-40px))] rounded-2xl bg-popover p-4 shadow-lg">
          <span className="block text-[15px] font-bold">Memory MCP</span>
          <McpDetails />
          <Button variant="outline" className="mt-4 h-10 w-full rounded-full font-bold" onClick={() => void startOver().catch((e) => toast.error(errorText(e)))}>
            Start over
          </Button>
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

function Proposal({ overview, progress, onOpen }: { overview: Overview; progress: Progress; onOpen: (m: string, i: string) => void }) {
  const [index, setIndex] = useState(0);
  const proposals = overview.proposals;
  const p = proposals.length ? proposals[index % proposals.length] : undefined;
  const searching = progress.done + progress.failed < progress.total;
  if (!p) {
    return (
      <div className="rounded-3xl bg-[var(--airmail)] p-6 text-white">
        <div className="flex items-center gap-3 text-[17px] font-semibold">
          {searching ? <Loader2 aria-hidden className="size-5 animate-spin" /> : <Check aria-hidden className="size-5" />}
          {searching ? "Finding something for you…" : "No new ideas right now"}
        </div>
        <SearchProgress progress={progress} />
      </div>
    );
  }
  const w = p.way;
  const open = () => onOpen(p.memoryId, p.intentionId);
  return (
    <section aria-label="Idea for you" className="rounded-3xl bg-[var(--airmail)] p-6 text-white">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-bold text-[var(--on-airmail-muted)]">
        Idea for you
        {p.memoryTitle ? (
          <button onClick={open} className="min-w-0 truncate rounded-full bg-white/12 px-3 py-1 font-semibold text-white hover:bg-white/20">
            from &ldquo;{p.memoryTitle}&rdquo;
          </button>
        ) : null}
      </div>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <button className="flex min-w-0 flex-1 items-center gap-4 text-left" onClick={open}>
          <Avatar way={w} large />
          <span className="min-w-0">
            <span className="block text-[20px] leading-tight font-bold tracking-[-0.015em] text-balance sm:text-[22px]">{w.title}</span>
            <span className="mt-1 block text-[15px] text-[var(--on-airmail-muted)]">{w.why}</span>
            {w.member ? <span className="mt-0.5 block text-[13px] text-[var(--on-airmail-muted)]">{w.member.name} (sample)</span> : null}
          </span>
        </button>
        <div className="flex items-center gap-2">
          <WayAction way={w} light onStart={open} />
          {proposals.length > 1 ? (
            <Button variant="ghost" className="h-10 rounded-full px-4 text-white hover:bg-white/10 hover:text-white" onClick={() => setIndex(index + 1)}>
              Another
            </Button>
          ) : null}
        </div>
      </div>
      <SearchProgress progress={progress} />
    </section>
  );
}

/** One bar for every search in flight. It leaves once all of them finish. */
function SearchProgress({ progress: { done, failed, total } }: { progress: Progress }) {
  if (total === 0 || done + failed >= total) return null;
  return (
    <div role="status" className="mt-5 flex items-center gap-3 text-[13px] font-semibold text-[var(--on-airmail-muted)]">
      <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
        <span className="block h-full rounded-full bg-white transition-[width] duration-700" style={{ width: `${Math.max(3, ((done + failed) / total) * 100)}%` }} />
      </span>
      {done + failed} of {total} finished{failed ? ` · ${failed} failed` : ""}
    </div>
  );
}

function Column({ title, action, className, ref, children }: { title: string; action?: React.ReactNode; className?: string; ref?: React.Ref<HTMLElement>; children: React.ReactNode }) {
  return (
    <section ref={ref} className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex h-10 items-center justify-between px-1">
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
        selected ? "bg-[var(--airmail)] text-white shadow-md" : "bg-card text-foreground shadow-sm hover:shadow-md",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** How many ways and public posts an intention found. Same number as the run page's total. */
function Count({ n }: { n: number }) {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-black/[0.07] text-[13px] font-bold">
      {n}
      <span className="sr-only"> found</span>
    </span>
  );
}

/** Sits where a count will go, so it takes the same space. Inherits the tile's text color. */
function Spinner({ label }: { label: string }) {
  return (
    <span role="img" aria-label={label} className="flex size-7 shrink-0 items-center justify-center">
      <Loader2 aria-hidden className="size-4 animate-spin opacity-70" />
    </span>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-card px-4 py-6 text-center text-[15px] text-muted-foreground shadow-sm">{children}</p>;
}

const SEARCH_STEPS = ["Planning", "Searching the web and people", "Checking fit"];

/** The run's stage, folded into three steps a person can follow. */
function Searching({ stage }: { stage?: string }) {
  const current = !stage || stage === "created" || stage === "solution_planning" ? 0 : stage === "discovery" ? 1 : 2;
  return (
    <div role="status" className="rounded-2xl bg-card p-4 shadow-sm">
      <ol className="grid gap-2.5">
        {SEARCH_STEPS.map((step, i) => (
          <li key={step} className={cn("flex items-center gap-3 text-[15px] font-semibold", i > current && "text-muted-foreground")}>
            <span aria-hidden className="flex size-5 shrink-0 items-center justify-center">
              {i < current ? (
                <Check className="size-4 text-[var(--success)]" />
              ) : i === current ? (
                <Loader2 className="size-4 animate-spin text-[var(--airmail)]" />
              ) : (
                <span className="size-1.5 rounded-full bg-[var(--line)]" />
              )}
            </span>
            {step}
            <span className="sr-only">{i < current ? ", done" : i === current ? ", in progress" : ""}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[13px] text-muted-foreground">Results appear as we find them</p>
    </div>
  );
}

type Person = Intention["people"][number];

function PeopleList({ people, offer }: { people: Person[]; offer: boolean }) {
  return (
    <>
      <h3 className="flex items-baseline justify-between gap-3 px-1 pt-3">
        <span className="text-[15px] font-bold text-muted-foreground">{offer ? "People who may need this" : "Related people"}</span>
        <span className="text-[12.5px] font-normal text-muted-foreground">public posts</span>
      </h3>
      {people.map((p) => <PublicPersonCard key={p._id} person={p} />)}
    </>
  );
}

function Avatar({ way: w, large }: { way: Way; large?: boolean }) {
  if (w.member) return <PersonAvatar src={w.member.avatarUrl} name={w.member.name} sample large={large} />;
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-[var(--airmail-tint)] text-[var(--airmail)]", large ? "size-14" : "size-11")}>
      <Globe aria-hidden className={large ? "size-6" : "size-5"} />
    </span>
  );
}

function WayCard({ way: w, heading: Heading }: { way: Way; heading: "h3" | "h4" }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="min-w-0 rounded-2xl bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3.5">
        <Avatar way={w} />
        <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Heading className="text-[16px] leading-snug font-bold">{w.member?.name ?? w.title}</Heading>
            {w.member ? <SampleTag /> : null}
            {w.fit === "strong_fit" ? (
              <span className="inline-flex h-5 items-center rounded-full bg-[var(--kraft-soft)] px-2 text-[11px] font-bold text-[var(--kraft-ink)]">Great fit</span>
            ) : null}
          </div>
          <p className="mt-1 text-[13.5px] leading-snug text-muted-foreground">{w.member?.about ?? w.source?.host}</p>
        </div>
      </div>
      <div className="mt-3 text-[14px] leading-relaxed [overflow-wrap:anywhere]">
        <p className="text-[11px] font-bold text-muted-foreground">Why this fits</p>
        <p className="mt-0.5">{w.why}</p>
        {w.member ? (
          <p className="mt-2 text-[13px] text-muted-foreground"><span className="font-semibold">Looking for </span>{w.member.wants}</p>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <button className="-ml-2 inline-flex min-h-10 items-center gap-1 rounded-full px-2 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Less" : "Details"}<ChevronDown aria-hidden className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </button>
        <WayAction way={w} />
      </div>
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

/** The one direct action for a way forward: introduce, follow up, or open the page. */
function WayAction({ way: w, light, onStart }: { way: Way; light?: boolean; onStart?: () => void }) {
  const sessionId = useSessionId();
  const introduce = useMutation(api.introductions.quickIntroduce);
  const respond = useMutation(api.introductions.respondToIntroduction);
  const [busy, setBusy] = useState(false);
  const base = cn("h-10 shrink-0 rounded-full px-4 text-[14px] font-bold", light && "bg-white text-[var(--airmail)] hover:bg-white/90");

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  if (w.member) {
    const name = w.member.name.split(" ")[0];
    if (!w.intro) {
      return (
        <Button
          className={base}
          disabled={busy || !sessionId}
          onClick={() => {
            onStart?.(); // keep the card in view after the idea leaves the proposal bar
            void act(() => introduce({ sessionId: sessionId!, optionId: w._id as Id<"options"> }));
          }}
        >
          {busy ? <Loader2 aria-hidden className="animate-spin" /> : null} Say hi
        </Button>
      );
    }
    if (w.intro.state === "accepted") {
      return (
        <span className={cn(base, "inline-flex items-center gap-1.5 bg-[var(--success-soft)] text-[var(--success)]", light && "bg-white")} title={`${w.intro.contact} (sample contact)`}>
          <Check aria-hidden className="size-4" /> Connected
        </span>
      );
    }
    if (w.intro.state === "pending_acceptance") {
      return (
        <Button
          variant="outline"
          className={base}
          title="Demo: act as the other person"
          disabled={busy}
          onClick={() => act(() => respond({ sessionId: sessionId!, introductionId: w.intro!._id, response: "accept" }))}
        >
          Accept as {name} <span className="text-[11px] font-medium">(demo)</span>
        </Button>
      );
    }
    if (w.intro.state === "declined") return <span className="shrink-0 text-[13px] font-semibold text-muted-foreground">Not now</span>;
    return (
      <span className={cn("flex shrink-0 items-center gap-1.5 text-[13px] font-semibold", light ? "text-white" : "text-muted-foreground")}>
        <Loader2 aria-hidden className="size-3.5 animate-spin" /> Asking {name}
      </span>
    );
  }
  if (w.source) {
    return (
      <a href={w.source.url} target="_blank" rel="noreferrer" className={cn("inline-flex items-center gap-1 transition", base, light ? "" : "bg-[var(--airmail-tint)] text-[var(--airmail)] hover:bg-[var(--airmail-tint-strong)]")}>
        Open <ArrowUpRight aria-hidden className="size-4" />
      </a>
    );
  }
  return null;
}
