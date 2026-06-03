# MiniShuya Phase 2.1 Action State Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tested frontend action state machine so MiniShuya visibly reacts to hover, press, petting, dragging, right-click menu, and idle timeout.

**Architecture:** Keep native Tauri behavior unchanged and implement Phase 2.1 in the React frontend. Add a pure TypeScript state transition module under `src/features/pet/`, then wire `Pet.tsx` to dispatch events and expose stable state CSS classes. CSS adds small visual reactions while preserving the current fallback character.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, CSS animation, existing Tauri 2 commands.

---

## File Map

- `src/features/pet/petActionState.ts`: pure state and transition model.
- `src/features/pet/petActionState.test.ts`: unit tests for transition priority and CSS class mapping.
- `src/features/pet/Pet.tsx`: dispatches state events from pointer/menu interactions and exposes state classes.
- `src/features/pet/Pet.test.tsx`: component tests for hover, menu, drag, petting, and sleepy behavior.
- `src/styles/global.css`: state-specific visual reactions.
- `src/app/App.tsx`: should remain functionally unchanged except for prop compatibility if needed.
- `README.md`: optional manual verification note if the implementation changes user-visible behavior enough to document.

---

### Task 1: Add Pure Pet Action State Model

**Files:**

- Create: `src/features/pet/petActionState.ts`
- Create: `src/features/pet/petActionState.test.ts`

- [ ] **Step 1: Write failing state transition tests**

Create `src/features/pet/petActionState.test.ts`:

```ts
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
    expect(transitionPetActionState("dragging", { type: "DRAG_END" })).toBe("idle");
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

  it.each<PetActionState>(["idle", "hover", "pressed", "petting", "dragging", "menuOpen", "sleepy"])(
    "maps %s to a stable CSS class",
    (state) => {
      expect(petActionClass(state)).toMatch(/^pet--/);
    },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm test src/features/pet/petActionState.test.ts
```

Expected:

- Fails because `src/features/pet/petActionState.ts` does not exist.

- [ ] **Step 3: Implement minimal state model**

Create `src/features/pet/petActionState.ts`:

```ts
export type PetActionState =
  | "idle"
  | "hover"
  | "pressed"
  | "petting"
  | "dragging"
  | "menuOpen"
  | "sleepy";

export type PetActionEvent =
  | { type: "POINTER_ENTER" }
  | { type: "POINTER_LEAVE" }
  | { type: "POINTER_DOWN" }
  | { type: "POINTER_UP" }
  | { type: "DRAG_START" }
  | { type: "DRAG_END" }
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
      return state === "sleepy" ? "hover" : "hover";
    case "POINTER_LEAVE":
      return state === "petting" ? "petting" : "idle";
    case "POINTER_DOWN":
      return "pressed";
    case "POINTER_UP":
      return state === "petting" ? "idle" : "hover";
    case "DRAG_START":
      return "dragging";
    case "DRAG_END":
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
```

- [ ] **Step 4: Run state model tests**

Run:

```powershell
pnpm test src/features/pet/petActionState.test.ts
```

Expected:

- All state model tests pass.

- [ ] **Step 5: Commit state model**

Run:

```powershell
git add src/features/pet/petActionState.ts src/features/pet/petActionState.test.ts
git commit -m "test: add pet action state machine"
git push
```

Expected:

- Commit succeeds and updates the Phase 2.1 branch.

---

### Task 2: Wire Pet Component to the State Machine

**Files:**

- Modify: `src/features/pet/Pet.tsx`
- Modify: `src/features/pet/Pet.test.tsx`

- [ ] **Step 1: Extend Pet component tests for state classes**

Update `src/features/pet/Pet.test.tsx` by adding tests:

```tsx
it("enters hover state when the pointer enters", () => {
  render(<Pet onDragStart={() => undefined} onDragEnd={() => undefined} onExit={() => undefined} />);

  const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
  fireEvent.pointerEnter(pet);

  expect(pet).toHaveClass("pet--hover");
});

it("uses menu-open state while the exit menu is visible", () => {
  render(<Pet onDragStart={() => undefined} onDragEnd={() => undefined} onExit={() => undefined} />);

  const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
  fireEvent.contextMenu(pet);

  expect(pet).toHaveClass("pet--menu-open");
});

it("enters petting state from the face hit area", () => {
  render(<Pet onDragStart={() => undefined} onDragEnd={() => undefined} onExit={() => undefined} />);

  const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
  fireEvent.pointerDown(screen.getByTestId("pet-face"));

  expect(pet).toHaveClass("pet--petting");
});
```

- [ ] **Step 2: Run Pet tests to verify they fail**

Run:

```powershell
pnpm test src/features/pet/Pet.test.tsx
```

Expected:

- New tests fail because `Pet.tsx` still uses local `PetMood` and does not dispatch state-machine events.

- [ ] **Step 3: Replace local mood state with state machine**

Modify `src/features/pet/Pet.tsx`:

```tsx
import { useState } from "react";
import {
  initialPetActionState,
  petActionClass,
  transitionPetActionState,
  type PetActionEvent,
} from "./petActionState";

type PetProps = {
  onDragStart: () => void;
  onDragEnd: () => void;
  onExit: () => void;
};

export function Pet({ onDragStart, onDragEnd, onExit }: PetProps) {
  const [actionState, setActionState] = useState(initialPetActionState);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const dispatchAction = (event: PetActionEvent) => {
    setActionState((current) => transitionPetActionState(current, event));
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    dispatchAction({ type: "CONTEXT_MENU_CLOSE" });
  };

  const stopDragging = () => {
    dispatchAction({ type: "DRAG_END" });
    onDragEnd();
  };

  const startDragging = () => {
    setIsMenuOpen(false);
    dispatchAction({ type: "DRAG_START" });
    onDragStart();
  };

  const startPetting = (event: React.PointerEvent) => {
    event.stopPropagation();
    setIsMenuOpen(false);
    dispatchAction({ type: "PETTING_START" });
  };

  return (
    <button
      type="button"
      className={`pet ${petActionClass(actionState)}`}
      aria-label="MiniShuya desktop pet"
      onPointerEnter={() => dispatchAction({ type: "POINTER_ENTER" })}
      onPointerLeave={() => dispatchAction({ type: "POINTER_LEAVE" })}
      onContextMenu={(event) => {
        event.preventDefault();
        setIsMenuOpen(true);
        dispatchAction({ type: "CONTEXT_MENU_OPEN" });
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          closeMenu();
        }
      }}
      onPointerDown={startDragging}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
    >
      <span className="pet__shadow" />
      <span className="pet__body" data-testid="pet-body">
        <span className="pet__neck" />
        <span className="pet__dress" />
        <span className="pet__arm pet__arm--left" />
        <span className="pet__arm pet__arm--right" />
      </span>
      <span className="pet__head" data-testid="pet-face" onPointerDown={startPetting}>
        <span className="pet__hair pet__hair--back" />
        <span className="pet__bangs" />
        <span className="pet__eye pet__eye--left" />
        <span className="pet__eye pet__eye--right" />
        <span className="pet__blush pet__blush--left" />
        <span className="pet__blush pet__blush--right" />
        <span className="pet__mouth" />
      </span>
      <span className="pet__leg pet__leg--left" />
      <span className="pet__leg pet__leg--right" />
      {isMenuOpen ? (
        <span
          className="pet-menu"
          role="menu"
          aria-label="MiniShuya menu"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <span className="pet-menu__sparkle" aria-hidden="true" />
          <span className="pet-menu__title">MiniShuya</span>
          <span
            className="pet-menu__item"
            role="menuitem"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onExit();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onExit();
              }
            }}
          >
            退出
          </span>
        </span>
      ) : null}
    </button>
  );
}
```

- [ ] **Step 4: Run Pet tests**

Run:

```powershell
pnpm test src/features/pet/Pet.test.tsx
```

Expected:

- Pet tests pass.

- [ ] **Step 5: Commit Pet state-machine wiring**

Run:

```powershell
git add src/features/pet/Pet.tsx src/features/pet/Pet.test.tsx
git commit -m "feat: wire pet UI to action state machine"
git push
```

Expected:

- Commit succeeds and updates the Phase 2.1 branch.

---

### Task 3: Add Sleepy Timer Behavior

**Files:**

- Modify: `src/features/pet/Pet.tsx`
- Modify: `src/features/pet/Pet.test.tsx`

- [ ] **Step 1: Add failing sleepy timer tests**

Add to `src/features/pet/Pet.test.tsx`:

```tsx
it("enters sleepy state after a quiet period", () => {
  vi.useFakeTimers();
  render(<Pet onDragStart={() => undefined} onDragEnd={() => undefined} onExit={() => undefined} />);

  const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
  vi.advanceTimersByTime(30_000);

  expect(pet).toHaveClass("pet--sleepy");
  vi.useRealTimers();
});

it("wakes from sleepy state on pointer interaction", () => {
  vi.useFakeTimers();
  render(<Pet onDragStart={() => undefined} onDragEnd={() => undefined} onExit={() => undefined} />);

  const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
  vi.advanceTimersByTime(30_000);
  fireEvent.pointerEnter(pet);

  expect(pet).toHaveClass("pet--hover");
  vi.useRealTimers();
});
```

- [ ] **Step 2: Run Pet tests to verify sleepy tests fail**

Run:

```powershell
pnpm test src/features/pet/Pet.test.tsx
```

Expected:

- Sleepy tests fail because no timer exists.

- [ ] **Step 3: Implement sleepy timer**

Modify `src/features/pet/Pet.tsx`:

```tsx
import { useEffect, useState } from "react";
```

Add near the top:

```ts
export const SLEEPY_AFTER_MS = 30_000;
```

Inside `Pet`, add:

```tsx
useEffect(() => {
  const timeout = window.setTimeout(() => {
    dispatchAction({ type: "IDLE_TIMEOUT" });
  }, SLEEPY_AFTER_MS);

  return () => window.clearTimeout(timeout);
}, [actionState]);
```

Update `dispatchAction` so direct interactions wake the pet before applying the event when needed:

```tsx
const dispatchAction = (event: PetActionEvent) => {
  setActionState((current) => {
    const awakened =
      current === "sleepy" && event.type !== "IDLE_TIMEOUT"
        ? transitionPetActionState(current, { type: "WAKE" })
        : current;
    return transitionPetActionState(awakened, event);
  });
};
```

- [ ] **Step 4: Run Pet tests**

Run:

```powershell
pnpm test src/features/pet/Pet.test.tsx
```

Expected:

- Pet tests pass.

- [ ] **Step 5: Commit sleepy behavior**

Run:

```powershell
git add src/features/pet/Pet.tsx src/features/pet/Pet.test.tsx
git commit -m "feat: add sleepy pet state"
git push
```

Expected:

- Commit succeeds and updates the Phase 2.1 branch.

---

### Task 4: Add State-Specific Visual Reactions

**Files:**

- Modify: `src/styles/global.css`
- Modify: `src/features/pet/Pet.test.tsx`

- [ ] **Step 1: Add tests for stable state classes**

Ensure `src/features/pet/Pet.test.tsx` includes assertions that state classes appear for hover, petting, menu open, dragging, and sleepy. If Task 2 and Task 3 already added these, do not duplicate tests.

- [ ] **Step 2: Add CSS for state reactions**

Append to `src/styles/global.css`:

```css
.pet--hover {
  filter: brightness(1.04);
}

.pet--hover .pet__head {
  transform: translateY(-3px);
}

.pet--pressed {
  transform: translateY(2px) scaleY(0.98);
}

.pet--petting {
  animation-name: pet-happy-bounce;
  animation-duration: 0.8s;
}

.pet--petting .pet__blush {
  opacity: 1;
  transform: scaleX(1.2);
}

.pet--menu-open {
  animation-play-state: paused;
}

.pet--sleepy {
  animation-duration: 4.6s;
}

.pet--sleepy .pet__eye {
  transform: scaleY(0.35);
  animation: none;
}

.pet--sleepy .pet__mouth {
  width: 12px;
  border-bottom-width: 2px;
}

@keyframes pet-happy-bounce {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  35% {
    transform: translateY(-10px) rotate(-2deg);
  }
  70% {
    transform: translateY(-4px) rotate(2deg);
  }
}
```

- [ ] **Step 3: Run frontend tests and build**

Run:

```powershell
pnpm test
pnpm build
```

Expected:

- All frontend tests pass.
- Frontend build passes.

- [ ] **Step 4: Commit visual reactions**

Run:

```powershell
git add src/styles/global.css src/features/pet/Pet.test.tsx
git commit -m "feat: add pet state animations"
git push
```

Expected:

- Commit succeeds and updates the Phase 2.1 branch.

---

### Task 5: Final Verification and Manual Checklist

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Run full automated checks**

Run:

```powershell
pnpm test
pnpm build
cd src-tauri
cmd /c ""E:\DaliySoftware\MicrosoftVisualStudio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" && cargo fmt --check && cargo test && cargo clippy"
```

Expected:

- Frontend tests pass.
- Frontend build passes.
- Rust format check passes.
- Rust tests pass.
- Rust clippy passes.

- [ ] **Step 2: Update README current status**

Add under `## Current Status`:

```markdown
Phase 2.1 adds:

- A typed pet action state machine.
- Hover, pressed, petting, dragging, menu-open, and sleepy state classes.
- State-specific CSS reactions for the current fallback character.
```

- [ ] **Step 3: Manual verification**

Run:

```powershell
pnpm tauri dev
```

Manual checks:

- Pet still appears in a transparent frameless window.
- Taskbar icon is visible.
- Dragging still moves the pet.
- Right-click menu still shows `退出` and exits.
- Hover visibly changes the pet.
- Pressing the pet visibly changes it.
- Pressing the face/head area shows petting reaction.
- Leaving it idle long enough shows sleepy reaction.

- [ ] **Step 4: Commit verification docs**

Run:

```powershell
git add README.md
git commit -m "docs: document phase 2 action states"
git push
```

Expected:

- Commit succeeds and updates the Phase 2.1 branch.

---

## Self-Review

Spec coverage:

- State model is covered by Task 1.
- Pet UI wiring is covered by Task 2.
- Sleepy timer is covered by Task 3.
- Visual reactions are covered by Task 4.
- Verification and documentation are covered by Task 5.

Scope check:

- Image-to-cartoon generation remains external and is not implemented.
- Character asset replacement is deferred to Phase 2.2.
- Multi-scene catalog is deferred to Phase 2.3.

Type consistency:

- `PetActionState`, `PetActionEvent`, `transitionPetActionState`, and `petActionClass` names are used consistently across tasks.
- CSS classes use `pet--menu-open` for the `menuOpen` state.
