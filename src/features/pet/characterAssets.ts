import manifest from "../../assets/characters/minishuya-default/manifest.json";
import type { PetActionState } from "./petActionState";

export type CharacterHitRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PetCharacterActionId = "idle" | "hover" | "dragging" | "petting" | "sleepy" | "menuOpen";

export type PetCharacterFrame = {
  key: string;
  src: string;
};

export type PetCharacterAction = {
  id: PetCharacterActionId;
  frames: PetCharacterFrame[];
  frameDurationMs: number;
  loop: boolean;
};

export type PetCharacterManifest = {
  id: string;
  displayName: string;
  size: {
    width: number;
    height: number;
  };
  defaultAction: PetCharacterActionId;
  actions: Record<PetCharacterActionId, PetCharacterAction>;
  stateMap: Record<PetActionState, PetCharacterActionId>;
};

const frameModules = import.meta.glob(
  "../../assets/characters/minishuya-default/frames/*.png",
  {
    eager: true,
    import: "default",
  },
) as Record<string, string>;

const frameSources = Object.fromEntries(
  Object.entries(frameModules).map(([path, src]) => {
    const segments = path.split("/");
    return [`frames/${segments[segments.length - 1]}`, src];
  }),
);

function frameKey(path: string): string {
  return path.replace(/^frames\//, "").replace(/\.png$/, "");
}

function actionFromManifest(id: PetCharacterActionId): PetCharacterAction {
  const action = manifest.actions[id];

  return {
    id,
    frames: action.frames.map((path) => ({
      key: frameKey(path),
      src: frameSourceFor(path),
    })),
    frameDurationMs: action.frameDurationMs,
    loop: action.loop,
  };
}

function frameSourceFor(path: string): string {
  const source = frameSources[path];
  if (!source) {
    throw new Error(`Missing frame source for ${path}`);
  }

  return source;
}

export const minishuyaDefaultCharacter: PetCharacterManifest = {
  id: manifest.id,
  displayName: manifest.displayName,
  size: manifest.size,
  defaultAction: manifest.defaultAction as PetCharacterActionId,
  actions: {
    idle: actionFromManifest("idle"),
    hover: actionFromManifest("hover"),
    dragging: actionFromManifest("dragging"),
    petting: actionFromManifest("petting"),
    sleepy: actionFromManifest("sleepy"),
    menuOpen: actionFromManifest("menuOpen"),
  },
  stateMap: manifest.stateMap as Record<PetActionState, PetCharacterActionId>,
};

export function actionForPetState(
  character: PetCharacterManifest,
  state: PetActionState,
): PetCharacterAction {
  const actionId = character.stateMap[state];
  return character.actions[actionId] ?? character.actions[character.defaultAction];
}

export function frameForAction(
  character: PetCharacterManifest,
  actionId: PetCharacterActionId,
  frameIndex: number,
): PetCharacterFrame {
  const action = character.actions[actionId] ?? character.actions[character.defaultAction];
  const frames =
    action.frames.length > 0 ? action.frames : character.actions[character.defaultAction].frames;

  return frames[frameIndex % frames.length];
}

export function petCharacterImageFor(state: PetActionState): string {
  return actionForPetState(minishuyaDefaultCharacter, state).frames[0].src;
}
