import { open } from "./pw";
const BASE = "http://localhost:3000";
const RUN_KOR = "ks782zbn0gmsh6zcvs97f8rgkn8j65gr", RUN_VEG = "ks7cmh5zq1y8ns3cj5257mkpy58j7702";
const { browser, page } = await open({ storage: "capture/state.json" });
const s = async (name: string, full = false) => { await page.waitForTimeout(900); await page.screenshot({ path: `public/shots/${name}.png`, fullPage: full }); console.log("saved", name); };

// Fresh landing
{ const f = await open(); await f.page.goto(BASE, { waitUntil: "networkidle" }); await f.page.waitForTimeout(1500);
  await f.page.screenshot({ path: "public/shots/landing.png" }); await f.browser.close(); }

// Dashboard: Seoul memory, each intention
await page.goto(BASE, { waitUntil: "networkidle" });
await page.getByText("Plan Seoul trip").first().click();
await page.getByText("Find vegetarian Seoul dishes").first().click();
await s("dash-veg"); await s("dash-veg-full", true);
await page.getByText("Practice Korean speaking").first().click();
await s("dash-kor"); await s("dash-kor-full", true);
await page.getByRole("button", { name: "Details" }).first().click().catch(() => {});
await s("dash-kor-details-full", true);

// Run pages
for (const [name, run] of [["run-kor", RUN_KOR], ["run-veg", RUN_VEG]] as const) {
  await page.goto(`${BASE}/r/${run}`, { waitUntil: "networkidle" });
  await s(name);
  await page.getByText(/\d+ searches/).click();
  await s(`${name}-telem-full`, true);
  await page.getByText(/\d+ searches/).click();
  const members = page.getByText(/\d+ matched/);
  if (await members.count()) { await members.click(); await s(`${name}-members-full`, true); await members.click(); }
  await page.getByText(/\d+ fit/).click().catch(() => {});
  await s(`${name}-check-full`, true);
  await page.goto(`${BASE}/r/${run}/evidence`, { waitUntil: "networkidle" });
  await s(`${name}-evidence`); await s(`${name}-evidence-full`, true);
}

// Guided flow on the Korean intention
await page.goto(BASE, { waitUntil: "networkidle" });
await page.getByText("Guided discovery").click();
await page.waitForTimeout(1200);
await page.getByText(/other things noticed/).click();
await page.getByRole("button", { name: "Practice Korean speaking" }).click();
await s("guided-intention");
await page.getByText("See why").click();
await s("guided-why");
await page.getByText("That's right").click();
await page.waitForTimeout(1500);
await s("guided-results"); await s("guided-results-full", true);
await page.getByText("See details & next step").first().click();
await s("guided-jiwoo-full", true);
await page.getByText("Draft an intro").first().click();
await page.waitForTimeout(1500);
await s("guided-draft");
console.log(await page.locator("main").innerText());
await browser.close();
