import { chromium, type Page } from "playwright";
import { existsSync } from "node:fs";
export const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`;
export const HIDE_DEV = "nextjs-portal{display:none!important}";
export async function open(opts: { video?: string; storage?: string } = {}) {
  const browser = await chromium.launch({ executablePath: CHROME });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 900 }, deviceScaleFactor: opts.video ? 1 : 2, colorScheme: "light",
    storageState: opts.storage && existsSync(opts.storage) ? opts.storage : undefined,
    recordVideo: opts.video ? { dir: opts.video, size: { width: 1600, height: 900 } } : undefined,
  });
  await ctx.addInitScript((css) => {
    addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.append(s); });
  }, HIDE_DEV);
  const page = await ctx.newPage();
  return { browser, ctx, page };
}
export const shot = (page: Page, name: string) => page.screenshot({ path: `public/shots/${name}.png` });
