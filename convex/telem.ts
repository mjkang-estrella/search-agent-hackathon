// Telem request construction, response normalization, provenance, and per-page errors.
// Plain functions called from actions. Fetched content is evidence, never instructions.
import { authorLinks } from "../lib/people";
import type { SearchHit } from "../lib/rules";

const DEFAULT_BASE = "https://router.telem.ai";

function config() {
  const key = process.env.TELEM_API_KEY;
  if (!key) throw new Error("TELEM_API_KEY is not set on the Convex deployment");
  return { key, base: (process.env.TELEM_BASE_URL ?? DEFAULT_BASE).replace(/\/+$/, "") };
}

export class TelemError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSeconds: number | null,
  ) {
    super(message);
  }
}

async function post(path: string, body: unknown, deadlineMs: number): Promise<unknown> {
  const { key, base } = config();
  let attempt = 0;
  for (;;) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), deadlineMs);
    try {
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const text = await res.text();
      if (res.ok) return parseLenient(text);
      const retryAfter = Number(res.headers.get("retry-after")) || null;
      const message = describeError(res.status, text);
      // Retry transient failures once, honoring Retry-After when it fits the deadline.
      if (attempt === 0 && [429, 503, 504].includes(res.status) && (retryAfter ?? 1) <= 10) {
        attempt++;
        await new Promise((r) => setTimeout(r, (retryAfter ?? 1) * 1000));
        continue;
      }
      throw new TelemError(message, res.status, retryAfter);
    } catch (e) {
      if (e instanceof TelemError) throw e;
      if ((e as Error).name === "AbortError") throw new TelemError(`Telem ${path} timed out after ${deadlineMs}ms`, 0, null);
      throw new TelemError(`Telem ${path} request failed: ${(e as Error).message}`, 0, null);
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Parses JSON, repairing malformed \\u escapes that truncated social posts sometimes contain. */
export function parseLenient(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(text.replace(/\\u(?![0-9a-fA-F]{4})/g, "\\\\u"));
  }
}

function describeError(status: number, text: string): string {
  try {
    const body = JSON.parse(text);
    if (body?.error?.message) return `Telem ${status} ${body.error.code ?? ""}: ${body.error.message}`;
    const d = body?.detail;
    if (typeof d === "string") return `Telem ${status}: ${d}`;
    if (d?.code) return `Telem ${status} ${d.code}: ${d.reason ?? ""}`;
    if (Array.isArray(d)) return `Telem ${status}: ${d.map((x: { msg?: string }) => x.msg).join("; ")}`;
  } catch {
    // fall through
  }
  return `Telem ${status}: ${text.slice(0, 200)}`;
}

// ---------- Search ----------

export type ProviderRun = {
  provider: string;
  query: string;
  batchIndex: number;
  status: string;
  latencyMs: number | null;
  resultCount: number;
  error: string | null;
  warnings: string[];
};

export type SearchResult = {
  interactionId: string | null;
  status: string;
  routing: { query: string; topic: string | null; providers: string[] }[] | null;
  runs: ProviderRun[];
  hits: SearchHit[];
  durationMs: number;
};

type RawSearch = {
  interaction_id?: string;
  status?: string;
  routing?: { topic?: string; providers?: string[] }[] | null;
  preprocessor_runs?: {
    preprocessor_name: string;
    status: string;
    batch_index?: number;
    query?: string;
    latency_ms?: number;
    error?: { message?: string } | string | null;
    output_payload?: {
      results?: { url: string; title?: string | null; rank?: number; summary?: string | null; source?: { author?: string | null } | null; enrichments?: unknown; publish_date?: string | null }[];
      warnings?: { code?: string; message?: string }[];
    } | null;
  }[];
};

export async function telemSearch(
  queries: string[],
  opts: { numResults?: number; deadlineMs?: number; providers?: string[]; tier?: "default" | "max" } = {},
): Promise<SearchResult> {
  const started = Date.now();
  const search = opts.providers
    ? { num_results: opts.numResults ?? 5, tier: opts.tier ?? "default", providers: { include: opts.providers } }
    : { num_results: opts.numResults ?? 5, auto_routing: "accuracy", tier: opts.tier ?? "default" };
  const raw = (await post(
    "/v1/search",
    { user_input: queries.map((query) => ({ query })), search },
    opts.deadlineMs ?? 45_000,
  )) as RawSearch;
  return normalizeSearch(raw, queries, Date.now() - started);
}

export function normalizeSearch(raw: RawSearch, queries: string[], durationMs: number): SearchResult {
  const runs: ProviderRun[] = [];
  const hits: SearchHit[] = [];
  for (const r of raw.preprocessor_runs ?? []) {
    const batchIndex = r.batch_index ?? 0;
    const query = r.query ?? queries[batchIndex] ?? queries[0];
    const results = r.output_payload?.results ?? [];
    runs.push({
      provider: r.preprocessor_name,
      query,
      batchIndex,
      status: r.status,
      latencyMs: r.latency_ms ?? null,
      resultCount: results.length,
      error: r.error ? (typeof r.error === "string" ? r.error : (r.error.message ?? "error")) : null,
      warnings: (r.output_payload?.warnings ?? []).map((w) => w.code ?? w.message ?? "warning"),
    });
    for (const [i, res] of results.entries()) {
      if (!res.url) continue;
      hits.push({
        url: res.url,
        title: res.title ?? null,
        snippet: res.summary ? res.summary.slice(0, 600) : null,
        provider: r.preprocessor_name,
        query,
        rank: res.rank ?? i + 1,
        author: res.source?.author ?? null,
        ...authorLinks(res.source, res.enrichments),
        publishedAt: res.publish_date ?? null,
      });
    }
  }
  return {
    interactionId: raw.interaction_id ?? null,
    status: raw.status ?? "unknown",
    routing: raw.routing
      ? raw.routing.map((x, i) => ({ query: queries[i] ?? "", topic: x.topic ?? null, providers: x.providers ?? [] }))
      : null,
    runs,
    hits,
    durationMs,
  };
}

// ---------- Fetch ----------

export type FetchedPage = {
  url: string;
  status: "succeeded" | "failed";
  provider: string | null;
  title: string | null;
  content: string | null;
  contentLength: number | null;
  truncated: boolean;
  cacheState: string | null;
  fetchedAt: string | null;
  latencyMs: number | null;
  error: string | null;
  providerChain: { provider: string; status: string; error: string | null }[];
};

export type FetchResult = { interactionId: string | null; status: string; pages: FetchedPage[]; durationMs: number };

type RawFetchRow = {
  url: string;
  status: string;
  provider?: string | null;
  title?: string | null;
  content?: string | null;
  content_length?: number | null;
  content_truncated?: boolean;
  cache_state?: string | null;
  fetched_at?: string | null;
  latency_ms?: number | null;
  error?: { message?: string; type?: string } | string | null;
  provider_chain?: { provider: string; status: string; error?: string | null }[];
};

export async function telemFetch(urls: string[], opts: { maxChars?: number; deadlineMs?: number } = {}): Promise<FetchResult> {
  const started = Date.now();
  const unique = [...new Set(urls)].slice(0, 5);
  const raw = (await post(
    "/v1/fetch",
    { urls: unique, options: { content_format: "markdown", inline_max_chars: opts.maxChars ?? 12_000 } },
    opts.deadlineMs ?? 40_000,
  )) as {
    interaction_id?: string;
    status?: string;
    preprocessor_runs?: { output_payload?: { fetched_results?: RawFetchRow[] } }[];
  };
  const rows = (raw.preprocessor_runs ?? []).flatMap((r) => r.output_payload?.fetched_results ?? []);
  const pages: FetchedPage[] = unique.map((url) => {
    const row = rows.find((x) => x.url === url);
    if (!row) {
      return {
        url, status: "failed", provider: null, title: null, content: null, contentLength: null, truncated: false,
        cacheState: null, fetchedAt: null, latencyMs: null, error: "No row returned for this URL", providerChain: [],
      };
    }
    const ok = row.status === "succeeded" && !!row.content;
    return {
      url,
      status: ok ? "succeeded" : "failed",
      provider: row.provider ?? null,
      title: row.title || null,
      content: ok ? row.content! : null,
      contentLength: row.content_length ?? null,
      truncated: !!row.content_truncated,
      cacheState: row.cache_state ?? null,
      fetchedAt: row.fetched_at ?? null,
      latencyMs: row.latency_ms ?? null,
      error: ok ? null : row.error ? (typeof row.error === "string" ? row.error : (row.error.message ?? "fetch failed")) : "Empty content",
      providerChain: (row.provider_chain ?? []).map((p) => ({ provider: p.provider, status: p.status, error: p.error ?? null })),
    };
  });
  return { interactionId: raw.interaction_id ?? null, status: raw.status ?? "unknown", pages, durationMs: Date.now() - started };
}
