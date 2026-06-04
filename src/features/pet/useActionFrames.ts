import { useEffect, useState } from "react";
import type { PetCharacterAction, PetCharacterFrame } from "./characterAssets";

type UseActionFramesResult = {
  frame: PetCharacterFrame;
  frameIndex: number;
};

export function useActionFrames(action: PetCharacterAction): UseActionFramesResult {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    setFrameIndex(0);
  }, [action.id]);

  useEffect(() => {
    if (action.frames.length <= 1) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setFrameIndex((current) => {
        const next = current + 1;
        if (next < action.frames.length) {
          return next;
        }
        return action.loop ? 0 : current;
      });
    }, action.frameDurationMs);

    return () => window.clearInterval(interval);
  }, [action]);

  const frames = action.frames;
  const safeIndex = frames.length === 0 ? 0 : frameIndex % frames.length;

  return {
    frame: frames[safeIndex],
    frameIndex: safeIndex,
  };
}
