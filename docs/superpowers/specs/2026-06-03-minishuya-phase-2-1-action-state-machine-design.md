# MiniShuya Phase 2.1 Action State Machine Design

## Overview

Phase 2.1 adds the first real interaction layer for MiniShuya: a frontend action state machine that turns user input into visible pet states and animation classes. This stage keeps the current CSS cartoon character and focuses on the behavior foundation that later character assets and richer scene interactions can reuse.

This stage does not implement image-to-cartoon generation inside the app. The intended workflow remains external: the user can provide a character reference image, the assistant can generate suitable cartoon asset files outside the running MiniShuya application, and later phases can import those assets into the app.

## Goals

- Add a typed pet action state model.
- Centralize state transitions instead of scattering local mood flags inside `Pet.tsx`.
- Support interaction states for idle, hover, press, petting, dragging, menu open, and sleepy.
- Add state-specific CSS hooks so the current character visibly reacts.
- Keep existing Phase 1 behavior working: drag, position persistence, right-click exit menu, transparent window, and taskbar icon.
- Add tests for transition rules and key UI interactions.

## Non-Goals

- No global keyboard listener.
- No LLM chat.
- No wardrobe panel.
- No built-in AI image generation.
- No Live2D, Spine, or complex skeletal animation.
- No full scene scripting system yet.

## Interaction States

Phase 2.1 uses a focused state set:

- `idle`: default state with breathing and blinking.
- `hover`: pointer is over the pet and the pet is not dragging or showing a menu.
- `pressed`: short left-click or pointer-down feedback before drag is considered active.
- `petting`: repeated or deliberate interaction with the head/face region.
- `dragging`: native window drag is active.
- `menuOpen`: custom right-click menu is visible.
- `sleepy`: no direct interaction has happened for a configured idle timeout.

The state machine should expose a single current state and a small set of events:

- `POINTER_ENTER`
- `POINTER_LEAVE`
- `POINTER_DOWN`
- `POINTER_UP`
- `DRAG_START`
- `DRAG_END`
- `CONTEXT_MENU_OPEN`
- `CONTEXT_MENU_CLOSE`
- `PETTING_START`
- `PETTING_END`
- `IDLE_TIMEOUT`
- `WAKE`

## Priority Rules

Some states override others:

1. `dragging` has highest priority while drag is active.
2. `menuOpen` blocks hover, pressed, petting, and sleepy presentation while the menu is visible.
3. `petting` overrides hover and pressed.
4. `pressed` overrides hover.
5. `sleepy` only appears when there is no active pointer interaction and no menu.
6. `idle` is the fallback.

These rules make interactions predictable: dragging never accidentally looks sleepy, and opening the menu does not trigger drag or petting animations.

## Component Design

### `petActionState.ts`

Create a pure TypeScript module under `src/features/pet/` that owns:

- `PetActionState`
- `PetActionEvent`
- `transitionPetActionState(state, event)`
- `petActionClass(state)`
- `isInteractivePetState(state)` if useful for tests and UI behavior

This module must have no React dependency. It should be unit-tested directly.

### `Pet.tsx`

`Pet.tsx` should use the state machine rather than a local `PetMood` type. It should:

- Dispatch state events on pointer enter, pointer leave, pointer down, pointer up, context menu open, Escape, and drag end.
- Keep existing callback props: `onDragStart`, `onDragEnd`, and `onExit`.
- Add optional props only when they make tests or future integration cleaner.
- Apply a stable state class, for example `pet--idle`, `pet--hover`, `pet--petting`, `pet--dragging`, `pet--menu-open`, and `pet--sleepy`.
- Keep right-click menu behavior and event bubbling protections.

### CSS

`src/styles/global.css` should add small, distinct, low-risk animations for states:

- `hover`: slightly brighter face/body and a gentle lift.
- `pressed`: tiny squash.
- `petting`: happy bounce and stronger blush.
- `dragging`: existing grabbing behavior.
- `menuOpen`: reduce idle motion so menu feels stable.
- `sleepy`: slower breathing and droopy-looking eyes using CSS transforms.

These effects should work with the current CSS character and should not require image assets.

## Petting Detection

Phase 2.1 keeps petting detection simple and deterministic:

- The face/head region can dispatch `PETTING_START` on pointer down.
- Pointer up, pointer cancel, or pointer leave dispatches `PETTING_END`.
- Dragging from the body still calls `onDragStart`.

If this conflicts with drag ergonomics during manual verification, petting can be limited to a small face/head hit area while body dragging remains unchanged.

## Sleepy Behavior

Sleepy behavior should be implemented with a frontend timer:

- After a quiet period, dispatch `IDLE_TIMEOUT`.
- Any pointer interaction, context menu close/open, drag start/end, or petting event dispatches `WAKE`.
- The timeout duration should live in one named constant, such as `SLEEPY_AFTER_MS`.

Tests should use fake timers for the sleepy transition.

## Asset Direction

The current CSS character remains the in-app fallback character. Future generated cartoon assets should fit a layered asset model, but Phase 2.1 only prepares for this by naming state and CSS hooks clearly.

Future phases can add:

- `public/assets/pet/<character-id>/`
- layered face/body/expression assets
- a character manifest
- asset selection in a wardrobe or settings UI

## Testing Strategy

Frontend tests should cover:

- Pure state transitions in `petActionState.test.ts`.
- CSS class mapping for each state.
- `Pet` dispatches hover and menu states correctly.
- Right-click menu still opens and exits.
- Drag callbacks still fire.
- Menu item pointer events do not start dragging.
- Sleepy timer transitions to `sleepy` and wakes on interaction.

Existing tests for position helpers and right-click menu must continue to pass.

## Manual Verification

After implementation:

- Start with `pnpm tauri dev`.
- Confirm the pet still appears in a transparent frameless desktop window.
- Confirm taskbar icon is still visible.
- Confirm dragging still moves the window and restores position after restart.
- Confirm right-click menu still shows `退出` and exits.
- Confirm hover, click, petting, and sleepy states are visibly different.

## Phase Split

Recommended Phase 2 progression:

1. Phase 2.1: Action state machine foundation with current CSS character.
2. Phase 2.2: Character asset structure and first generated cartoon asset import workflow.
3. Phase 2.3: Multi-scene interaction catalog with richer reactions and configurable probabilities.

This keeps the first Phase 2 step small enough to verify while still setting up the later visual and scene work.
