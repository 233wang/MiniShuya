# MiniShuya Phase 2.3 Action Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a manifest-driven action asset system for MiniShuya, generate a small state-specific PNG frame set, and keep alpha-based click-through aligned with the rendered character.

**Architecture:** React owns pet state, action selection, frame playback, and rendered geometry reporting. Rust owns native cursor passthrough and alpha-mask hit testing. Character assets live under a versioned character folder with a manifest that maps action states to frame sequences.

**Tech Stack:** Tauri 2, React 19, TypeScript, Vitest, Testing Library, Rust, Win32/Tauri cursor ignore events, built-in `imagegen` plus local chroma-key removal.

---

## File Structure

- Modify `src/features/pet/characterAssets.ts`: typed manifest model, action lookup, frame fallback.
- Create `src/features/pet/characterAssets.test.ts`: manifest lookup and fallback tests.
- Create `src/features/pet/useActionFrames.ts`: small React hook for frame playback.
- Create `src/features/pet/useActionFrames.test.tsx`: timer-driven frame playback tests.
- Modify `src/features/pet/Pet.tsx`: render current action frame and report geometry.
- Modify `src/features/pet/Pet.test.tsx`: verify action image switching and geometry reporting still work.
- Modify `src/assets/characters/minishuya-default/manifest.json`: change from state image map to action manifest.
- Create `src/assets/characters/minishuya-default/frames/`: generated/imported action PNGs.
- Modify `src-tauri/src/hit_test.rs`: support current frame key for future per-frame masks while preserving existing mask fallback.
- Modify `src-tauri/src/hit_test_tests.rs`: frame-key fallback and current-frame tests.
- Modify `src-tauri/src/window.rs`: expose `set_current_character_frame`.
- Modify `src-tauri/src/lib.rs`: register the new command.
- Add generated assets only after user review of `imagegen` outputs.

---

### Task 1: Manifest Model And Action Lookup

**Files:**
- Modify: `src/features/pet/characterAssets.ts`
- Create: `src/features/pet/characterAssets.test.ts`
- Modify: `src/assets/characters/minishuya-default/manifest.json`

- [ ] **Step 1: Write failing manifest lookup tests**

Create `src/features/pet/characterAssets.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  actionForPetState,
  frameForAction,
  minishuyaDefaultCharacter,
} from "./characterAssets";

describe("characterAssets", () => {
  it("maps pet action states to manifest actions", () => {
    expect(actionForPetState(minishuyaDefaultCharacter, "idle").id).toBe("idle");
    expect(actionForPetState(minishuyaDefaultCharacter, "petting").id).toBe("petting");
    expect(actionForPetState(minishuyaDefaultCharacter, "dragging").id).toBe("dragging");
    expect(actionForPetState(minishuyaDefaultCharacter, "sleepy").id).toBe("sleepy");
  });

  it("falls back to idle when a mapped action is missing", () => {
    const character = {
      ...minishuyaDefaultCharacter,
      stateMap: {
        ...minishuyaDefaultCharacter.stateMap,
        hover: "missing-action",
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
});
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
pnpm test -- src/features/pet/characterAssets.test.ts
```

Expected: fail because `actionForPetState` and `frameForAction` are not implemented.

- [ ] **Step 3: Update the manifest JSON shape**

Replace `src/assets/characters/minishuya-default/manifest.json` with:

```json
{
  "id": "minishuya-default",
  "displayName": "MiniShuya Default",
  "source": {
    "type": "imagegen-reference",
    "note": "Candidate idle asset based on the user-approved more-faithful character direction."
  },
  "size": {
    "width": 150,
    "height": 225
  },
  "defaultAction": "idle",
  "actions": {
    "idle": {
      "frames": ["frames/idle-01.png"],
      "frameDurationMs": 700,
      "loop": true
    },
    "hover": {
      "frames": ["frames/idle-01.png"],
      "frameDurationMs": 700,
      "loop": true
    },
    "dragging": {
      "frames": ["frames/idle-01.png"],
      "frameDurationMs": 700,
      "loop": true
    },
    "petting": {
      "frames": ["frames/idle-01.png"],
      "frameDurationMs": 260,
      "loop": true
    },
    "sleepy": {
      "frames": ["frames/idle-01.png"],
      "frameDurationMs": 900,
      "loop": true
    },
    "menuOpen": {
      "frames": ["frames/idle-01.png"],
      "frameDurationMs": 700,
      "loop": true
    }
  },
  "stateMap": {
    "idle": "idle",
    "hover": "hover",
    "pressed": "hover",
    "petting": "petting",
    "dragging": "dragging",
    "menuOpen": "menuOpen",
    "sleepy": "sleepy"
  }
}
```

- [ ] **Step 4: Move existing idle asset into frames folder**

Create `src/assets/characters/minishuya-default/frames/`.

Move:

```text
src/assets/characters/minishuya-default/idle.png
```

to:

```text
src/assets/characters/minishuya-default/frames/idle-01.png
```

Use PowerShell:

```powershell
New-Item -ItemType Directory -Force -Path src\assets\characters\minishuya-default\frames
Move-Item -LiteralPath src\assets\characters\minishuya-default\idle.png -Destination src\assets\characters\minishuya-default\frames\idle-01.png
```

- [ ] **Step 5: Implement manifest typing and lookup**

Replace `src/features/pet/characterAssets.ts` with:

```ts
import idleFrame01 from "../../assets/characters/minishuya-default/frames/idle-01.png";
import manifest from "../../assets/characters/minishuya-default/manifest.json";
import type { PetActionState } from "./petActionState";

export type PetCharacterActionId =
  | "idle"
  | "hover"
  | "dragging"
  | "petting"
  | "sleepy"
  | "menuOpen";

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

const frameSources: Record<string, string> = {
  "frames/idle-01.png": idleFrame01,
};

function frameKey(path: string): string {
  return path.replace(/^frames\//, "").replace(/\.png$/, "");
}

function actionFromManifest(id: PetCharacterActionId): PetCharacterAction {
  const action = manifest.actions[id];

  return {
    id,
    frames: action.frames.map((path) => ({
      key: frameKey(path),
      src: frameSources[path],
    })),
    frameDurationMs: action.frameDurationMs,
    loop: action.loop,
  };
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
  const frames = action.frames.length > 0 ? action.frames : character.actions[character.defaultAction].frames;
  return frames[frameIndex % frames.length];
}
```

- [ ] **Step 6: Run manifest tests**

Run:

```powershell
pnpm test -- src/features/pet/characterAssets.test.ts
```

Expected: pass.

- [ ] **Step 7: Commit manifest model**

Run:

```powershell
git add src\features\pet\characterAssets.ts src\features\pet\characterAssets.test.ts src\assets\characters\minishuya-default\manifest.json src\assets\characters\minishuya-default\frames\idle-01.png
git add -u src\assets\characters\minishuya-default\idle.png
git commit -m "feat: add character action manifest"
```

---

### Task 2: Frame Playback Hook

**Files:**
- Create: `src/features/pet/useActionFrames.ts`
- Create: `src/features/pet/useActionFrames.test.tsx`

- [ ] **Step 1: Write failing frame playback tests**

Create `src/features/pet/useActionFrames.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PetCharacterAction } from "./characterAssets";
import { useActionFrames } from "./useActionFrames";

const action = (id: PetCharacterAction["id"], frameDurationMs = 100): PetCharacterAction => ({
  id,
  frameDurationMs,
  loop: true,
  frames: [
    { key: `${id}-01`, src: `${id}-01.png` },
    { key: `${id}-02`, src: `${id}-02.png` },
  ],
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useActionFrames", () => {
  it("starts on the first frame", () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useActionFrames(action("idle")));

    expect(result.current.frame.key).toBe("idle-01");
    expect(result.current.frameIndex).toBe(0);
  });

  it("advances frames by action timing", () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useActionFrames(action("idle", 120)));

    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(result.current.frame.key).toBe("idle-02");
  });

  it("resets to the first frame when action changes", () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(
      ({ currentAction }) => useActionFrames(currentAction),
      { initialProps: { currentAction: action("idle", 100) } },
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.frame.key).toBe("idle-02");

    rerender({ currentAction: action("petting", 100) });

    expect(result.current.frame.key).toBe("petting-01");
  });
});
```

- [ ] **Step 2: Run failing hook tests**

Run:

```powershell
pnpm test -- src/features/pet/useActionFrames.test.tsx
```

Expected: fail because `useActionFrames.ts` does not exist.

- [ ] **Step 3: Implement the hook**

Create `src/features/pet/useActionFrames.ts`:

```ts
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
```

- [ ] **Step 4: Run hook tests**

Run:

```powershell
pnpm test -- src/features/pet/useActionFrames.test.tsx
```

Expected: pass.

- [ ] **Step 5: Commit frame playback hook**

Run:

```powershell
git add src\features\pet\useActionFrames.ts src\features\pet\useActionFrames.test.tsx
git commit -m "feat: add pet action frame playback"
```

---

### Task 3: Integrate Frame Playback Into Pet

**Files:**
- Modify: `src/features/pet/Pet.tsx`
- Modify: `src/features/pet/Pet.test.tsx`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Write failing Pet integration test**

Add this test to `src/features/pet/Pet.test.tsx`:

```tsx
it("reports the current rendered frame key", async () => {
  const onCharacterFrameChange = vi.fn();
  renderPet({ onCharacterFrameChange });

  await waitFor(() => {
    expect(onCharacterFrameChange).toHaveBeenCalledWith("idle-01");
  });
});
```

- [ ] **Step 2: Run failing Pet test**

Run:

```powershell
pnpm test -- src/features/pet/Pet.test.tsx
```

Expected: fail because `onCharacterFrameChange` is not a `Pet` prop.

- [ ] **Step 3: Update `Pet.tsx` props and frame rendering**

Modify `src/features/pet/Pet.tsx`:

```ts
import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  actionForPetState,
  minishuyaDefaultCharacter,
  type CharacterHitRegion,
} from "./characterAssets";
import { useActionFrames } from "./useActionFrames";
```

Add prop:

```ts
onCharacterFrameChange?: (frameKey: string) => void;
```

Inside `Pet`, derive action and frame:

```ts
const currentAction = actionForPetState(minishuyaDefaultCharacter, actionState);
const { frame } = useActionFrames(currentAction);
```

Add:

```ts
useEffect(() => {
  onCharacterFrameChange?.(frame.key);
}, [frame.key, onCharacterFrameChange]);
```

Update image `src`:

```tsx
src={frame.src}
```

Keep `width` and `height` from `minishuyaDefaultCharacter.size`.

- [ ] **Step 4: Update `App.tsx` to forward frame key to native**

Add:

```ts
const handleCharacterFrameChange = (frameKey: string) => {
  void invoke("set_current_character_frame", { frameKey });
};
```

Pass:

```tsx
onCharacterFrameChange={handleCharacterFrameChange}
```

- [ ] **Step 5: Run Pet tests**

Run:

```powershell
pnpm test -- src/features/pet/Pet.test.tsx
```

Expected: pass.

- [ ] **Step 6: Commit Pet frame integration**

Run:

```powershell
git add src\features\pet\Pet.tsx src\features\pet\Pet.test.tsx src\app\App.tsx
git commit -m "feat: render pet action frames"
```

---

### Task 4: Native Current Frame Tracking

**Files:**
- Modify: `src-tauri/src/hit_test.rs`
- Modify: `src-tauri/src/hit_test_tests.rs`
- Modify: `src-tauri/src/window.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write failing Rust frame-key test**

Add to `src-tauri/src/hit_test_tests.rs`:

```rust
#[test]
fn stores_current_character_frame_key() {
    crate::hit_test::set_current_character_frame("petting-01".to_string());

    assert_eq!(
        crate::hit_test::current_character_frame_key(),
        "petting-01".to_string()
    );
}
```

- [ ] **Step 2: Run failing Rust test**

Run:

```powershell
cmd /c ""E:\DaliySoftware\MicrosoftVisualStudio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" && cargo test stores_current_character_frame_key"
```

Expected: fail because frame-key storage functions do not exist.

- [ ] **Step 3: Implement frame-key storage**

Modify `src-tauri/src/hit_test.rs`:

```rust
use std::{
    sync::{
        atomic::{AtomicBool, AtomicI32, Ordering},
        Mutex,
    },
    thread,
    time::Duration,
};
```

Add near statics:

```rust
static CURRENT_CHARACTER_FRAME_KEY: Mutex<String> = Mutex::new(String::new());
```

Add functions:

```rust
pub fn set_current_character_frame(frame_key: String) {
    if frame_key.trim().is_empty() {
        return;
    }

    if let Ok(mut current) = CURRENT_CHARACTER_FRAME_KEY.lock() {
        *current = frame_key;
    }
}

pub fn current_character_frame_key() -> String {
    CURRENT_CHARACTER_FRAME_KEY
        .lock()
        .map(|current| current.clone())
        .unwrap_or_else(|_| "idle-01".to_string())
}
```

- [ ] **Step 4: Expose Tauri command**

Add to `src-tauri/src/window.rs`:

```rust
#[tauri::command]
pub fn set_current_character_frame(frame_key: String) {
    crate::hit_test::set_current_character_frame(frame_key);
}
```

Add to `src-tauri/src/lib.rs` invoke handler:

```rust
window::set_current_character_frame,
```

- [ ] **Step 5: Run Rust tests**

Run:

```powershell
cmd /c ""E:\DaliySoftware\MicrosoftVisualStudio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" && cargo test hit_test"
```

Expected: pass.

- [ ] **Step 6: Commit native frame tracking**

Run:

```powershell
git add src-tauri\src\hit_test.rs src-tauri\src\hit_test_tests.rs src-tauri\src\window.rs src-tauri\src\lib.rs
git commit -m "feat: track current pet frame natively"
```

---

### Task 5: Generate First Action Asset Drafts

**Files:**
- Create after approval: `src/assets/characters/minishuya-default/generated-drafts/`
- Final selected files later move to: `src/assets/characters/minishuya-default/frames/`

- [ ] **Step 1: Generate `petting` draft with built-in imagegen**

Use built-in `image_gen` with this prompt:

```text
Use case: stylized-concept
Asset type: Windows desktop pet action frame
Primary request: Generate a full-body MiniShuya desktop pet character action frame for the petting/happy reaction.
Subject: the same small gentle young woman character from the approved MiniShuya default asset direction, same face identity, same hairstyle, same black-and-white dress outfit, same petite desktop-pet proportions.
Style/medium: polished soft 2D cartoon character cutout, faithful to the existing MiniShuya character, not generic anime key art.
Composition/framing: full body, front-facing slight three-quarter view, centered, generous padding, same scale as a 150x225 desktop pet sprite.
Pose/expression: happy and shy from being petted, soft smile, slightly lifted shoulders or hands near chest, gentle blush.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal.
Lighting/mood: soft clean illustration lighting, calm and warm.
Constraints: background must be one uniform #00ff00 color with no shadows, gradients, texture, floor plane, or lighting variation. No cast shadow, no contact shadow, no reflection, no watermark, no text. Do not use #00ff00 anywhere in the subject. Keep edges crisp and fully separated from background.
Avoid: different outfit, different person, exaggerated big head, large illustration crop, props, busy background, dramatic pose.
```

- [ ] **Step 2: Generate `sleepy` draft with built-in imagegen**

Use built-in `image_gen` with this prompt:

```text
Use case: stylized-concept
Asset type: Windows desktop pet action frame
Primary request: Generate a full-body MiniShuya desktop pet character action frame for sleepy/tired state.
Subject: the same small gentle young woman character from the approved MiniShuya default asset direction, same face identity, same hairstyle, same black-and-white dress outfit, same petite desktop-pet proportions.
Style/medium: polished soft 2D cartoon character cutout, faithful to the existing MiniShuya character, not generic anime key art.
Composition/framing: full body, front-facing slight three-quarter view, centered, generous padding, same scale as a 150x225 desktop pet sprite.
Pose/expression: sleepy, relaxed eyelids, small calm posture, head slightly lowered, no bed or props.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal.
Lighting/mood: soft clean illustration lighting, quiet and gentle.
Constraints: background must be one uniform #00ff00 color with no shadows, gradients, texture, floor plane, or lighting variation. No cast shadow, no contact shadow, no reflection, no watermark, no text. Do not use #00ff00 anywhere in the subject. Keep edges crisp and fully separated from background.
Avoid: pajamas, pillow, different outfit, different person, exaggerated sadness, large illustration crop, props.
```

- [ ] **Step 3: Generate `dragging` draft with built-in imagegen**

Use built-in `image_gen` with this prompt:

```text
Use case: stylized-concept
Asset type: Windows desktop pet action frame
Primary request: Generate a full-body MiniShuya desktop pet character action frame for being dragged or lifted.
Subject: the same small gentle young woman character from the approved MiniShuya default asset direction, same face identity, same hairstyle, same black-and-white dress outfit, same petite desktop-pet proportions.
Style/medium: polished soft 2D cartoon character cutout, faithful to the existing MiniShuya character, not generic anime key art.
Composition/framing: full body, front-facing slight three-quarter view, centered, generous padding, same scale as a 150x225 desktop pet sprite.
Pose/expression: lightly braced as if being moved, feet slightly off-balance, calm surprised expression, not distressed.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal.
Lighting/mood: soft clean illustration lighting, gentle and playful.
Constraints: background must be one uniform #00ff00 color with no shadows, gradients, texture, floor plane, or lighting variation. No cast shadow, no contact shadow, no reflection, no watermark, no text. Do not use #00ff00 anywhere in the subject. Keep edges crisp and fully separated from background.
Avoid: panic, falling, different outfit, different person, hand cursor, props, background.
```

- [ ] **Step 4: Review drafts with the user**

Show generated drafts inline in the conversation.

Expected decision: user selects which drafts are acceptable for import. Reject any draft with identity drift, wrong outfit, wrong proportions, background artifacts, or large crop.

---

### Task 6: Chroma-Key Remove Selected Drafts

**Files:**
- Create final PNGs under `src/assets/characters/minishuya-default/frames/`

- [ ] **Step 1: Copy selected generated drafts into workspace**

For each selected source, copy from the built-in imagegen output path to:

```text
src/assets/characters/minishuya-default/generated-drafts/<action>-source.png
```

- [ ] **Step 2: Run chroma-key removal**

For each selected draft, run:

```powershell
python C:\Users\wangjian\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py --input src\assets\characters\minishuya-default\generated-drafts\petting-source.png --out src\assets\characters\minishuya-default\frames\petting-01.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill
```

Repeat with:

```text
sleepy-source.png -> frames/sleepy-01.png
dragging-source.png -> frames/dragging-01.png
```

- [ ] **Step 3: Validate alpha PNGs**

Use a short local inspection command:

```powershell
python -c "from PIL import Image; import sys; p=sys.argv[1]; im=Image.open(p); print(p, im.mode, im.size, im.getpixel((0,0)))" src\assets\characters\minishuya-default\frames\petting-01.png
```

Expected: mode is `RGBA`, corner pixel alpha is `0`.

- [ ] **Step 4: Show selected transparent PNGs to user**

Render the imported PNGs inline in the conversation and ask for visual acceptance before wiring them into the manifest.

---

### Task 7: Wire Imported Frames Into Manifest

**Files:**
- Modify: `src/features/pet/characterAssets.ts`
- Modify: `src/assets/characters/minishuya-default/manifest.json`
- Modify: `src/features/pet/characterAssets.test.ts`

- [ ] **Step 1: Add failing tests for generated frame actions**

Add to `src/features/pet/characterAssets.test.ts`:

```ts
it("uses imported action frames for generated actions", () => {
  expect(frameForAction(minishuyaDefaultCharacter, "petting", 0).key).toBe("petting-01");
  expect(frameForAction(minishuyaDefaultCharacter, "dragging", 0).key).toBe("dragging-01");
  expect(frameForAction(minishuyaDefaultCharacter, "sleepy", 0).key).toBe("sleepy-01");
});
```

- [ ] **Step 2: Run failing manifest tests**

Run:

```powershell
pnpm test -- src/features/pet/characterAssets.test.ts
```

Expected: fail until imports and manifest paths are updated.

- [ ] **Step 3: Update frame imports**

Modify `src/features/pet/characterAssets.ts`:

```ts
import draggingFrame01 from "../../assets/characters/minishuya-default/frames/dragging-01.png";
import idleFrame01 from "../../assets/characters/minishuya-default/frames/idle-01.png";
import pettingFrame01 from "../../assets/characters/minishuya-default/frames/petting-01.png";
import sleepyFrame01 from "../../assets/characters/minishuya-default/frames/sleepy-01.png";
```

Update `frameSources`:

```ts
const frameSources: Record<string, string> = {
  "frames/dragging-01.png": draggingFrame01,
  "frames/idle-01.png": idleFrame01,
  "frames/petting-01.png": pettingFrame01,
  "frames/sleepy-01.png": sleepyFrame01,
};
```

- [ ] **Step 4: Update manifest action frames**

In `src/assets/characters/minishuya-default/manifest.json`, set:

```json
"dragging": {
  "frames": ["frames/dragging-01.png"],
  "frameDurationMs": 700,
  "loop": true
},
"petting": {
  "frames": ["frames/petting-01.png"],
  "frameDurationMs": 260,
  "loop": true
},
"sleepy": {
  "frames": ["frames/sleepy-01.png"],
  "frameDurationMs": 900,
  "loop": true
}
```

- [ ] **Step 5: Run manifest tests**

Run:

```powershell
pnpm test -- src/features/pet/characterAssets.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit imported frames**

Run:

```powershell
git add src\features\pet\characterAssets.ts src\features\pet\characterAssets.test.ts src\assets\characters\minishuya-default\manifest.json src\assets\characters\minishuya-default\frames
git commit -m "feat: add generated pet action frames"
```

---

### Task 8: Final Verification And Documentation

**Files:**
- Modify: `README.md`
- Modify: `PRODUCT.md` if any product language changes are needed

- [ ] **Step 1: Run frontend verification**

Run:

```powershell
pnpm test
pnpm build
```

Expected:

```text
Test Files 4 passed
build passed
```

- [ ] **Step 2: Run Rust verification**

Run:

```powershell
cmd /c ""E:\DaliySoftware\MicrosoftVisualStudio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" && cargo fmt --check && cargo test && cargo clippy"
```

Expected: all Rust tests pass, fmt passes, clippy exits 0.

- [ ] **Step 3: Manual verification**

Run:

```powershell
pnpm tauri dev
```

Verify:

- `idle`, `petting`, `dragging`, and `sleepy` show distinct frames.
- Transparent pixels click through to lower Windows apps.
- Visible character pixels drag the pet.
- Right-click menu remains clickable and does not cover the character.
- Position save/restore still works.

- [ ] **Step 4: Update README current status**

Add a short note under current status:

```md
- Phase 2.3 adds a manifest-driven action asset system with generated state-specific character frames.
- The desktop hit-test uses rendered character geometry so transparent pixels continue to click through.
```

- [ ] **Step 5: Commit verification docs**

Run:

```powershell
git add README.md
git commit -m "docs: document action asset playback"
```

---

## Self-Review

Spec coverage:

- Manifest structure: Task 1 and Task 7.
- Frame playback: Task 2 and Task 3.
- Image generation: Task 5 and Task 6.
- Alpha hit-test preservation: Task 4 and Task 8.
- Small action set: Task 5 and Task 7.
- Tests and manual verification: every implementation task has targeted tests; Task 8 has full verification.

Scope check:

- This plan does not add wardrobe, chat, Live2D, built-in image generation, or large expression catalogs.
- Per-frame native alpha mask selection is prepared by current frame tracking. Full multi-mask generation can be a follow-up if imported frames differ enough that the current mask fallback is visibly wrong.

Type consistency:

- Frontend frame keys use strings such as `idle-01`, `petting-01`, `dragging-01`, and `sleepy-01`.
- Manifest action IDs use `idle`, `hover`, `dragging`, `petting`, `sleepy`, and `menuOpen`.
- Native command names are `set_character_hit_region`, `set_current_character_frame`, and `set_menu_hit_region_visible`.
