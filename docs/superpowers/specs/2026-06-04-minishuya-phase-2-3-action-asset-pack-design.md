# MiniShuya Phase 2.3 Action Asset Pack Design

## Overview

Phase 2.3 turns the current single-image desktop pet into a small but extensible action asset system. The goal is not to build a full Live2D-style rig yet. The goal is to create a minimal closed loop where MiniShuya can switch between state-specific generated PNG frames, play lightweight animations, and preserve the transparent-window hit-test behavior that was fixed in Phase 2.2.

This phase uses Codex-assisted external image generation for project assets. The running MiniShuya app will not generate images itself. Generated assets are imported into the repository as transparent PNG files with matching alpha masks and metadata.

## Goals

- Define a stable character action asset directory structure.
- Define an action manifest that maps pet action states to frame sequences.
- Generate a small state-specific image set based on the approved MiniShuya character direction.
- Add an animation player that selects frame sequences from the current pet action state.
- Keep transparent click-through aligned with the currently rendered frame geometry.
- Prepare for per-frame alpha masks so future action frames can drive native hit testing correctly.
- Keep the first asset set small enough for manual visual review and iteration.

## Non-Goals

- No built-in image generation UI.
- No large batch of dozens of expressions.
- No skeletal rigging, Live2D, Spine, or mesh deformation.
- No wardrobe/customization menu.
- No LLM chat or behavior scripting.
- No physics-based hair, cloth, or inverse kinematics.

## Recommended Approach

Use a small hybrid approach:

1. Define the runtime asset model first.
2. Generate a minimal action frame set with `imagegen`.
3. Import the selected frames into the character asset folder.
4. Play the frames through a simple React animation layer.
5. Extend Rust hit-testing to understand the current action/frame alpha mask when multiple masks exist.

This balances visible progress with maintainable architecture. It avoids the earlier failure mode of manually drawing interaction regions that drift away from the visual character.

## Minimal Action Set

Phase 2.3 should support these action groups:

- `idle`: default standing pose; calm and subtle.
- `hover`: attentive pose; character notices the user.
- `dragging`: lifted or braced pose; works while the native window is moving.
- `petting`: happy or shy reaction; short expressive loop.
- `sleepy`: tired or relaxed pose; slower loop.
- `menuOpen`: stable pose while the menu is visible; may initially reuse `idle`.

Recommended first frame counts:

- `idle`: 2 to 4 frames.
- `hover`: 1 to 2 frames.
- `dragging`: 1 to 2 frames.
- `petting`: 2 to 4 frames.
- `sleepy`: 2 to 4 frames.
- `menuOpen`: 1 frame or reuse `idle`.

Small frame counts are intentional. CSS or GSAP can add tiny breathing and easing on top of the raster frames.

## Visual Direction

The generated frames should preserve the currently selected MiniShuya identity direction:

- More faithful to the user-approved character candidate than generic anime key art.
- Small desktop-pet proportions, not a large illustration crop.
- Gentle, obedient, warm, and quiet.
- Clean full-body cutout with generous transparent padding.
- No text, watermark, props, busy background, cast shadow, or contact shadow.
- Consistent face, hair, outfit, body scale, and camera angle across frames.

For transparent outputs, use the built-in image generation path first with a flat chroma-key background, then remove the background locally into alpha PNGs. If chroma-key removal fails because of edge complexity, ask before using any CLI fallback.

## Asset Directory Structure

Keep the existing character folder and expand it:

```text
src/assets/characters/minishuya-default/
  manifest.json
  frames/
    idle-01.png
    idle-02.png
    hover-01.png
    dragging-01.png
    petting-01.png
    petting-02.png
    sleepy-01.png
    sleepy-02.png
  alpha/
    idle-01.mask.rs or generated mask data
    ...
```

The exact alpha mask storage can be adjusted during implementation, but each frame must have a deterministic way to supply alpha hit-test data to Rust.

## Manifest Design

The character manifest should describe actions rather than only single state images.

Example shape:

```json
{
  "id": "minishuya-default",
  "displayName": "MiniShuya Default",
  "size": { "width": 150, "height": 225 },
  "defaultAction": "idle",
  "actions": {
    "idle": {
      "frames": ["frames/idle-01.png", "frames/idle-02.png"],
      "frameDurationMs": 700,
      "loop": true
    },
    "petting": {
      "frames": ["frames/petting-01.png", "frames/petting-02.png"],
      "frameDurationMs": 180,
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

The manifest should allow an action to reuse another action when a dedicated frame set does not exist yet.

## Runtime Design

### `characterAssets.ts`

Owns loading and typing for character manifests. It should expose:

- the active character manifest,
- action lookup by `PetActionState`,
- frame list and timing for the current action,
- a fallback to `idle` when an action is missing.

### `Pet.tsx`

`Pet.tsx` should keep owning the interaction state machine and render the current frame. It should not hardcode frame filenames. It should:

- derive the current action from `PetActionState`,
- use a small frame timer to advance frames,
- reset or preserve frame index based on action transitions,
- keep reporting the actual rendered character geometry for native hit testing,
- keep the character image as the event target while native alpha hit-testing decides whether the window receives events.

### Native Hit Testing

The current dynamic geometry report remains correct and should stay. Phase 2.3 extends the alpha source:

- Initially, if all actions still reuse the same alpha mask, keep the existing mask.
- When multiple action frames are imported, Rust should know the current frame key or current alpha mask.
- Frontend should report the current frame key alongside rendered geometry when per-frame masks are available.

This keeps hit testing tied to what the user actually sees.

## Image Generation Workflow

Use `imagegen` in batches of small, reviewable groups:

1. Generate or refine `idle` frames first.
2. Review identity consistency and desktop scale.
3. Generate `petting` and `sleepy` frames.
4. Generate `hover` and `dragging` frames.
5. Chroma-key remove backgrounds into alpha PNGs.
6. Save selected final assets under the character folder.
7. Generate/update alpha mask data for imported frames.

Each generated frame prompt should explicitly preserve:

- same character identity,
- same outfit,
- same full-body scale,
- same front-facing desktop pet composition,
- flat chroma-key background,
- no shadows or text.

## Testing Strategy

Frontend tests:

- manifest action lookup returns expected actions and idle fallback.
- animation frame selection advances by time.
- action changes select the correct frame sequence.
- missing actions fall back gracefully.
- `Pet` still reports rendered character hit geometry.
- existing menu, drag, sleepy, and petting tests continue to pass.

Rust tests:

- hit testing still uses latest reported geometry.
- per-frame mask selection works when more than one mask exists.
- missing frame mask falls back to a safe default mask.
- transparent pixels still ignore cursor events.
- visible pixels still remain interactive.

Manual verification:

- Start `pnpm tauri dev`.
- Confirm all imported frames render at the expected desktop scale.
- Confirm action transitions are visible but not noisy.
- Confirm transparent areas still click through.
- Confirm visible character pixels still drag.
- Confirm right-click menu remains usable and does not cover the character.

## Risks And Mitigations

- Image identity drift: generate in small groups and reject frames that do not match the approved candidate.
- Chroma-key edge artifacts: validate alpha output before importing; retry with better key color or edge settings if needed.
- Animation jitter: keep frame counts low and use stable image dimensions/padding.
- Hit-test drift: continue reporting rendered geometry from the DOM and keep alpha masks frame-specific when frames differ.
- Scope creep: do not add wardrobe, chat, or complex rigging in this phase.

## Acceptance Criteria

- The project has a manifest-driven action asset structure.
- MiniShuya can render state-specific frames for at least `idle`, `petting`, `dragging`, and `sleepy`.
- Missing states fall back to `idle` or an explicitly configured action.
- The transparent click-through behavior remains correct after frame switching.
- Tests cover manifest lookup, frame playback, and native hit-test geometry.
- The generated asset set is small, reviewed, and stored in the workspace.
