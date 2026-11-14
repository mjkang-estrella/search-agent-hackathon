// Shapes for public people discovery. Everything here comes from public
// posts; nothing is inferred yet.

export type Platform = "x" | "linkedin" | "substack";

export interface PublicAuthor {
  platform: Platform;
  // Stable per-platform id: X handle, LinkedIn public identifier, Substack handle.
  handle: string;
  name: string;
  bio: string;
  // Only when the platform returns it (socialdatax_x does; fetchlayer_x does not).
  location: string | null;
  profileUrl: string;
  // Domains the author links from their profile. Used to connect accounts.
  websites: string[];
}

export interface PublicPost {
  platform: Platform;
  provider: string;
  url: string;
  publishedAt: string; // ISO
  text: string;
  author: PublicAuthor;
  // The plan query that found this post, kept for the evidence trail.
  query: string;
}

export interface Person {
  id: string;
  accounts: PublicAuthor[];
  posts: PublicPost[];
  // Why accounts were merged, when more than one.
  linkedBy: string[];
}

export interface SearchQuery {
  platform: Platform;
  query: string;
  why: string;
}

export interface QueryOutcome {
  query: SearchQuery;
  provider: string | null;
  status: "ok" | "failed";
  tried: { provider: string; httpStatus: number; reason?: string }[];
  returned: number;
  kept: number;
  droppedOld: number;
  ms: number;
}
