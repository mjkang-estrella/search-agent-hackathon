# Demo video

A 2:52 demo video built with [Remotion](https://www.remotion.dev/). ElevenLabs reads the narration. The scenes mix animated recreations of the app's cards with screenshots of the running app.

All public results come from a live Telem run on November 14, 2026. They are stored in `src/data.ts` and `capture/run-*.json`. Members and the acceptance step are samples, and the video labels them that way.

## Layout

| Path | Contents |
| --- | --- |
| `narration.json` | Script, voice, and model for each scene |
| `scripts/tts.ts` | Generates `public/audio/<scene>.mp3` and word timings |
| `capture/*.ts` | Playwright scripts that capture app screenshots into `public/shots/` |
| `src/timing.ts` | Scene lengths and `cue()`, which finds the frame where a phrase is spoken |
| `src/scenes/` | One component per scene |

## Regenerate

Run these commands from `video/`.

1. Install dependencies with `npm install`.
2. To change the narration, edit `narration.json` and run `ELEVENLABS_API_KEY=<key> npx tsx scripts/tts.ts [sceneId ...]`. Scene lengths and cues follow the new audio automatically. If a phrase passed to `cue()` is no longer spoken, the build fails and names the phrase.
3. To recapture screenshots, start the app with `npm run dev` in the repository root, then run `npx tsx capture/final.ts`. The scripts keep the browser session in `capture/state.json`, which git ignores. Without it, start Dana's sample memories first with `npx tsx capture/start.ts`.
4. Preview with `npm run studio`, or render with `npm run render`. The `RelayDemoClean` composition renders the video without captions.

`remotion.config.ts` points to Playwright's headless Chromium. Remove that line to let Remotion download its own browser.
