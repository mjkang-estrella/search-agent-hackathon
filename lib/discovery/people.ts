import type { Person, PublicAuthor, PublicPost } from "./types.ts";

// Group posts by author, then join accounts across platforms only when the
// evidence is explicit: they link the same personal website domain. A
// matching display name alone is never enough.
export function groupIntoPeople(posts: PublicPost[]): Person[] {
  const byAccount = new Map<string, { author: PublicAuthor; posts: PublicPost[] }>();
  const seenUrls = new Set<string>();

  for (const post of posts) {
    if (seenUrls.has(post.url)) continue;
    seenUrls.add(post.url);
    const key = `${post.author.platform}:${post.author.handle}`;
    const entry = byAccount.get(key) ?? { author: post.author, posts: [] };
    // Keep the richest author record (socialdatax_x has location).
    if (!entry.author.location && post.author.location) entry.author = post.author;
    entry.posts.push(post);
    byAccount.set(key, entry);
  }

  // Union-find over accounts that share a personal website domain.
  const keys = [...byAccount.keys()];
  const parent = new Map(keys.map((k) => [k, k]));
  const find = (k: string): string => (parent.get(k) === k ? k : find(parent.get(k)!));
  const reasons = new Map<string, string[]>();
  const domainOwner = new Map<string, string>();

  for (const key of keys) {
    for (const domain of byAccount.get(key)!.author.websites) {
      const other = domainOwner.get(domain);
      if (!other) {
        domainOwner.set(domain, key);
        continue;
      }
      const [a, b] = [find(key), find(other)];
      if (a === b) continue;
      // Two accounts on the same platform sharing a domain are usually a
      // person and their company. Don't merge those.
      if (key.split(":")[0] === other.split(":")[0]) continue;
      parent.set(a, b);
      reasons.set(b, [...(reasons.get(b) ?? []), ...(reasons.get(a) ?? []), `${key} and ${other} both link ${domain}`]);
    }
  }

  const groups = new Map<string, Person>();
  for (const key of keys) {
    const root = find(key);
    const { author, posts: accountPosts } = byAccount.get(key)!;
    const person = groups.get(root) ?? { id: root, accounts: [], posts: [], linkedBy: reasons.get(root) ?? [] };
    person.accounts.push(author);
    person.posts.push(...accountPosts);
    groups.set(root, person);
  }

  for (const p of groups.values()) {
    p.posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }
  return [...groups.values()].sort((a, b) => b.posts.length - a.posts.length);
}
