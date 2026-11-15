import { open, shot } from "./pw";
const { browser, ctx, page } = await open({ storage: "capture/state.json" });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.getByText("Try Dana's sample memories").click();
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(5000);
  await shot(page, `01-start-${i}`);
  console.log(`--- ${i}\n` + (await page.locator("main").innerText()).slice(0, 800));
}
await ctx.storageState({ path: "capture/state.json" });
await browser.close();
