// Renders stills at the given frames: npx tsx scripts/stills.ts name:frame ...
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const browserExecutable = `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell`;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "RelayDemo", browserExecutable });
for (const arg of process.argv.slice(2)) {
  const [name, frame] = arg.split(":");
  await renderStill({ serveUrl, composition, frame: Number(frame), output: `out/stills/${name}.png`, browserExecutable, imageFormat: "png" });
  console.log("still", name, frame);
}
