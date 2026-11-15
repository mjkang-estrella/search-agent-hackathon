// Prints the absolute frame of a scene cue, for rendering stills: npx tsx scripts/frames.ts
import { ORDER, sceneFrames, cue, type SceneId } from "../src/timing";
let start = 0;
const starts: Record<string, number> = {};
for (const id of ORDER) { starts[id] = start; start += sceneFrames(id); }
console.log("total", start, (start / 30).toFixed(1) + "s");
const at = (id: SceneId, phrase: string, o = 0) => starts[id] + cue(id, phrase, o);
console.log(JSON.stringify(starts));
const list: [SceneId, string, number][] = process.argv.length > 2 ? [] : [
  ["hook", "freeze", 30], ["hook", "figure out", 30], ["hook", "useful connections", 30],
  ["memory", "can't afford a tutor", 30], ["memory", "free speaking practice", 40],
  ["telem", "first relay", 70], ["telem", "like free korean", 30], ["telem", "reads the most promising", 40], ["telem", "link to the original", 20],
  ["telem", "telem retrieves", 50], ["telem", "whether that person", 40],
  ["member", "she speaks korean", 0], ["member", "us evenings", 40], ["member", "kdrama fan", 30], ["member", "each person", 30],
  ["action", "choose a next step", 0], ["action", "choose a next step", 40], ["action", "grounded", 20], ["action", "or from the demo", 30], ["action", "end to end", 20],
  ["business", "exchange communities", 30], ["business", "community organizers", 20], ["business", "help each other", 0], ["business", "neighborhood projects", 30],
  ["close", "understanding", 10], ["close", "something you can do", 30],
];
console.log(list.map(([id, p, o]) => `${id}-${p.replace(/\W+/g, "_")}:${at(id, p, o)}`).join("\n"));
