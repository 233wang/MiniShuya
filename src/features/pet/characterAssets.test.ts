import { describe, expect, it } from "vitest";
import {
  actionForPetState,
  frameForAction,
  minishuyaDefaultCharacter,
  type PetCharacterActionId,
} from "./characterAssets";

describe("characterAssets", () => {
  it("maps pet action states to manifest actions", () => {
    expect(actionForPetState(minishuyaDefaultCharacter, "idle").id).toBe("idle");
    expect(actionForPetState(minishuyaDefaultCharacter, "petting").id).toBe("petting");
    expect(actionForPetState(minishuyaDefaultCharacter, "dragging").id).toBe("dragging");
    expect(actionForPetState(minishuyaDefaultCharacter, "draggingRecover").id).toBe(
      "draggingRecover",
    );
    expect(actionForPetState(minishuyaDefaultCharacter, "sleepy").id).toBe("sleepy");
  });

  it("falls back to idle when a mapped action is missing", () => {
    const character = {
      ...minishuyaDefaultCharacter,
      stateMap: {
        ...minishuyaDefaultCharacter.stateMap,
        hover: "missing-action" as PetCharacterActionId,
      },
    };

    expect(actionForPetState(character, "hover").id).toBe("idle");
  });

  it("returns a frame by action and wraps the frame index", () => {
    const firstFrame = frameForAction(minishuyaDefaultCharacter, "idle", 0);
    const wrappedFrame = frameForAction(minishuyaDefaultCharacter, "idle", 99);

    expect(firstFrame.key).toBe("idle-01");
    expect(wrappedFrame.key).toMatch(/^idle-/);
    expect(wrappedFrame.src).toBeTruthy();
  });

  it("uses dedicated generated frame sequences for interactive actions", () => {
    expect(minishuyaDefaultCharacter.actions.petting.frames).toHaveLength(8);
    expect(minishuyaDefaultCharacter.actions.sleepy.frames).toHaveLength(8);
    expect(minishuyaDefaultCharacter.actions.dragging.frames).toHaveLength(3);
    expect(minishuyaDefaultCharacter.actions.draggingRecover.frames).toHaveLength(5);

    expect(frameForAction(minishuyaDefaultCharacter, "petting", 0).key).toBe("petting-01");
    expect(frameForAction(minishuyaDefaultCharacter, "petting", 7).key).toBe("petting-08");
    expect(frameForAction(minishuyaDefaultCharacter, "petting", 8).key).toBe("petting-01");
    expect(frameForAction(minishuyaDefaultCharacter, "sleepy", 0).key).toBe("sleepy-01");
    expect(frameForAction(minishuyaDefaultCharacter, "sleepy", 7).key).toBe("sleepy-08");
    expect(frameForAction(minishuyaDefaultCharacter, "dragging", 0).key).toBe("dragging-02");
    expect(frameForAction(minishuyaDefaultCharacter, "dragging", 3).key).toBe("dragging-02");
    expect(frameForAction(minishuyaDefaultCharacter, "draggingRecover", 0).key).toBe(
      "dragging-05",
    );
  });
});
