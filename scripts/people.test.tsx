import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { authorLinks, personExplanation, publicHttpUrl, recordedPostPreviews } from "../lib/people";
import { demoPortrait } from "../lib/demo-portraits";
import { MEMBERS } from "../convex/fixtures/data";
import { EXTRA_MEMBERS } from "../convex/fixtures/persona";
import { normalizeSearch } from "../convex/telem";
import { PublicPersonCard } from "../components/public-person-card";
import type { ComponentProps } from "react";

test("every sample member has a distinct local generated portrait", () => {
  const portraits = [...MEMBERS, ...EXTRA_MEMBERS].map((m) => {
    const path = demoPortrait(m.key);
    assert.ok(path && existsSync(`public${path}`), m.key);
    const bytes = readFileSync(`public${path}`);
    assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
    return path;
  });
  assert.equal(new Set(portraits).size, portraits.length);
  assert.equal(demoPortrait("not-a-demo-member"), null);
});

test("a post thumbnail is never used as the author's face", () => {
  assert.deepEqual(authorLinks({ author: "someone", thumbnail: "https://example.com/post.jpg" }, { thumbnail: "https://example.com/post.jpg" }), { avatarUrl: null, profileUrl: null });
});

test("explicit author portraits survive Telem normalization", () => {
  const response = normalizeSearch({ preprocessor_runs: [{ preprocessor_name: "fetchlayer_x", status: "succeeded", output_payload: { results: [{ url: "https://x.com/example/status/123", source: { author: "Example" }, enrichments: { user: { profile_image_url_https: "https://images.example.com/avatar.jpg", profile_url: "https://x.com/example" } } }] } }] }, ["vegetarian travel"], 10);
  assert.equal(response.hits[0].avatarUrl, "https://images.example.com/avatar.jpg");
  assert.equal(response.hits[0].profileUrl, "https://x.com/example");
});

test("unsafe image and profile URLs are discarded", () => {
  for (const value of ["javascript:alert(1)", "data:image/png;base64,abc", "https://name:secret@example.com", "/someone", "not a URL"]) assert.equal(publicHttpUrl(value), null);
  assert.equal(authorLinks({ avatar_url: "javascript:alert(1)" }, null).avatarUrl, null);
});

const post = { title: "My Seoul trip", snippet: "I spent ten days in Seoul finding vegetarian restaurants and learning the subway." };
test("a recommendation keeps its source evidence separate from its explanation", () => {
  const result = personExplanation(post, { reason: "Their vegetarian food experience relates to your Seoul trip.", about: "Recently visited Seoul as a vegetarian", evidenceQuote: "finding vegetarian restaurants" });
  assert.equal(result.matchChecked, true);
  assert.equal(result.evidenceQuote, "finding vegetarian restaurants");
  assert.ok(result.reason);
});

test("title-only provider results can support a match without inventing a snippet", () => {
  const result = personExplanation({ title: "I found vegetarian restaurants in Seoul", snippet: null }, { reason: "Their post covers vegetarian food in Seoul.", evidenceQuote: "vegetarian restaurants in Seoul" });
  assert.equal(result.matchChecked, true);
});

test("invented quotes and failed model picks remain unverified leads", () => {
  for (const pick of [{ reason: "They can help", about: "Professional guide", evidenceQuote: "I offer free tours" }, { reason: null }, { reason: "A legacy reason without evidence" }]) {
    const result = personExplanation(post, pick);
    assert.equal(result.matchChecked, false);
    assert.equal(result.reason, undefined);
    assert.equal(result.about, undefined);
    assert.equal(result.evidenceQuote, undefined);
  }
});

test("older demos recover only source previews from recordings", () => {
  assert.equal(recordedPostPreviews({ hits: [{ url: "https://example.com", snippet: post.snippet, query: "not returned" }] }).get("https://example.com"), post.snippet);
  assert.equal(recordedPostPreviews(undefined).size, 0);
});

const person: ComponentProps<typeof PublicPersonCard>["person"] = {
  _id: "person-id" as ComponentProps<typeof PublicPersonCard>["person"]["_id"], platform: "X", url: "https://x.com/example/status/123", author: "Example", title: post.title,
  reason: "Their experience relates to your trip.", about: "Vegetarian traveler", excerpt: post.snippet, evidenceQuote: "finding vegetarian restaurants", matchChecked: true,
  avatarUrl: null, profileUrl: null, publishedAt: "2026-11-01",
};
test("person card shows identity, reason, evidence, date, and a labeled source link", () => {
  const html = renderToStaticMarkup(<PublicPersonCard person={person} />);
  for (const text of ["Example", "Vegetarian traveler", "Why this fits", person.reason!, person.evidenceQuote!, "Nov 1, 2026", "View post by Example on X"]) assert.ok(html.includes(text), text);
});

test("old results and missing photos render without initials or a checked-match claim", () => {
  const html = renderToStaticMarkup(<PublicPersonCard person={{ ...person, avatarUrl: null, about: null, evidenceQuote: null, matchChecked: false, reason: null, publishedAt: "bad-date", author: null }} />);
  assert.ok(html.includes("Public author"));
  assert.ok(html.includes("Potential match"));
  assert.ok(html.includes(post.snippet));
  assert.ok(!html.includes("Why this fits"));
  assert.ok(!html.includes("Invalid Date"));
});
