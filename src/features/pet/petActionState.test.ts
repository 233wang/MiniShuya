import { describe, expect, it } from "vitest";
import {
  initialPetActionState,
  petActionClass,
  transitionPetActionState,
  type PetActionState,
} from "./petActionState";

describe("pet action state", () => {
  it("starts idle", () => {
    expect(initialPetActionState()).toBe("idle");
  });

  it("enters hover from idle on pointer enter", () => {
    expect(transitionPetActionState("idle", { type: "POINTER_ENTER" })).toBe("hover");
  });

  it("returns idle from hover on pointer leave", () => {
    expect(transitionPetActionState("hover", { type: "POINTER_LEAVE" })).toBe("idle");
  });

  it("enters pressed on pointer down", () => {
    expect(transitionPetActionState("hover", { type: "POINTER_DOWN" })).toBe("pressed");
  });

  it("dragging overrides other states until drag ends", () => {
    expect(transitionPetActionState("petting", { type: "DRAG_START" })).toBe("dragging");
    expect(transitionPetActionState("dragging", { type: "POINTER_ENTER" })).toBe("dragging");
    expect(transitionPetActionState("dragging", { type: "DRAG_END" })).toBe("draggingRecover");
    expect(transitionPetActionState("draggingRecover", { type: "DRAG_RECOVER_END" })).toBe("idle");
  });

  it("menuOpen blocks pointer presentation until closed", () => {
    expect(transitionPetActionState("idle", { type: "CONTEXT_MENU_OPEN" })).toBe("menuOpen");
    expect(transitionPetActionState("menuOpen", { type: "POINTER_ENTER" })).toBe("menuOpen");
    expect(transitionPetActionState("menuOpen", { type: "CONTEXT_MENU_CLOSE" })).toBe("idle");
  });

  it("petting overrides pressed and returns idle when it ends", () => {
    expect(transitionPetActionState("pressed", { type: "PETTING_START" })).toBe("petting");
    expect(transitionPetActionState("petting", { type: "PETTING_END" })).toBe("idle");
  });

  it("sleepy only appears from quiet states and wakes on interaction", () => {
    expect(transitionPetActionState("idle", { type: "IDLE_TIMEOUT" })).toBe("sleepy");
    expect(transitionPetActionState("hover", { type: "IDLE_TIMEOUT" })).toBe("hover");
    expect(transitionPetActionState("sleepy", { type: "WAKE" })).toBe("idle");
  });

  it.each<PetActionState>([
    "idle",
    "hover",
    "pressed",
    "petting",
    "dragging",
    "draggingRecover",
    "menuOpen",
    "sleepy",
  ])("maps %s to a stable CSS class", (state) => {
    expect(petActionClass(state)).toMatch(/^pet--/);
  });
});
