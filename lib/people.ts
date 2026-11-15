import { z } from "zod";
import { quoteExists } from "./rules";

/** Only explicit author image fields qualify as portraits. Post thumbnails do not. */
const authorMetadata = z.object({
  avatar_url: z.string().nullish(),
  profile_image_url_https: z.string().nullish(),
  profile_image_url: z.string().nullish(),
  profile_pic_url: z.string().nullish(),
  avatar: z.string().nullish(),
  avatarLarger: z.string().nullish(),
  avatarMedium: z.string().nullish(),
  profile_url: z.string().nullish(),
  profileUrl: z.string().nullish(),
}).passthrough();
const enrichmentsMetadata = z.object({
  author: authorMetadata.nullish(),
  user: authorMetadata.nullish(),
  authorMeta: authorMetadata.nullish(),
  author_avatar_url: z.string().nullish(),
  author_profile_url: z.string().nullish(),
});

export function publicHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function authorLinks(source: unknown, enrichments: unknown) {
  const direct = authorMetadata.safeParse(source).data;
  const extra = enrichmentsMetadata.safeParse(enrichments).data;
  const author = extra?.author ?? extra?.user ?? extra?.authorMeta;
  const avatarUrl = [direct, author].flatMap((a) => a ? [a.avatar_url, a.profile_image_url_https, a.profile_image_url, a.profile_pic_url, a.avatar, a.avatarLarger, a.avatarMedium] : [])
    .concat(extra?.author_avatar_url).map(publicHttpUrl).find(Boolean) ?? null;
  const profileUrl = [direct?.profile_url, direct?.profileUrl, author?.profile_url, author?.profileUrl, extra?.author_profile_url]
    .map(publicHttpUrl).find(Boolean) ?? null;
  return { avatarUrl, profileUrl };
}

const recordedPosts = z.object({ hits: z.array(z.object({ url: z.string(), snippet: z.string().nullish() })) });

export function recordedPostPreviews(response: unknown): Map<string, string> {
  const parsed = recordedPosts.safeParse(response);
  return new Map(parsed.success ? parsed.data.hits.flatMap((h) => h.snippet ? [[h.url, h.snippet]] : []) : []);
}

export function cleanPostText(text: string | null | undefined): string {
  return (text ?? "").normalize("NFKC").replace(/[\u{10000}-\u{10FFFF}]/gu, "").replace(/[\u0000-\u001f\\"]/g, " ").replace(/\s+/g, " ").trim();
}

export function personExplanation(post: { title: string | null; snippet: string | null }, pick: { reason: string | null; about?: string | null; evidenceQuote?: string }) {
  const matchChecked = !!pick.reason && (quoteExists(pick.evidenceQuote ?? null, cleanPostText(post.snippet)) || quoteExists(pick.evidenceQuote ?? null, cleanPostText(post.title)));
  return {
    matchChecked,
    reason: matchChecked && pick.reason ? pick.reason : undefined,
    about: matchChecked ? pick.about ?? undefined : undefined,
    evidenceQuote: matchChecked ? pick.evidenceQuote : undefined,
  };
}

/** A first message to the author of a public post. The person edits it and sends it themselves. */
export function introDraft(person: { author: string | null; evidenceQuote?: string | null; excerpt?: string | null; title: string }, aim: string | null | undefined) {
  const first = (person.author || "there").split(" ")[0];
  const context = person.evidenceQuote || person.excerpt || person.title;
  // The aim is a full sentence ("Get help ..."). Lowercase its first letter and drop its period to fit "I'm looking to ...".
  const raw = (aim || "connect").trim().replace(/[.!\s]+$/, "");
  const goal = raw.charAt(0).toLowerCase() + raw.slice(1);
  return `Hi ${first}, I came across your post${context ? `: "${context.slice(0, 300)}"` : "."}\n\nI'm looking to ${goal}. Would you be open to a conversation?`;
}
