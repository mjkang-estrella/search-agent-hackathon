// Captures the app screens used in the video, plus element boxes (CSS px at 1600x900) for zoom targets.
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import type { Locator } from "playwright";
import { open } from "./pw";
const BASE = "http://localhost:3000";
const RUN_KOR = "ks782zbn0gmsh6zcvs97f8rgkn8j65gr";
const boxes: Record<string, Record<string, { x: number; y: number; width: number; height: number }>> =
  existsSync("public/shots/boxes.json") ? JSON.parse(readFileSync("public/shots/boxes.json", "utf8")) : {};
const { browser, page } = await open({ storage: "capture/state.json" });
async function s(name: string, targets: Record<string, Locator> = {}, full = false) {
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `public/shots/${name}.png`, fullPage: full });
  boxes[name] = {};
  for (const [k, loc] of Object.entries(targets)) {
    const b = await loc.first().boundingBox({ timeout: 4000 }).catch(() => null);
    const scroll = await page.evaluate(() => scrollY);
    if (b) boxes[name][k] = { ...b, y: b.y + (full ? scroll : 0) };
  }
  console.log("saved", name, Object.keys(boxes[name]));
}
const card = (text: string) => page.locator("article, section > div, li").filter({ hasText: text });

await page.goto(BASE, { waitUntil: "networkidle" });
await page.getByText("Plan Seoul trip").first().click();
await page.getByText("Find vegetarian Seoul dishes").first().click();
await s("dash-veg", { boredmom: page.locator("article").filter({ hasText: "BoredMom" }), olga: page.locator("article").filter({ hasText: "Olga Frangella" }), intentions: page.getByText("What you want").locator("..") });
await page.getByText("Practice Korean speaking").first().click();
await s("dash-kor", {
  idea: page.getByText("Idea for you").locator("xpath=ancestor::*[contains(@class,'rounded')][1]"),
  jiwoo: page.locator("article, div.rounded-2xl").filter({ hasText: "Looking for" }),
  post: page.locator("article").filter({ hasText: "Learn.korean.edinburgh" }),
  memory: page.getByText("Grok saved").locator(".."),
}, true);

await page.goto(`${BASE}/r/${RUN_KOR}`, { waitUntil: "networkidle" });
await page.getByText(/\d+ searches/).click();
await s("run-kor-telem-full", { telem: page.getByText(/^searches$/i).locator("xpath=ancestor::*[contains(@class,'rounded')][1]") }, true);
await page.getByText(/\d+ searches/).click();
await page.getByText(/\d+ fit/).click();
await s("run-kor-check-full", { check: page.getByText("Ji-woo P.").locator("xpath=ancestor::*[contains(@class,'rounded')][1]") }, true);

await page.goto(BASE, { waitUntil: "networkidle" });
await page.getByText("Guided discovery").click();
await page.waitForTimeout(1200);
await page.getByText(/other things noticed/).click();
await page.getByRole("button", { name: "Practice Korean speaking" }).click();
await page.getByText("See why").click();
await s("guided-why", { quotes: page.locator("blockquote, p").filter({ hasText: "mind went blank" }).locator(".."), title: page.getByRole("heading", { name: "Practice Korean speaking" }) });
await page.getByText("That's right").click();
await page.waitForTimeout(1500);
await page.getByText("Draft an intro").first().click();
await s("guided-draft", { draft: page.locator("textarea"), copy: page.getByText("Copy message") });

// Ji-woo intro: say hi, then the sample acceptance.
await page.goto(BASE, { waitUntil: "networkidle" });
await page.getByText("Plan Seoul trip").first().click();
await page.getByText("Practice Korean speaking").first().click();
const banner = page.getByText("Idea for you").locator("xpath=ancestor::*[contains(@class,'rounded')][1]");
const hi = banner.getByRole("button", { name: "Say hi" });
if (await hi.count()) { await hi.click(); await page.waitForTimeout(2500); }
await s("dash-kor-intro", { idea: banner });
console.log(await banner.innerText());
const accept = banner.getByRole("button", { name: /accept/i });
if (await accept.count()) { await accept.click(); await page.waitForTimeout(2000); await s("dash-kor-accepted", { idea: banner }); console.log(await banner.innerText()); }

writeFileSync("public/shots/boxes.json", JSON.stringify(boxes, null, 1));
await browser.close();
