import { open, shot } from "./pw";
const { browser, ctx, page } = await open();
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForTimeout(4000);
await shot(page, "00-landing");
console.log(await page.locator("body").innerText());
await ctx.storageState({ path: "capture/state.json" });
await browser.close();
