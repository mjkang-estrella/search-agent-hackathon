import React from "react";
import { AbsoluteFill, Audio, Composition, Sequence, Series, staticFile } from "remotion";
import { Action } from "./scenes/Action";
import { Business } from "./scenes/Business";
import { Close } from "./scenes/Close";
import { Hook } from "./scenes/Hook";
import { Member } from "./scenes/Member";
import { Memory } from "./scenes/Memory";
import { Telem } from "./scenes/Telem";
import { FONT } from "./theme";
import { FPS, HEIGHT, LEAD_FRAMES, ORDER, sceneFrames, TOTAL_FRAMES, WIDTH, type SceneId } from "./timing";
import { Background, Captions } from "./ui";

const SCENES: Record<SceneId, React.FC<{ duration: number }>> = { hook: Hook, memory: Memory, telem: Telem, member: Member, action: Action, business: Business, close: Close };

function Demo({ captions }: { captions: boolean }) {
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Background />
      <Series>
        {ORDER.map((id) => {
          const Scene = SCENES[id];
          const duration = sceneFrames(id);
          return (
            <Series.Sequence key={id} durationInFrames={duration} name={id}>
              <Scene duration={duration} />
              <Sequence from={LEAD_FRAMES} layout="none">
                <Audio src={staticFile(`audio/${id}.mp3`)} />
              </Sequence>
              {captions ? <Captions id={id} offset={LEAD_FRAMES} /> : null}
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
}

export function Root() {
  return (
    <>
      <Composition id="RelayDemo" component={Demo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{ captions: true }} />
      <Composition id="RelayDemoClean" component={Demo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{ captions: false }} />
    </>
  );
}
