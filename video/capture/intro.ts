import { writeFileSync, readFileSync } from "node:fs";
import { open } from "./pw";
const boxes = JSON.parse(readFileSync("public/shots/boxes.json", "utf8"));
const { browser, page } = await open({ storage: "capture/state.json" });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.getByText("Plan Seoul trip").first().click();
await page.getByText("Practice Korean speaking").first().click();
await page.waitForTimeout(1500);
const jiwoo = page.locator("div.rounded-2xl, article").filter({ hasText: "Looking for" }).first();
console.log(await jiwoo.innerText());
await page.screenshot({ path: "public/shots/dash-kor-intro.png" });
const b = await jiwoo.boundingBox();
boxes["dash-kor-intro"] = { jiwoo: b };
const btns = jiwoo.getByRole("button");
console.log(await btns.allInnerTexts());
const accept = jiwoo.getByRole("button", { name: /accept/i });
if (await accept.count()) {
  await accept.first().click(); await page.waitForTimeout(2000);
  console.log(await jiwoo.innerText());
  await page.screenshot({ path: "public/shots/dash-kor-accepted.png" });
  boxes["dash-kor-accepted"] = { jiwoo: await jiwoo.boundingBox() };
}
writeFileSync("public/shots/boxes.json", JSON.stringify(boxes, null, 1));
await browser.close();
