# MiniShuya Phase 0-1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable MiniShuya desktop pet demo with a transparent always-on-top Tauri window, draggable animated character, and persisted window position.

**Architecture:** Use Tauri as the native Windows shell and React as the visual pet UI. Rust exposes small native commands for window movement and position persistence; React owns pet rendering, pointer interaction, and animation state.

**Tech Stack:** Tauri 2, React, TypeScript, Vite, Rust, pnpm, Vitest, CSS/SVG animation.

---

## Scope

This plan implements Phase 0 and Phase 1 from `docs/superpowers/specs/2026-06-02-minishuya-roadmap-design.md`.

Included:

- Tauri 2 + React + TypeScript project skeleton.
- Tooling and documentation.
- Transparent frameless always-on-top desktop pet window.
- Animated placeholder cartoon humanoid.
- Mouse drag behavior.
- Window position persistence.
- Basic TypeScript unit tests and Rust unit tests where logic is pure.
- Commit and push after each task.

Excluded:

- LLM chat.
- Global keyboard listening.
- Wardrobe system.
- System tray.
- Installer packaging.

## File Map

- `package.json`: pnpm scripts and package metadata.
- `pnpm-lock.yaml`: locked frontend dependencies.
- `index.html`: Vite entry document.
- `src/main.tsx`: React bootstrap.
- `src/app/App.tsx`: top-level app shell.
- `src/features/pet/Pet.tsx`: pet component, pointer event wiring, visual states.
- `src/features/pet/Pet.test.tsx`: interaction tests for drag start and rendered character.
- `src/features/pet/petPosition.ts`: pure helpers for position validation and defaults.
- `src/features/pet/petPosition.test.ts`: unit tests for position helpers.
- `src/styles/global.css`: page reset, transparent viewport, pet layout, animations.
- `src-tauri/Cargo.toml`: Rust crate dependencies.
- `src-tauri/tauri.conf.json`: Tauri app/window configuration.
- `src-tauri/src/lib.rs`: Tauri builder, command registration, and setup hooks.
- `src-tauri/src/main.rs`: production entrypoint that calls `minishuya_lib::run()`.
- `src-tauri/src/window.rs`: Rust commands for window position save/load and drag start.
- `src-tauri/src/window_position.rs`: pure Rust position model and validation.
- `src-tauri/src/window_position_tests.rs`: Rust tests for position validation.
- `rust-toolchain.toml`: Rust channel lock.
- `.vscode/extensions.json`: recommended VS Code extensions.
- `.vscode/settings.json`: editor settings for the project.
- `.gitignore`: generated files and secrets.
- `README.md`: setup, development, proxy note, and verification checklist.

---

### Task 1: Scaffold Tauri React TypeScript Project

**Files:**

- Create: `package.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/styles/global.css`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/src/lib.rs`
- Create: `src-tauri/src/main.rs`
- Create: `.gitignore`

- [ ] **Step 1: Generate the app scaffold**

Run:

```powershell
pnpm create tauri-app . --template react-ts --manager pnpm
```

Expected:

- The command creates a Tauri + React + TypeScript project in the current directory.
- Existing `docs/` remains intact.
- Generated files include `package.json`, `src/`, and `src-tauri/`.

- [ ] **Step 2: Install dependencies**

Run:

```powershell
pnpm install
```

Expected:

- `pnpm-lock.yaml` is created.
- `node_modules/` is created locally and remains ignored by git.

- [ ] **Step 3: Normalize generated scripts**

Replace the `scripts` field in `package.json` with:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  }
}
```

- [ ] **Step 4: Confirm initial frontend build**

Run:

```powershell
pnpm build
```

Expected:

- Command exits with code `0`.
- `dist/` is created and ignored by git.

- [ ] **Step 5: Commit scaffold**

Run:

```powershell
git status --short
git add .
git commit -m "chore: initialize tauri react project"
git push
```

Expected:

- Commit succeeds.
- Push updates `origin/main`.

---

### Task 2: Add Project Tooling and Documentation

**Files:**

- Create: `rust-toolchain.toml`
- Create: `.vscode/extensions.json`
- Create: `.vscode/settings.json`
- Modify: `.gitignore`
- Modify: `README.md`
- Modify: `package.json`

- [ ] **Step 1: Add Rust toolchain lock**

Create `rust-toolchain.toml`:

```toml
[toolchain]
channel = "stable"
components = ["rustfmt", "clippy"]
```

- [ ] **Step 2: Add VS Code extension recommendations**

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "rust-lang.rust-analyzer",
    "tauri-apps.tauri-vscode",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
  ]
}
```

- [ ] **Step 3: Add VS Code workspace settings**

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "typescript.tsdk": "node_modules/typescript/lib",
  "rust-analyzer.check.command": "clippy"
}
```

- [ ] **Step 4: Ensure generated artifacts are ignored**

Make `.gitignore` include:

```gitignore
node_modules/
dist/
target/
src-tauri/target/
.env
.env.*
!.env.example
```

- [ ] **Step 5: Add README setup instructions**

Update `README.md` with:

```markdown
# MiniShuya

MiniShuya is a Windows desktop pet built with Tauri, React, TypeScript, and Rust.

## Requirements

- VS Code
- Git
- Node.js
- pnpm
- Rust and rustup
- Microsoft Visual Studio C++ Build Tools
- Microsoft Edge WebView2 Runtime

## Development

Install dependencies:

```powershell
pnpm install
```

Run the desktop app:

```powershell
pnpm tauri dev
```

Build frontend assets:

```powershell
pnpm build
```

Run Rust checks:

```powershell
cd src-tauri
cargo test
cargo clippy
```

## GitHub Access

This repository uses SSH remote access. On this machine, Git is configured to use the project-specific SSH key at:

```text
C:/Users/wangjian/.ssh/id_ed25519_github
```

The local network currently reaches GitHub through the proxy at:

```text
127.0.0.1:7892
```

## Phase 1 Manual Verification

- `pnpm tauri dev` opens a transparent desktop pet window.
- The window is frameless and always on top.
- The character can be dragged.
- The character has an idle animation.
- Closing and reopening restores the previous position.
```

- [ ] **Step 6: Verify docs and tooling files**

Run:

```powershell
pnpm build
cd src-tauri
cargo test
```

Expected:

- `pnpm build` exits with code `0`.
- `cargo test` exits with code `0`.

- [ ] **Step 7: Commit tooling**

Run:

```powershell
git status --short
git add rust-toolchain.toml .vscode .gitignore README.md package.json
git commit -m "chore: add development tooling"
git push
```

Expected:

- Commit succeeds.
- Push updates `origin/main`.

---

### Task 3: Add Position Helper Tests and Frontend Position Logic

**Files:**

- Create: `src/features/pet/petPosition.ts`
- Create: `src/features/pet/petPosition.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest test dependencies**

Run:

```powershell
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Expected:

- Dev dependencies are added to `package.json`.
- `pnpm-lock.yaml` is updated.

- [ ] **Step 2: Add test script**

Modify `package.json` scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Keep the existing `dev`, `build`, `preview`, and `tauri` scripts.

- [ ] **Step 3: Write failing position tests**

Create `src/features/pet/petPosition.test.ts`:

```ts
import { clampPetPosition, defaultPetPosition, isValidPetPosition } from "./petPosition";

describe("pet position helpers", () => {
  it("accepts finite coordinates", () => {
    expect(isValidPetPosition({ x: 120, y: 240 })).toBe(true);
  });

  it("rejects non-finite coordinates", () => {
    expect(isValidPetPosition({ x: Number.NaN, y: 240 })).toBe(false);
    expect(isValidPetPosition({ x: 120, y: Number.POSITIVE_INFINITY })).toBe(false);
  });

  it("uses a stable default position", () => {
    expect(defaultPetPosition()).toEqual({ x: 80, y: 120 });
  });

  it("clamps position into the visible work area", () => {
    expect(
      clampPetPosition(
        { x: -20, y: 9999 },
        { width: 1920, height: 1080 },
        { width: 220, height: 280 },
      ),
    ).toEqual({ x: 0, y: 800 });
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run:

```powershell
pnpm test src/features/pet/petPosition.test.ts
```

Expected:

- Fails because `src/features/pet/petPosition.ts` does not exist.

- [ ] **Step 5: Implement position helpers**

Create `src/features/pet/petPosition.ts`:

```ts
export type PetPosition = {
  x: number;
  y: number;
};

export type ViewportSize = {
  width: number;
  height: number;
};

export function defaultPetPosition(): PetPosition {
  return { x: 80, y: 120 };
}

export function isValidPetPosition(position: PetPosition): boolean {
  return Number.isFinite(position.x) && Number.isFinite(position.y);
}

export function clampPetPosition(
  position: PetPosition,
  viewport: ViewportSize,
  petSize: ViewportSize,
): PetPosition {
  const maxX = Math.max(0, viewport.width - petSize.width);
  const maxY = Math.max(0, viewport.height - petSize.height);

  return {
    x: Math.min(Math.max(0, position.x), maxX),
    y: Math.min(Math.max(0, position.y), maxY),
  };
}
```

- [ ] **Step 6: Run tests**

Run:

```powershell
pnpm test src/features/pet/petPosition.test.ts
```

Expected:

- All tests pass.

- [ ] **Step 7: Commit position helpers**

Run:

```powershell
git status --short
git add package.json pnpm-lock.yaml src/features/pet/petPosition.ts src/features/pet/petPosition.test.ts
git commit -m "test: add pet position helpers"
git push
```

Expected:

- Commit succeeds.
- Push updates `origin/main`.

---

### Task 4: Implement Animated Pet UI

**Files:**

- Create: `src/features/pet/Pet.tsx`
- Create: `src/features/pet/Pet.test.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Write failing pet render test**

Create `src/features/pet/Pet.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { Pet } from "./Pet";

describe("Pet", () => {
  it("renders MiniShuya as an interactive character", () => {
    render(<Pet />);

    expect(screen.getByRole("button", { name: "MiniShuya desktop pet" })).toBeInTheDocument();
    expect(screen.getByTestId("pet-face")).toBeInTheDocument();
    expect(screen.getByTestId("pet-body")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm test src/features/pet/Pet.test.tsx
```

Expected:

- Fails because `Pet` is not implemented.

- [ ] **Step 3: Implement pet component**

Create `src/features/pet/Pet.tsx`:

```tsx
import { useState } from "react";

type PetMood = "idle" | "dragging";

export function Pet() {
  const [mood, setMood] = useState<PetMood>("idle");

  return (
    <button
      type="button"
      className={`pet pet--${mood}`}
      aria-label="MiniShuya desktop pet"
      onPointerDown={() => setMood("dragging")}
      onPointerUp={() => setMood("idle")}
      onPointerCancel={() => setMood("idle")}
      onPointerLeave={() => setMood("idle")}
    >
      <span className="pet__shadow" />
      <span className="pet__body" data-testid="pet-body">
        <span className="pet__neck" />
        <span className="pet__dress" />
        <span className="pet__arm pet__arm--left" />
        <span className="pet__arm pet__arm--right" />
      </span>
      <span className="pet__head" data-testid="pet-face">
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
    </button>
  );
}
```

- [ ] **Step 4: Mount pet in app**

Modify `src/app/App.tsx`:

```tsx
import { Pet } from "../features/pet/Pet";

export function App() {
  return (
    <main className="app-shell">
      <Pet />
    </main>
  );
}
```

- [ ] **Step 5: Add pet CSS**

Append to `src/styles/global.css`:

```css
:root {
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: transparent;
  color: #202124;
}

html,
body,
#root {
  width: 100%;
  height: 100%;
  margin: 0;
  background: transparent;
  overflow: hidden;
}

button {
  font: inherit;
}

.app-shell {
  width: 100vw;
  height: 100vh;
  display: grid;
  place-items: center;
  background: transparent;
}

.pet {
  position: relative;
  width: 220px;
  height: 280px;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: grab;
  animation: pet-breathe 2.8s ease-in-out infinite;
  transform-origin: 50% 100%;
}

.pet:active,
.pet--dragging {
  cursor: grabbing;
  animation-duration: 1.2s;
}

.pet__shadow {
  position: absolute;
  left: 45px;
  bottom: 10px;
  width: 130px;
  height: 22px;
  border-radius: 50%;
  background: rgba(58, 47, 79, 0.18);
  filter: blur(1px);
}

.pet__body {
  position: absolute;
  left: 65px;
  bottom: 42px;
  width: 90px;
  height: 105px;
  border-radius: 42px 42px 30px 30px;
  background: #6eb6ff;
  box-shadow: inset 0 -12px 0 rgba(34, 89, 156, 0.18);
}

.pet__neck {
  position: absolute;
  left: 34px;
  top: -18px;
  width: 22px;
  height: 26px;
  border-radius: 12px;
  background: #ffd3c7;
}

.pet__dress {
  position: absolute;
  left: 18px;
  top: 36px;
  width: 54px;
  height: 44px;
  border-radius: 18px 18px 24px 24px;
  background: #fff7a8;
}

.pet__arm {
  position: absolute;
  top: 26px;
  width: 24px;
  height: 74px;
  border-radius: 18px;
  background: #ffd3c7;
}

.pet__arm--left {
  left: -15px;
  transform: rotate(12deg);
}

.pet__arm--right {
  right: -15px;
  transform: rotate(-12deg);
}

.pet__head {
  position: absolute;
  left: 45px;
  top: 22px;
  width: 130px;
  height: 116px;
  border-radius: 48% 48% 45% 45%;
  background: #ffd8ce;
  box-shadow: inset 0 -10px 0 rgba(195, 113, 104, 0.08);
}

.pet__hair--back {
  position: absolute;
  inset: -16px -8px 44px;
  z-index: -1;
  border-radius: 52px 52px 36px 36px;
  background: #3d3049;
}

.pet__bangs {
  position: absolute;
  left: 18px;
  top: -10px;
  width: 94px;
  height: 42px;
  border-radius: 44px 44px 20px 20px;
  background: #493958;
}

.pet__eye {
  position: absolute;
  top: 54px;
  width: 14px;
  height: 18px;
  border-radius: 50%;
  background: #2b2531;
  animation: pet-blink 4.8s infinite;
}

.pet__eye--left {
  left: 37px;
}

.pet__eye--right {
  right: 37px;
}

.pet__blush {
  position: absolute;
  top: 77px;
  width: 20px;
  height: 9px;
  border-radius: 50%;
  background: rgba(255, 126, 143, 0.45);
}

.pet__blush--left {
  left: 24px;
}

.pet__blush--right {
  right: 24px;
}

.pet__mouth {
  position: absolute;
  left: 58px;
  top: 78px;
  width: 14px;
  height: 8px;
  border-bottom: 3px solid #8e5062;
  border-radius: 0 0 14px 14px;
}

.pet__leg {
  position: absolute;
  bottom: 30px;
  width: 25px;
  height: 48px;
  border-radius: 14px;
  background: #ffd3c7;
}

.pet__leg--left {
  left: 78px;
}

.pet__leg--right {
  right: 78px;
}

@keyframes pet-breathe {
  0%,
  100% {
    transform: translateY(0) rotate(-1deg);
  }
  50% {
    transform: translateY(-8px) rotate(1deg);
  }
}

@keyframes pet-blink {
  0%,
  92%,
  100% {
    transform: scaleY(1);
  }
  95% {
    transform: scaleY(0.08);
  }
}
```

- [ ] **Step 6: Run pet tests**

Run:

```powershell
pnpm test src/features/pet/Pet.test.tsx
```

Expected:

- Pet render test passes.

- [ ] **Step 7: Run frontend build**

Run:

```powershell
pnpm build
```

Expected:

- TypeScript and Vite build pass.

- [ ] **Step 8: Commit animated pet UI**

Run:

```powershell
git status --short
git add src/features/pet/Pet.tsx src/features/pet/Pet.test.tsx src/app/App.tsx src/styles/global.css
git commit -m "feat: add animated pet character"
git push
```

Expected:

- Commit succeeds.
- Push updates `origin/main`.

---

### Task 5: Configure Transparent Always-On-Top Window

**Files:**

- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: Update Tauri window config**

Modify the main window entry in `src-tauri/tauri.conf.json` to include:

```json
{
  "label": "main",
  "title": "MiniShuya",
  "width": 260,
  "height": 320,
  "resizable": false,
  "fullscreen": false,
  "decorations": false,
  "transparent": true,
  "alwaysOnTop": true,
  "shadow": false,
  "skipTaskbar": true
}
```

Keep the generated `beforeDevCommand`, `beforeBuildCommand`, `devUrl`, and `frontendDist` values.

- [ ] **Step 2: Make the webview background transparent at startup**

Replace `src-tauri/src/lib.rs` with:

```rust
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                window.set_always_on_top(true)?;
                window.set_decorations(false)?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running MiniShuya");
}
```

Replace `src-tauri/src/main.rs` with:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    minishuya_lib::run();
}
```

- [ ] **Step 3: Run Rust format and tests**

Run:

```powershell
cd src-tauri
cargo fmt
cargo test
```

Expected:

- Format completes.
- Tests pass.

- [ ] **Step 4: Run Tauri dev server manually**

Run:

```powershell
pnpm tauri dev
```

Expected:

- A small frameless MiniShuya window appears.
- The app window background is transparent.
- The window stays above normal windows.

- [ ] **Step 5: Commit window config**

Run:

```powershell
git status --short
git add src-tauri/tauri.conf.json src-tauri/src
git commit -m "feat: configure desktop pet window"
git push
```

Expected:

- Commit succeeds.
- Push updates `origin/main`.

---

### Task 6: Add Native Position Persistence

**Files:**

- Create: `src-tauri/src/window_position.rs`
- Create: `src-tauri/src/window_position_tests.rs`
- Create: `src-tauri/src/window.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write Rust position tests**

Create `src-tauri/src/window_position_tests.rs`:

```rust
use crate::window_position::{sanitize_position, WindowPosition};

#[test]
fn accepts_normal_position() {
    let position = sanitize_position(WindowPosition { x: 120, y: 240 });
    assert_eq!(position, WindowPosition { x: 120, y: 240 });
}

#[test]
fn clamps_large_negative_position_to_zero() {
    let position = sanitize_position(WindowPosition { x: -9000, y: -10 });
    assert_eq!(position, WindowPosition { x: 0, y: 0 });
}

#[test]
fn clamps_extreme_position_to_reasonable_desktop_bounds() {
    let position = sanitize_position(WindowPosition { x: 99999, y: 99999 });
    assert_eq!(position, WindowPosition { x: 20000, y: 20000 });
}
```

- [ ] **Step 2: Run Rust test to verify it fails**

Run:

```powershell
cd src-tauri
cargo test window_position
```

Expected:

- Fails because `window_position` module does not exist.

- [ ] **Step 3: Implement Rust position model**

Create `src-tauri/src/window_position.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct WindowPosition {
    pub x: i32,
    pub y: i32,
}

pub fn default_position() -> WindowPosition {
    WindowPosition { x: 80, y: 120 }
}

pub fn sanitize_position(position: WindowPosition) -> WindowPosition {
    WindowPosition {
        x: position.x.clamp(0, 20_000),
        y: position.y.clamp(0, 20_000),
    }
}
```

- [ ] **Step 4: Add Tauri commands**

Create `src-tauri/src/window.rs`:

```rust
use std::fs;

use tauri::{AppHandle, Manager, PhysicalPosition, WebviewWindow};

use crate::window_position::{default_position, sanitize_position, WindowPosition};

const POSITION_FILE: &str = "window-position.json";

fn position_file(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("failed to resolve app config dir: {error}"))?;
    fs::create_dir_all(&dir).map_err(|error| format!("failed to create app config dir: {error}"))?;
    Ok(dir.join(POSITION_FILE))
}

#[tauri::command]
pub fn load_window_position(app: AppHandle) -> Result<WindowPosition, String> {
    let file = position_file(&app)?;
    if !file.exists() {
        return Ok(default_position());
    }

    let content =
        fs::read_to_string(&file).map_err(|error| format!("failed to read position file: {error}"))?;
    let position: WindowPosition =
        serde_json::from_str(&content).map_err(|error| format!("invalid position file: {error}"))?;
    Ok(sanitize_position(position))
}

#[tauri::command]
pub fn save_window_position(app: AppHandle, position: WindowPosition) -> Result<(), String> {
    let file = position_file(&app)?;
    let content = serde_json::to_string_pretty(&sanitize_position(position))
        .map_err(|error| format!("failed to serialize position: {error}"))?;
    fs::write(file, content).map_err(|error| format!("failed to write position file: {error}"))
}

#[tauri::command]
pub fn start_drag(window: WebviewWindow) -> Result<(), String> {
    window
        .start_dragging()
        .map_err(|error| format!("failed to start dragging: {error}"))
}

pub fn apply_saved_position(app: &AppHandle) -> Result<(), String> {
    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };
    let position = load_window_position(app.clone())?;
    window
        .set_position(PhysicalPosition::new(position.x, position.y))
        .map_err(|error| format!("failed to apply window position: {error}"))
}
```

- [ ] **Step 5: Register modules and commands**

Replace `src-tauri/src/lib.rs` with:

```rust
mod window;
mod window_position;

#[cfg(test)]
mod window_position_tests;

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            window::load_window_position,
            window::save_window_position,
            window::start_drag
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                window.set_always_on_top(true)?;
                window.set_decorations(false)?;
            }
            window::apply_saved_position(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running MiniShuya");
}
```

- [ ] **Step 6: Ensure Rust dependencies exist**

Make sure `src-tauri/Cargo.toml` contains:

```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tauri = { version = "2", features = [] }
```

Keep other generated dependencies.

- [ ] **Step 7: Run Rust tests**

Run:

```powershell
cd src-tauri
cargo fmt
cargo test
```

Expected:

- All Rust tests pass.

- [ ] **Step 8: Commit native position persistence**

Run:

```powershell
git status --short
git add src-tauri/src src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "feat: persist desktop pet position"
git push
```

Expected:

- Commit succeeds.
- Push updates `origin/main`.

---

### Task 7: Connect Drag UI to Native Window Commands

**Files:**

- Modify: `src/features/pet/Pet.tsx`
- Modify: `src/features/pet/Pet.test.tsx`

- [ ] **Step 1: Update pet test for drag callback**

Replace `src/features/pet/Pet.test.tsx` with:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { Pet } from "./Pet";

describe("Pet", () => {
  it("renders MiniShuya as an interactive character", () => {
    render(<Pet onDragStart={() => undefined} />);

    expect(screen.getByRole("button", { name: "MiniShuya desktop pet" })).toBeInTheDocument();
    expect(screen.getByTestId("pet-face")).toBeInTheDocument();
    expect(screen.getByTestId("pet-body")).toBeInTheDocument();
  });

  it("calls onDragStart when pointer drag begins", () => {
    const onDragStart = vi.fn();
    render(<Pet onDragStart={onDragStart} />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "MiniShuya desktop pet" }));

    expect(onDragStart).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm test src/features/pet/Pet.test.tsx
```

Expected:

- Fails because `Pet` does not accept `onDragStart`.

- [ ] **Step 3: Add drag callback prop**

Modify `src/features/pet/Pet.tsx`:

```tsx
import { useState } from "react";

type PetMood = "idle" | "dragging";

type PetProps = {
  onDragStart: () => void;
};

export function Pet({ onDragStart }: PetProps) {
  const [mood, setMood] = useState<PetMood>("idle");

  return (
    <button
      type="button"
      className={`pet pet--${mood}`}
      aria-label="MiniShuya desktop pet"
      onPointerDown={() => {
        setMood("dragging");
        onDragStart();
      }}
      onPointerUp={() => setMood("idle")}
      onPointerCancel={() => setMood("idle")}
      onPointerLeave={() => setMood("idle")}
    >
      <span className="pet__shadow" />
      <span className="pet__body" data-testid="pet-body">
        <span className="pet__neck" />
        <span className="pet__dress" />
        <span className="pet__arm pet__arm--left" />
        <span className="pet__arm pet__arm--right" />
      </span>
      <span className="pet__head" data-testid="pet-face">
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
    </button>
  );
}
```

- [ ] **Step 4: Connect App to Tauri command**

Modify `src/app/App.tsx`:

```tsx
import { invoke } from "@tauri-apps/api/core";
import { Pet } from "../features/pet/Pet";

export function App() {
  const handleDragStart = () => {
    void invoke("start_drag");
  };

  return (
    <main className="app-shell">
      <Pet onDragStart={handleDragStart} />
    </main>
  );
}
```

- [ ] **Step 5: Run tests and build**

Run:

```powershell
pnpm test src/features/pet/Pet.test.tsx
pnpm build
```

Expected:

- Pet tests pass.
- Frontend build passes.

- [ ] **Step 6: Commit drag command wiring**

Run:

```powershell
git status --short
git add src/features/pet/Pet.tsx src/features/pet/Pet.test.tsx src/app/App.tsx
git commit -m "feat: wire pet dragging to native window"
git push
```

Expected:

- Commit succeeds.
- Push updates `origin/main`.

---

### Task 8: Save Window Position After Drag

**Files:**

- Modify: `src-tauri/src/window.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/app/App.tsx`
- Modify: `src/features/pet/Pet.tsx`
- Modify: `src/features/pet/Pet.test.tsx`

- [ ] **Step 1: Add save helper after drag completes**

Modify `src-tauri/src/window.rs` to add:

```rust
pub fn save_current_window_position(app: &AppHandle) -> Result<(), String> {
    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };

    let position = window
        .outer_position()
        .map_err(|error| format!("failed to read window position: {error}"))?;

    save_window_position(
        app.clone(),
        WindowPosition {
            x: position.x,
            y: position.y,
        },
    )
}
```

- [ ] **Step 2: Register close-time persistence**

Modify the `.setup` closure in `src-tauri/src/lib.rs`:

```rust
.setup(|app| {
    if let Some(window) = app.get_webview_window("main") {
        window.set_always_on_top(true)?;
        window.set_decorations(false)?;

        let app_handle = app.handle().clone();
        window.on_window_event(move |event| {
            if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                let _ = crate::window::save_current_window_position(&app_handle);
            }
        });
    }
    window::apply_saved_position(app.handle())?;
    Ok(())
})
```

- [ ] **Step 3: Add explicit save command**

Add this command to `src-tauri/src/window.rs`:

```rust
#[tauri::command]
pub fn save_current_position(app: AppHandle) -> Result<(), String> {
    save_current_window_position(&app)
}
```

Register it in `generate_handler!`:

```rust
window::save_current_position
```

- [ ] **Step 4: Update pet test for drag end callback**

Replace `src/features/pet/Pet.test.tsx` with:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { Pet } from "./Pet";

describe("Pet", () => {
  it("renders MiniShuya as an interactive character", () => {
    render(<Pet onDragStart={() => undefined} onDragEnd={() => undefined} />);

    expect(screen.getByRole("button", { name: "MiniShuya desktop pet" })).toBeInTheDocument();
    expect(screen.getByTestId("pet-face")).toBeInTheDocument();
    expect(screen.getByTestId("pet-body")).toBeInTheDocument();
  });

  it("calls onDragStart when pointer drag begins", () => {
    const onDragStart = vi.fn();
    render(<Pet onDragStart={onDragStart} onDragEnd={() => undefined} />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "MiniShuya desktop pet" }));

    expect(onDragStart).toHaveBeenCalledTimes(1);
  });

  it("calls onDragEnd when pointer drag ends", () => {
    const onDragEnd = vi.fn();
    render(<Pet onDragStart={() => undefined} onDragEnd={onDragEnd} />);

    fireEvent.pointerUp(screen.getByRole("button", { name: "MiniShuya desktop pet" }));

    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 5: Update pet drag props**

Modify `src/features/pet/Pet.tsx`:

```tsx
import { useState } from "react";

type PetMood = "idle" | "dragging";

type PetProps = {
  onDragStart: () => void;
  onDragEnd: () => void;
};

export function Pet({ onDragStart, onDragEnd }: PetProps) {
  const [mood, setMood] = useState<PetMood>("idle");

  const stopDragging = () => {
    setMood("idle");
    onDragEnd();
  };

  return (
    <button
      type="button"
      className={`pet pet--${mood}`}
      aria-label="MiniShuya desktop pet"
      onPointerDown={() => {
        setMood("dragging");
        onDragStart();
      }}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onPointerLeave={stopDragging}
    >
      <span className="pet__shadow" />
      <span className="pet__body" data-testid="pet-body">
        <span className="pet__neck" />
        <span className="pet__dress" />
        <span className="pet__arm pet__arm--left" />
        <span className="pet__arm pet__arm--right" />
      </span>
      <span className="pet__head" data-testid="pet-face">
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
    </button>
  );
}
```

- [ ] **Step 6: Connect drag end to native save command**

Modify `src/app/App.tsx`:

```tsx
import { invoke } from "@tauri-apps/api/core";
import { Pet } from "../features/pet/Pet";

export function App() {
  const handleDragStart = () => {
    void invoke("start_drag");
  };

  const handleDragEnd = () => {
    void invoke("save_current_position");
  };

  return (
    <main className="app-shell">
      <Pet onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
    </main>
  );
}
```

- [ ] **Step 7: Run Rust and frontend checks**

Run:

```powershell
cd src-tauri
cargo fmt
cargo test
cargo clippy
cd ..
pnpm test src/features/pet/Pet.test.tsx
pnpm build
```

Expected:

- All commands exit with code `0`.

- [ ] **Step 8: Manual verify persistence**

Run:

```powershell
pnpm tauri dev
```

Manual steps:

- Drag MiniShuya to a new screen position.
- Close the app window.
- Start `pnpm tauri dev` again.

Expected:

- MiniShuya opens at the previous position.

- [ ] **Step 9: Commit position save behavior**

Run:

```powershell
git status --short
git add src-tauri/src src/app/App.tsx src/features/pet/Pet.tsx src/features/pet/Pet.test.tsx
git commit -m "feat: save pet window position"
git push
```

Expected:

- Commit succeeds.
- Push updates `origin/main`.

---

### Task 9: Final Verification and README Checklist

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Run full automated checks**

Run:

```powershell
pnpm test
pnpm build
cd src-tauri
cargo fmt --check
cargo test
cargo clippy
```

Expected:

- All commands exit with code `0`.

- [ ] **Step 2: Run desktop manual verification**

Run:

```powershell
pnpm tauri dev
```

Manual checks:

- Transparent desktop window appears.
- Window has no frame.
- Window stays above normal windows.
- MiniShuya is visible as a cartoon humanoid.
- Idle animation is visible.
- Dragging moves the desktop pet.
- Restart restores the previous position.

- [ ] **Step 3: Record verification in README**

Add this section to `README.md`:

```markdown
## Current Status

Phase 1 demo is expected to support:

- Transparent frameless always-on-top window.
- Animated placeholder MiniShuya character.
- Mouse drag movement.
- Window position restore after restart.

Last verified commands:

```powershell
pnpm test
pnpm build
cd src-tauri
cargo test
```
```

- [ ] **Step 4: Commit final verification docs**

Run:

```powershell
git status --short
git add README.md
git commit -m "docs: document phase 1 verification"
git push
```

Expected:

- Commit succeeds.
- Push updates `origin/main`.

---

## Self-Review

Spec coverage:

- Phase 0 project initialization is covered by Tasks 1 and 2.
- Transparent frameless always-on-top window is covered by Task 5.
- Placeholder cartoon humanoid and idle animation are covered by Task 4.
- Drag behavior is covered by Task 7.
- Position persistence is covered by Tasks 6 and 8.
- README and verification instructions are covered by Tasks 2 and 9.
- Git/GitHub workflow is included in every task commit step.

Placeholder scan:

- The word "placeholder" is used only to describe the intentional first character asset strategy.
- The plan contains no unfinished-marker text.
- Each code-writing step includes concrete code or exact expected configuration.

Type consistency:

- Frontend position types use `PetPosition` and `ViewportSize`.
- Rust position type uses `WindowPosition`.
- Tauri commands are consistently named `load_window_position`, `save_window_position`, `start_drag`, and optionally `save_current_position`.
