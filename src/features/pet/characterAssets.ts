import idleImage from "../../assets/characters/minishuya-default/idle.png";
import type { PetActionState } from "./petActionState";

export type PetCharacterManifest = {
  id: string;
  displayName: string;
  size: {
    width: number;
    height: number;
  };
  states: Record<PetActionState, string>;
};

export const minishuyaDefaultCharacter: PetCharacterManifest = {
  id: "minishuya-default",
  displayName: "MiniShuya Default",
  size: {
    width: 150,
    height: 225,
  },
  states: {
    idle: idleImage,
    hover: idleImage,
    pressed: idleImage,
    petting: idleImage,
    dragging: idleImage,
    menuOpen: idleImage,
    sleepy: idleImage,
  },
};

export function petCharacterImageFor(state: PetActionState): string {
  return minishuyaDefaultCharacter.states[state];
}
