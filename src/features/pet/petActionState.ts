export type PetActionState =
  | "idle"
  | "hover"
  | "pressed"
  | "petting"
  | "dragging"
  | "draggingRecover"
  | "menuOpen"
  | "sleepy";

export type PetActionEvent =
  | { type: "POINTER_ENTER" }
  | { type: "POINTER_LEAVE" }
  | { type: "POINTER_DOWN" }
  | { type: "POINTER_UP" }
  | { type: "DRAG_START" }
  | { type: "DRAG_END" }
  | { type: "DRAG_RECOVER_END" }
  | { type: "CONTEXT_MENU_OPEN" }
  | { type: "CONTEXT_MENU_CLOSE" }
  | { type: "PETTING_START" }
  | { type: "PETTING_END" }
  | { type: "IDLE_TIMEOUT" }
  | { type: "WAKE" };

export function initialPetActionState(): PetActionState {
  return "idle";
}

export function transitionPetActionState(
  state: PetActionState,
  event: PetActionEvent,
): PetActionState {
  if (state === "dragging" && event.type !== "DRAG_END") {
    return "dragging";
  }

  if (state === "menuOpen" && event.type !== "CONTEXT_MENU_CLOSE" && event.type !== "DRAG_START") {
    return "menuOpen";
  }

  switch (event.type) {
    case "POINTER_ENTER":
      return "hover";
    case "POINTER_LEAVE":
      return state === "petting" ? "petting" : "idle";
    case "POINTER_DOWN":
      return "pressed";
    case "POINTER_UP":
      return state === "petting" ? "idle" : "hover";
    case "DRAG_START":
      return "dragging";
    case "DRAG_END":
      return "draggingRecover";
    case "DRAG_RECOVER_END":
      return "idle";
    case "CONTEXT_MENU_OPEN":
      return "menuOpen";
    case "CONTEXT_MENU_CLOSE":
      return "idle";
    case "PETTING_START":
      return "petting";
    case "PETTING_END":
      return "idle";
    case "IDLE_TIMEOUT":
      return state === "idle" || state === "sleepy" ? "sleepy" : state;
    case "WAKE":
      return "idle";
  }
}

export function petActionClass(state: PetActionState): string {
  return state === "menuOpen" ? "pet--menu-open" : `pet--${state}`;
}
