// Pure rules shared by Convex functions, scripts, and tests. No framework imports.
import type { ConstraintResult, FitCategory } from "./contracts";

/** Collapse whitespace and unify quote characters so a copied quote matches its source. */
export function normalizeText(text: string): string {
  return text
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** True when the quote occurs in the source after normalization. Proves existence, not support. */
export function quoteExists(quote: string | null, source: string | null): boolean {
  if (!quote || !source) return false;
  const q = normalizeText(quote).replace(/^["'.\s]+|["'.\s]+$/g, "");
  if (q.length < 4) return false;
  return normalizeText(source).includes(q);
}

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/;
const URL_RE = /https?:\/\//i;
const STREET = /\b\d{1,5}\s+\w+\s+(st|street|ave|avenue|rd|road|blvd|lane|ln|dr|drive)\b/i;

/**
 * Check an outbound public query. Returns null when allowed, or the reason it was rejected.
 * This is a field-level guard for known identifiers, not a guarantee against every disclosure.
 */
export function guardQuery(query: string, blockedTerms: string[]): string | null {
  const q = query.trim();
  if (q.length < 3) return "Query is empty";
  if (q.length > 300) return "Query is longer than 300 characters";
  if (EMAIL.test(q)) return "Contains an email address";
  if (PHONE.test(q)) return "Contains a phone number";
  if (URL_RE.test(q)) return "Contains a URL";
  if (STREET.test(q)) return "Contains a street address";
  const lower = normalizeText(q);
  for (const term of blockedTerms) {
    const t = normalizeText(term);
    if (t.length >= 2 && new RegExp(`(^|\\W)${escapeRegExp(t)}($|\\W)`).test(lower)) {
      return `Contains blocked term "${term}"`;
    }
  }
  return null;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Normalize a URL for deduplication. Keeps path and query, drops fragment, "www.", and trailing slash. */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const path = u.pathname.replace(/\/+$/, "") || "";
    const params = [...u.searchParams.entries()]
      .filter(([k]) => !/^utm_|^ref$|^sort$/.test(k))
      .sort(([a], [b]) => a.localeCompare(b));
    const query = params.length ? "?" + new URLSearchParams(params).toString() : "";
    return `${host}${path}${query}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

export type SearchHit = { url: string; title: string | null; snippet: string | null; provider: string; query: string; rank: number; author?: string | null; publishedAt?: string | null };
export type MergedSource = {
  url: string;
  normalizedUrl: string;
  title: string | null;
  snippet: string | null;
  hits: { provider: string; query: string; rank: number }[];
};

/** Merge hits by normalized URL. Keeps every provider/query attribution. */
export function mergeHits(hits: SearchHit[]): MergedSource[] {
  const byUrl = new Map<string, MergedSource>();
  for (const h of hits) {
    const key = normalizeUrl(h.url);
    const existing = byUrl.get(key);
    if (existing) {
      existing.hits.push({ provider: h.provider, query: h.query, rank: h.rank });
      if (!existing.title && h.title) existing.title = h.title;
      if ((!existing.snippet || existing.snippet.length < 40) && h.snippet) existing.snippet = h.snippet;
    } else {
      byUrl.set(key, {
        url: h.url,
        normalizedUrl: key,
        title: h.title,
        snippet: h.snippet,
        hits: [{ provider: h.provider, query: h.query, rank: h.rank }],
      });
    }
  }
  return [...byUrl.values()];
}

/** Order merged sources for model review: more distinct queries, then providers, then best rank. */
export function scoreSource(s: MergedSource): number {
  const queries = new Set(s.hits.map((h) => h.query)).size;
  const providers = new Set(s.hits.map((h) => h.provider)).size;
  const bestRank = Math.min(...s.hits.map((h) => h.rank));
  // Social and login-walled pages rarely return readable conditions, so they are read last.
  const host = s.normalizedUrl.split("/")[0];
  const walled = WALLED_HOSTS.some((w) => host === w || host.endsWith(`.${w}`));
  return queries * 3 + providers - bestRank * 0.25 - (walled ? 8 : 0);
}

const WALLED_HOSTS = ["facebook.com", "instagram.com", "x.com", "twitter.com", "tiktok.com", "linkedin.com", "pinterest.com", "youtube.com"];

/**
 * Fit category from constraint results.
 * A hard conflict means not a fit. A hard unknown caps the option at possible fit.
 */
export function fitFromConstraints(
  proposed: FitCategory,
  results: { constraint: string; result: ConstraintResult }[],
  hardLabels: string[],
): { fit: FitCategory; hardConflict: string | null } {
  const isHard = (c: string) => hardLabels.some((h) => normalizeText(c).includes(normalizeText(h)) || normalizeText(h).includes(normalizeText(c)));
  const conflict = results.find((r) => r.result === "conflicts" && isHard(r.constraint));
  if (conflict) return { fit: "not_a_fit", hardConflict: conflict.constraint };
  const hardUnknown = results.some((r) => r.result === "unknown" && isHard(r.constraint));
  if (hardUnknown && proposed === "strong_fit") return { fit: "possible_fit", hardConflict: null };
  return { fit: proposed, hardConflict: null };
}

export const FIT_ORDER: Record<FitCategory, number> = { strong_fit: 0, possible_fit: 1, not_a_fit: 2 };

/** True when most letters are Latin script. Used to keep people results readable for an English-speaking demo. */
export function mostlyLatin(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return false;
  const latin = letters.filter((ch) => /\p{Script=Latin}/u.test(ch)).length;
  return latin / letters.length >= 0.7;
}
