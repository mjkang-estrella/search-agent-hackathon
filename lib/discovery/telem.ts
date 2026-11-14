import type { Platform, PublicPost, QueryOutcome, SearchQuery } from "./types.ts";

const BASE = process.env.TELEM_BASE_URL ?? "https://router.telem.ai";

// Tried in order. socialdatax_x comes first because it returns author
// location; fetchlayer_x is the fallback when it runs out of capacity.
export const PROVIDERS: Record<Platform, string[]> = {
  x: ["socialdatax_x", "fetchlayer_x"],
  linkedin: ["apify_linkedin"],
  substack: ["apify_substack"],
};

const CAPACITY_RETRIES = 2;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Run tasks with at most `limit` in flight. Telem's upstream providers
// saturate when ten searches start at once.
export async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

interface SearchOptions {
  since: string; // ISO date; posts before this are dropped here, since providers don't always honor it
  numResults?: number;
}

export async function searchPosts(
  q: SearchQuery,
  { since, numResults = 10 }: SearchOptions,
): Promise<{ posts: PublicPost[]; outcome: QueryOutcome }> {
  const started = Date.now();
  const tried: QueryOutcome["tried"] = [];

  for (const provider of PROVIDERS[q.platform]) {
    let res: Response | undefined;
    let json: TelemSearchResponse = {};
    // Telem answers 503 no_provider_key_capacity when the upstream provider
    // is briefly saturated. Wait for retry-after and try the same provider
    // again before falling back.
    for (let attempt = 0; attempt < CAPACITY_RETRIES + 1; attempt++) {
      res = await fetch(`${BASE}/v1/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.TELEM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_input: { query: q.query },
          search: {
            providers: { include: [provider] },
            num_results: numResults,
            published_after: since,
            include_raw: true,
          },
        }),
      });
      json = (await res.json().catch(() => ({}))) as TelemSearchResponse;
      if (res.status !== 503 || attempt === CAPACITY_RETRIES) break;
      tried.push({ provider, httpStatus: res.status, reason: `${json.detail?.reason ?? "unavailable"}, retrying` });
      const wait = Number(res.headers.get("retry-after") ?? "1");
      await sleep(Math.min(Math.max(wait, 1), 10) * 1000 * (attempt + 1));
    }
    const run = json.preprocessor_runs?.[0];
    if (!res!.ok || !run?.raw_payload) {
      tried.push({ provider, httpStatus: res!.status, reason: json.detail?.reason ?? json.detail?.code ?? json.status });
      continue;
    }
    tried.push({ provider, httpStatus: res!.status });

    const all = normalize(provider, run.raw_payload, q);
    const sinceMs = Date.parse(since);
    const posts = all.filter((p) => Date.parse(p.publishedAt) >= sinceMs);
    return {
      posts,
      outcome: {
        query: q,
        provider,
        status: "ok",
        tried,
        returned: all.length,
        kept: posts.length,
        droppedOld: all.length - posts.length,
        ms: Date.now() - started,
      },
    };
  }

  return {
    posts: [],
    outcome: { query: q, provider: null, status: "failed", tried, returned: 0, kept: 0, droppedOld: 0, ms: Date.now() - started },
  };
}

// ---------- per-provider normalization ----------

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>;

interface TelemSearchResponse {
  status?: string;
  detail?: { code?: string; reason?: string };
  preprocessor_runs?: { preprocessor_name: string; raw_payload?: Raw }[];
}

function normalize(provider: string, raw: Raw, q: SearchQuery): PublicPost[] {
  switch (provider) {
    case "fetchlayer_x":
      return (raw.tweets ?? [])
        .filter((t: Raw) => !t.isRetweet && t.author?.handle)
        .map((t: Raw) => ({
          platform: "x",
          provider,
          url: t.url,
          publishedAt: new Date(t.createdAt).toISOString(),
          text: clean(t.fullText ?? t.text),
          author: {
            platform: "x",
            handle: t.author.handle.toLowerCase(),
            name: t.author.name ?? t.author.handle,
            bio: clean(t.author.description),
            location: null,
            profileUrl: `https://x.com/${t.author.handle}`,
            websites: domains([t.author.website?.expandedUrl, ...(t.author.descriptionUrls ?? []).map((u: Raw) => u.expandedUrl)]),
          },
          query: q.query,
        }));

    case "socialdatax_x":
      return (raw.items ?? [])
        .filter((t: Raw) => t.author?.username && t.post_type !== "repost")
        .map((t: Raw) => ({
          platform: "x",
          provider,
          url: t.post_url,
          publishedAt: new Date(Number(t.publish_time) * 1000).toISOString(),
          text: clean(t.text),
          author: {
            platform: "x",
            handle: t.author.username.toLowerCase(),
            name: t.author.name ?? t.author.username,
            bio: clean(t.author.bio),
            location: t.author.location || null,
            profileUrl: t.author.profile_url ?? `https://x.com/${t.author.username}`,
            websites: domains([t.author.external_url]),
          },
          query: q.query,
        }));

    case "apify_linkedin":
      return (raw.items ?? [])
        .filter((p: Raw) => p.author?.type === "profile" && p.author?.publicIdentifier)
        .map((p: Raw) => ({
          platform: "linkedin",
          provider,
          url: p.linkedinUrl ?? p.shareLinkedinUrl,
          publishedAt: p.postedAt?.date ?? new Date(p.postedAt?.timestamp ?? 0).toISOString(),
          text: clean(p.content),
          author: {
            platform: "linkedin",
            handle: p.author.publicIdentifier.toLowerCase(),
            name: p.author.name,
            bio: clean(p.author.info),
            location: null,
            profileUrl: `https://www.linkedin.com/in/${p.author.publicIdentifier}`,
            websites: domains([p.author.website]),
          },
          query: q.query,
        }));

    case "apify_substack":
      return (raw.items ?? [])
        .filter((p: Raw) => p.authorHandle)
        .map((p: Raw) => ({
          platform: "substack",
          provider,
          url: p.url,
          publishedAt: p.publishedAt,
          text: clean([p.title, p.subtitle ?? p.description, p.truncatedBodyText].filter(Boolean).join(" — ")),
          author: {
            platform: "substack",
            handle: p.authorHandle.toLowerCase(),
            name: p.authorName ?? p.authorHandle,
            bio: clean(p.authorBio),
            location: null,
            profileUrl: `https://substack.com/@${p.authorHandle}`,
            websites: domains([p.publicationUrl, p.url]),
          },
          query: q.query,
        }));

    default:
      return [];
  }
}

// We don't collect contact details, even ones people put in public bios.
function clean(s: unknown): string {
  if (typeof s !== "string") return "";
  return s
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email removed]")
    // Phone-shaped only (415-555-1234, +1 (415) 555 1234); dates and ids stay.
    .replace(/(?:\+\d{1,3}[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g, "[phone removed]")
    .replace(/\s+/g, " ")
    .trim();
}

// Hosts that many unrelated people share; they can't link two accounts.
const SHARED_HOSTS = new Set([
  "t.co", "x.com", "twitter.com", "linkedin.com", "substack.com", "github.com",
  "linktr.ee", "youtube.com", "medium.com", "bit.ly", "notion.site", "beacons.ai",
]);

function domains(urls: unknown[]): string[] {
  const out = new Set<string>();
  for (const u of urls) {
    if (typeof u !== "string" || !u) continue;
    try {
      const host = new URL(u).hostname.replace(/^www\./, "").toLowerCase();
      if (!SHARED_HOSTS.has(host)) out.add(host);
    } catch {
      // not a URL
    }
  }
  return [...out];
}
