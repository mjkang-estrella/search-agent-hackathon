"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Copy, Globe, Loader2, Sparkles, Star, X } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { resetSession, useSessionId } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { errorText } from "@/lib/format";

type Board = FunctionReturnType<typeof api.board.get>;
type Memory = Board["memories"][number];
type Intention = Memory["intentions"][number];
type Way = Intention["ways"][number];

const isSearching = (i: Intention) => i.state === "planning" || i.state === "searching";

export default function Home() {
  const sessionId = useSessionId();
  const board = useQuery(api.board.get, sessionId ? { sessionId } : "skip");
  const [memoryId, setMemoryId] = useState<string | null>(null);
  const [intentionId, setIntentionId] = useState<string | null>(null);
  const memoryList = useRef<HTMLDivElement>(null);
  const waysColumn = useRef<HTMLElement>(null);

  const memories = board?.memories ?? [];
  const memory = memories.find((m) => m._id === memoryId) ?? memories[0];
  const intention = memory?.intentions.find((i) => i._id === intentionId) ?? memory?.intentions[0];
  const empty = board !== undefined && memories.length === 0;
  const intentions = memories.flatMap((m) => m.intentions);
  const progress = { done: intentions.filter((i) => !isSearching(i)).length, total: intentions.length };

  // Keep the selected memory in view inside its own scroller: a row on phones, a list on desktop.
  const selectedMemoryId = memory?._id;
  useEffect(() => {
    const list = memoryList.current;
    const tile = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!list || !tile) return;
    list.scrollTo({
      left: tile.offsetLeft - (list.clientWidth - tile.clientWidth) / 2,
      top: tile.offsetTop - (list.clientHeight - tile.clientHeight) / 2,
      behavior: "smooth",
    });
  }, [selectedMemoryId]);

  /** Opens the memory and intention behind an idea. On a phone the columns stack, so bring the ways into view. */
  function openIdea(m: string, i: string) {
    setMemoryId(m);
    setIntentionId(i);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => waysColumn.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6fa]">
      <header className="mx-auto flex max-w-[1280px] items-center justify-between px-5 pt-6 pb-2">
        <span className="flex items-center gap-2 text-[20px] font-extrabold tracking-[-0.02em] text-[var(--airmail)]">
          <span aria-hidden className="size-3 rounded-full bg-[var(--airmail-red)]" />
          Wayfinder
        </span>
        {!empty && board ? <McpButton /> : null}
      </header>

      <main className="mx-auto max-w-[1280px] px-5 pb-12">
        {board === undefined ? (
          <div role="status" aria-label="Loading" className="flex justify-center pt-24">
            <Loader2 className="size-6 animate-spin text-[var(--airmail)]" />
          </div>
        ) : empty ? (
          <Connect />
        ) : (
          <>
            <Proposal board={board} progress={progress} onOpen={openIdea} />

            <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1fr_1fr_1.5fr]">
              <Column title="Your memories" action={<Aside>{memories.length}</Aside>} className="lg:sticky lg:top-4">
                <div
                  ref={memoryList}
                  className="no-scrollbar relative -mx-5 -mt-1 flex snap-x scroll-px-5 gap-2 overflow-x-auto px-5 pt-1 pb-3 lg:-mx-2 lg:max-h-[calc(100dvh-5.5rem)] lg:flex-col lg:overflow-y-auto lg:px-2"
                >
                  {memories.map((m) => (
                    <Tile
                      key={m._id}
                      compact
                      className="w-[232px] shrink-0 snap-start lg:w-full"
                      selected={m._id === memory?._id}
                      onClick={() => (setMemoryId(m._id), setIntentionId(null))}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{m.title}</span>
                        <span className={cn("block truncate text-[12.5px] font-medium", m._id === memory?._id ? "text-[#c9d4ee]" : "text-muted-foreground")}>
                          from {m.source ?? "you"}
                          {m.category ? ` · ${m.category}` : ""}
                        </span>
                      </span>
                      {m.intentions.some(isSearching) ? <Spinner label="Searching" /> : <Count n={m.intentions.length} />}
                    </Tile>
                  ))}
                </div>
              </Column>

              <Column title="What you want" className="lg:sticky lg:top-4">
                {memory ? <MemoryQuote key={memory._id} memory={memory} /> : null}
                {memory?.intentions.map((i) => (
                  <Tile key={i._id} selected={i._id === intention?._id} onClick={() => setIntentionId(i._id)}>
                    <span className="min-w-0 flex-1">
                      <span className="block">{i.title}</span>
                      <span className={cn("flex items-center gap-1 text-[12.5px] font-medium", i._id === intention?._id ? "text-[#c9d4ee]" : "text-muted-foreground")}>
                        {i.inferred ? <Sparkles className="size-3" /> : null}
                        {i.inferred ? "Spotted by your agent" : i.kind === "offer" ? "You could help" : "You need"}
                      </span>
                    </span>
                    {i.state === "ready" ? (
                      <Count n={i.ways.length + i.people.length} />
                    ) : i.state === "failed" ? (
                      <X aria-label="Failed" className="size-4 text-[var(--airmail-red)]" />
                    ) : (
                      <Spinner label="Searching" />
                    )}
                  </Tile>
                ))}
                {memory && memory.intentions.length === 0 ? <Quiet>Nothing to act on here.</Quiet> : null}
              </Column>

              <Column title="Ways to get there" ref={waysColumn} className="scroll-mt-4">
                {!intention ? null : intention.state === "failed" ? (
                  <Quiet>Something went wrong. Try adding it again.</Quiet>
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
  const found = intention.ways.length + intention.people.length > 0;
  const trace = intention.run ? `/r/${intention.run._id}` : null;
  const traceLink = "px-1 pt-1 text-[13px] font-semibold text-[var(--airmail)] hover:underline";

  if (!searching && !found) {
    return (
      <Quiet>
        No matches yet.
        {trace ? (
          <Link href={trace} className="mt-1 block font-semibold text-[var(--airmail)] hover:underline">
            See what we searched
          </Link>
        ) : null}
      </Quiet>
    );
  }
  return (
    <>
      {searching ? <Searching stage={intention.run?.stage} /> : null}
      {members.map((w) => (
        <WayCard key={w._id} way={w} />
      ))}
      {intention.people.length ? <PeopleList people={intention.people} offer={intention.kind === "offer"} /> : null}
      {places.length && intention.people.length ? <h3 className="px-1 pt-3 text-[15px] font-bold text-muted-foreground">Places to try</h3> : null}
      {places.map((w) => (
        <WayCard key={w._id} way={w} />
      ))}
      {!searching && trace ? (
        <Link href={trace} className={traceLink}>
          How we found these
        </Link>
      ) : null}
    </>
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
      className="rounded-2xl bg-[#e7ecf5] px-4 py-3 text-left text-[13.5px] leading-relaxed text-[var(--ink-muted)]"
    >
      <span className="font-bold text-foreground">{memory.source ?? "You"} saved</span>
      {open ? <span className="mt-1 block whitespace-pre-line">{memory.text}</span> : <span className="line-clamp-2">&ldquo;{preview}&rdquo;</span>}
    </button>
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
      <p className="mt-2 text-[17px] text-muted-foreground">Wayfinder reads what your AI remembers and finds people and places that can help.</p>

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
        className="mt-7 flex w-full items-center gap-4 rounded-3xl bg-[var(--airmail)] p-5 text-left text-white shadow-md transition hover:shadow-lg disabled:opacity-80"
      >
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#f2c9cc] text-[20px] font-bold text-[var(--airmail-red)]">D</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[19px] font-bold">Start with demo persona</span>
          <span className="block text-[14px] text-[#c9d4ee]">
            {!persona ? "Loading" : busy ? `Reading ${persona.memories} memories…` : `${persona.name} · ${persona.memories} memories from ${persona.agents.join(", ")}`}
          </span>
        </span>
        {busy ? <Loader2 className="size-5 animate-spin" /> : <ArrowRight className="size-5" />}
      </button>

      <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="block text-[16px] font-bold">Connect your own agent</span>
            <span className="text-[14px] text-muted-foreground">Grok, Dot, Muse, or any agent that supports MCP</span>
          </div>
          <Button variant="outline" className="h-10 rounded-full px-4 font-bold" onClick={() => setShowMcp(!showMcp)}>
            {showMcp ? "Hide" : "Connect"}
          </Button>
        </div>
        {showMcp ? <McpDetails /> : null}
      </div>
    </div>
  );
}

function McpDetails() {
  const sessionId = useSessionId();
  const enable = useMutation(api.intentions.enableMcp);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (sessionId) void enable({ sessionId }).then(setUrl);
  }, [sessionId, enable]);
  if (!url) return <Loader2 className="mt-4 size-4 animate-spin" />;
  return (
    <div className="mt-4 grid gap-2">
      <span className="text-[13px] font-semibold text-muted-foreground">Add this MCP server to your agent</span>
      <div className="flex items-center gap-2">
        <code className="block min-w-0 flex-1 truncate rounded-xl bg-[#eef1f6] px-3 py-2.5 text-[13px]">{url}</code>
        <Button
          className="h-10 rounded-full px-4 font-bold"
          onClick={() => {
            void navigator.clipboard.writeText(url);
            toast.success("Copied");
          }}
        >
          <Copy className="size-4" /> Copy
        </Button>
      </div>
      <span className="text-[13px] text-muted-foreground">Tools: add_memory, list_memories. New memories show up here on their own.</span>
    </div>
  );
}

function McpButton() {
  const conn = useConnection();
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
    <div ref={root} className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex h-9 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-bold shadow-sm">
        <span className="size-2 rounded-full bg-[#2f9e6a]" />
        {conn?.persona ? `${conn.persona} (demo)` : "Memory MCP"}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[min(420px,calc(100vw-40px))] rounded-2xl bg-white p-4 shadow-lg">
          <span className="block text-[15px] font-bold">Memory MCP</span>
          <McpDetails />
          <Button variant="outline" className="mt-4 h-9 w-full rounded-full font-bold" onClick={resetSession}>
            Start over
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function useConnection() {
  const sessionId = useSessionId();
  return useQuery(api.intentions.getConnection, sessionId ? { sessionId } : "skip");
}

type Progress = { done: number; total: number };

function Proposal({ board, progress, onOpen }: { board: Board; progress: Progress; onOpen: (m: string, i: string) => void }) {
  const [index, setIndex] = useState(0);
  const proposals = board.proposals;
  const p = proposals.length ? proposals[index % proposals.length] : undefined;
  const searching = progress.done < progress.total || progress.total === 0;
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
  const memory = board.memories.find((m) => m._id === p.memoryId);
  const open = () => onOpen(p.memoryId, p.intentionId);
  return (
    <div className="rounded-3xl bg-[var(--airmail)] p-6 text-white">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-bold text-[#c9d4ee]">
        <Sparkles aria-hidden className="size-4" /> Idea for you
        {memory ? (
          <button onClick={open} className="min-w-0 truncate rounded-full bg-white/12 px-2.5 py-0.5 font-semibold text-white hover:bg-white/20">
            from &ldquo;{memory.title}&rdquo;
          </button>
        ) : null}
      </div>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <button className="flex min-w-0 flex-1 items-center gap-4 text-left" onClick={open}>
          <Avatar way={w} large />
          <span className="min-w-0">
            <span className="block text-[20px] leading-tight font-bold tracking-[-0.015em] text-balance sm:text-[22px]">{w.title}</span>
            <span className="mt-1 block text-[15px] text-[#c9d4ee]">{w.why}</span>
            {w.member ? <span className="mt-0.5 block text-[13px] text-[#c9d4ee]">{w.member.name} (sample)</span> : null}
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
    </div>
  );
}

/** One bar for every search in flight. It leaves once all of them finish. */
function SearchProgress({ progress: { done, total } }: { progress: Progress }) {
  if (total === 0 || done >= total) return null;
  return (
    <div role="status" className="mt-5 flex items-center gap-3 text-[13px] font-semibold text-[#c9d4ee]">
      <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
        <span className="block h-full rounded-full bg-white transition-[width] duration-700" style={{ width: `${Math.max(3, (done / total) * 100)}%` }} />
      </span>
      {done} of {total} searched
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
        selected ? "bg-[var(--airmail)] text-white shadow-md" : "bg-white text-foreground shadow-sm hover:shadow-md",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Count({ n }: { n: number }) {
  return <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-black/[0.07] text-[13px] font-bold">{n}</span>;
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

const SEARCH_STEPS = ["Planning", "Searching the web and people", "Checking fit"];

/** The run's stage, folded into three steps a person can follow. */
function Searching({ stage }: { stage?: string }) {
  const current = !stage || stage === "created" || stage === "solution_planning" ? 0 : stage === "discovery" ? 1 : 2;
  return (
    <div role="status" className="rounded-2xl bg-white p-4 shadow-sm">
      <ol className="grid gap-2.5">
        {SEARCH_STEPS.map((step, i) => (
          <li key={step} className={cn("flex items-center gap-3 text-[15px] font-semibold", i > current && "text-muted-foreground")}>
            <span className="flex size-5 shrink-0 items-center justify-center">
              {i < current ? (
                <Check className="size-4 text-[#1f6b47]" />
              ) : i === current ? (
                <Loader2 className="size-4 animate-spin text-[var(--airmail)]" />
              ) : (
                <span className="size-1.5 rounded-full bg-[var(--line)]" />
              )}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[13px] text-muted-foreground">About a minute</p>
    </div>
  );
}

type Person = Intention["people"][number];

const PLATFORM: Record<string, { mark: string; color: string }> = {
  X: { mark: "X", color: "#111111" },
  TikTok: { mark: "TT", color: "#141414" },
  Reddit: { mark: "r/", color: "#ff4500" },
  Facebook: { mark: "f", color: "#1877f2" },
  Instagram: { mark: "IG", color: "#d62976" },
  LinkedIn: { mark: "in", color: "#0a66c2" },
};

function PeopleList({ people, offer }: { people: Person[]; offer: boolean }) {
  return (
    <>
      <h3 className="flex items-baseline justify-between gap-3 px-1 pt-3">
        <span className="text-[15px] font-bold text-muted-foreground">{offer ? "People asking for this" : "People who've done it"}</span>
        <span className="text-[12.5px] text-muted-foreground">public posts</span>
      </h3>
      {people.map((p) => (
        <a key={p._id} href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold text-white"
            style={{ background: PLATFORM[p.platform]?.color ?? "#1d2433" }}
          >
            {PLATFORM[p.platform]?.mark ?? p.platform.slice(0, 2)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] leading-snug font-bold">{p.reason ?? p.title}</span>
            <span className="block truncate text-[13.5px] text-muted-foreground">
              {p.author} on {p.platform}
            </span>
          </span>
          <ArrowUpRight className="size-5 shrink-0 text-[var(--airmail)]" />
        </a>
      ))}
    </>
  );
}

function Avatar({ way: w, large }: { way: Way; large?: boolean }) {
  const size = large ? "size-14 text-[20px]" : "size-11 text-[16px]";
  if (w.member) {
    const initials = w.member.name.split(/\s+/).map((x) => x[0]).join("").slice(0, 2);
    return (
      <span title="Sample person for this demo" className={cn("relative flex shrink-0 items-center justify-center rounded-full bg-[#f2c9cc] font-bold text-[var(--airmail-red)]", size)}>
        {initials}
        {w.source ? (
          <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-white text-[var(--airmail)] shadow">
            <Globe className="size-3" />
          </span>
        ) : null}
      </span>
    );
  }
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-[#dfe7f6] text-[var(--airmail)]", size)}>
      <Globe className={large ? "size-6" : "size-5"} />
    </span>
  );
}

function WayCard({ way: w }: { way: Way }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3.5">
        <Avatar way={w} />
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="block text-[16px] leading-snug font-bold">
            {w.title}
            {w.fit === "strong_fit" ? <Star aria-label="Great fit" className="mb-0.5 ml-1.5 inline size-3.5 fill-[var(--kraft)] text-[var(--kraft)]" /> : null}
          </span>
          <span className="flex items-center gap-1 text-[13.5px] text-muted-foreground">
            <span className="truncate">{[w.member ? `${w.member.name} (sample)` : null, w.source?.host].filter(Boolean).join(" · ")}</span>
            <ChevronDown aria-hidden className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-180")} />
          </span>
        </button>
        <WayAction way={w} />
      </div>
      {open ? (
        <div className="mt-3 ml-[58px] grid gap-2 text-[14px]">
          <p>{w.why}</p>
          {w.source?.quote ? <p className="line-clamp-2 text-muted-foreground">“{w.source.quote}”</p> : null}
        </div>
      ) : null}
    </div>
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
          {busy ? <Loader2 className="animate-spin" /> : null} Say hi
        </Button>
      );
    }
    if (w.intro.state === "accepted") {
      return (
        <a href={`mailto:${w.intro.contact}`} className={cn(base, "inline-flex items-center gap-1.5 bg-[#e3f1ea] text-[#1f6b47]", light && "bg-white text-[#1f6b47]")} title={`${w.intro.contact} (sample contact)`}>
          <Check className="size-4" /> Connected
        </a>
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
          Accept as {name}
        </Button>
      );
    }
    if (w.intro.state === "declined") return <span className="shrink-0 text-[13px] font-semibold text-muted-foreground">Not now</span>;
    return (
      <span className={cn("flex shrink-0 items-center gap-1.5 text-[13px] font-semibold", light ? "text-white" : "text-muted-foreground")}>
        <Loader2 className="size-3.5 animate-spin" /> Asking {name}
      </span>
    );
  }
  if (w.source) {
    return (
      <a href={w.source.url} target="_blank" rel="noreferrer" className={cn(buttonClass, base, light ? "" : "bg-[#dfe7f6] text-[var(--airmail)] hover:bg-[#d2ddf2]")}>
        Open <ArrowUpRight className="size-4" />
      </a>
    );
  }
  return null;
}

const buttonClass = "inline-flex items-center gap-1 transition";
