// Real values from the live Telem runs captured for the demo on 2026-11-14 (video/capture/run-*.json and seoul-board.json).
// Do not edit these by hand: public results must match what the app returned.

export const KOREAN_QUERIES = [
  "Korean language practice speaking practice travel language prep",
  "free Korean speaking practice travel language prep",
  "Korean conversation practice ordering food cafe travel language prep",
  "beginner Korean speaking practice evenings travel language prep",
  "Korean language exchange speaking practice travel language prep",
];

/** Providers with results for the Korean run, as the app's run page lists them. */
export const PROVIDERS: { name: string; count: number; social?: boolean }[] = [
  { name: "perplexity", count: 15 },
  { name: "brave", count: 25 },
  { name: "exa", count: 25 },
  { name: "tavily", count: 10 },
  { name: "parallel", count: 10 },
  { name: "ceramic", count: 10 },
  { name: "seltz", count: 10 },
  { name: "apify_facebook", count: 6, social: true },
];

export const PAGES_READ = ["lingualive.ai", "mylanguageexchange.com", "ashleybaek.com", "tryspeak.ai"];
export const UNIQUE_URLS = 80;

export const HELPERS = [
  "Korean learner or native speaker willing to do casual speaking drills",
  "Language-exchange partner who wants reading help in return",
  "Travel language prep partner focused on restaurant and cafe phrases",
];

export type Post = { author: string; platform: string; about: string; reason: string; quote: string; date: string; intention: string };

export const POSTS: Record<"boredmom" | "edinburgh" | "memonadri", Post> = {
  boredmom: {
    author: "BoredMom",
    platform: "Facebook",
    about: "Recent traveler back from South Korea",
    reason: "The author says vegetarian options are easy to find in Seoul and names specific dishes, helping identify vegetarian-friendly choices.",
    quote: "We are back from our trip to South Korea",
    date: "Jul 5, 2023",
    intention: "Find vegetarian Seoul dishes",
  },
  edinburgh: {
    author: "Learn.korean.edinburgh",
    platform: "Facebook",
    about: "A Korean learner or teacher sharing trip phrases and speaking practice.",
    reason: "This post gives a simple restaurant phrase and explicitly centers speaking practice before a trip, matching the need to say basic orders out loud.",
    quote: "Restaurant: 이거 주세요 (I'll have this, please)",
    date: "Sep 11, 2026",
    intention: "Practice Korean speaking",
  },
  memonadri: {
    author: "Memonadri",
    platform: "Facebook",
    about: "Korean language teacher from Korea.",
    reason: "The author says they taught ordering food and drinks in Korea, which directly matches needing practical spoken order help for travel.",
    quote: "we practiced how to order food and drinks in Korea.",
    date: "Jun 22, 2026",
    intention: "Practice Korean speaking",
  },
};

/** A quote the app confirmed on a fetched page (Sources tab, Korean run). */
export const PAGE_QUOTE = { source: "lingualive.ai", quote: "10 free minutes a day in your first week, then 5 a day" };

export const MEMBERS = ["Ji-woo P.", "Tom R.", "Min-seo L.", "Carla B.", "Bo H.", "Ada L.", "Paul Q.", "Greg A."];
