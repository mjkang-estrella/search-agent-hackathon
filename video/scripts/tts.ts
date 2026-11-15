// Generates one narration clip per scene with ElevenLabs, plus word timings for captions.
// Usage: ELEVENLABS_API_KEY=... npx tsx scripts/tts.ts [sceneId ...]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

type Scene = { id: string; text: string };
const { voiceId, modelId, scenes } = JSON.parse(readFileSync("narration.json", "utf8")) as { voiceId: string; modelId: string; scenes: Scene[] };
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("Set ELEVENLABS_API_KEY");
const only = process.argv.slice(2);
mkdirSync("public/audio", { recursive: true });

for (const [i, scene] of scenes.entries()) {
  if (only.length && !only.includes(scene.id)) continue;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      text: scene.text,
      model_id: modelId,
      // Neighboring text keeps the intonation continuous across separate clips.
      previous_text: scenes[i - 1]?.text,
      next_text: scenes[i + 1]?.text,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true, speed: 1.0 },
    }),
  });
  if (!res.ok) throw new Error(`${scene.id}: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { audio_base64: string; alignment: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] } };
  writeFileSync(`public/audio/${scene.id}.mp3`, Buffer.from(body.audio_base64, "base64"));

  // Collapse character timings into words.
  const a = body.alignment;
  const words: { text: string; start: number; end: number }[] = [];
  let cur: { text: string; start: number; end: number } | null = null;
  a.characters.forEach((ch, j) => {
    if (/\s/.test(ch)) { if (cur) words.push(cur); cur = null; return; }
    if (!cur) cur = { text: "", start: a.character_start_times_seconds[j], end: 0 };
    cur.text += ch;
    cur.end = a.character_end_times_seconds[j];
  });
  if (cur) words.push(cur);
  writeFileSync(`public/audio/${scene.id}.json`, JSON.stringify({ duration: a.character_end_times_seconds.at(-1), words }, null, 1));
  console.log(scene.id, "done", a.character_end_times_seconds.at(-1)?.toFixed(1), "s");
}
