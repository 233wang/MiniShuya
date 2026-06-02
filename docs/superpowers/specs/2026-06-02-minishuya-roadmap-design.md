# MiniShuya Project Roadmap Design

## Overview

MiniShuya is a Windows desktop pet application. The long-term goal is a cartoon humanoid companion that can stay on the desktop, be dragged and petted, change outfits, chat through an LLM, and react to user keyboard activity with matching typing animations.

The project starts from an empty repository. The first priority is to create a maintainable technical foundation and a visible minimum demo before adding complex behavior.

## Technical Stack

The recommended stack is:

- Tauri 2 for the Windows desktop shell.
- React for the UI layer.
- TypeScript for frontend application code.
- Rust for native desktop features.
- pnpm for JavaScript package management.
- SVG, HTML, and CSS animations for the first character prototype.

This stack keeps the first demo lightweight while preserving access to Windows-native capabilities such as transparent always-on-top windows, system tray integration, global keyboard listening, local storage, and packaging.

Live2D or another richer animation system may be introduced later, but it should not block the first demo.

## Development Environment

Required local tools:

- VS Code.
- Git.
- Node.js.
- pnpm.
- Rust and rustup.
- Microsoft Visual Studio C++ Build Tools.
- Microsoft Edge WebView2 Runtime.

The project should document these requirements in `README.md` and lock core tooling in project files where practical:

- `packageManager` in `package.json`.
- `rust-toolchain.toml` for Rust channel selection.
- `.vscode/extensions.json` for recommended extensions.

## Milestones

### Phase 0: Project Initialization

Goal: create a maintainable project skeleton.

Scope:

- Initialize a Tauri 2 + React + TypeScript app.
- Configure pnpm scripts.
- Add Rust toolchain configuration.
- Add VS Code recommendations.
- Add README setup and development instructions.
- Initialize git and connect to GitHub.
- Verify the app can run with `pnpm tauri dev`.

### Phase 1: Minimum Desktop Pet Demo

Goal: make MiniShuya visible and movable on the desktop.

Scope:

- Transparent frameless window.
- Always-on-top behavior.
- Cartoon humanoid placeholder character.
- Mouse drag to move the pet.
- Simple idle animation such as blinking, breathing, or gentle swaying.
- Persist and restore the last window position.

Acceptance criteria:

- `pnpm tauri dev` starts the desktop pet.
- A transparent desktop pet window appears.
- The pet can be dragged.
- The pet has an idle animation.
- The last position is restored after restart.

### Phase 2: Basic Interaction

Goal: make the pet react to user interaction.

Scope:

- Hover, click, and petting region detection.
- Character expressions such as normal, happy, shy, and confused.
- Speech bubble text.
- Basic state machine: `idle`, `dragging`, `petting`, and `talking`.
- Context menu with hide, outfit, settings, and exit actions.

### Phase 3: Keyboard Linkage

Goal: make MiniShuya type along with the user.

Scope:

- Rust-side global keyboard listener.
- Frontend keyboard event bridge.
- Typing animation state.
- Animation tempo based on typing rhythm.
- Privacy controls to pause listening and avoid storing typed content.

### Phase 4: LLM Multi-Turn Chat

Goal: enable natural conversation with MiniShuya.

Scope:

- Chat input and response UI.
- OpenAI-compatible API configuration.
- Multi-turn context handling.
- Local chat history.
- Character prompt and personality settings.
- Local API key storage.
- Error states for network failure, timeout, and invalid configuration.

### Phase 5: Wardrobe and Character Asset System

Goal: make the character visually extensible.

Scope:

- Outfit asset directory.
- Layered character parts such as hair, clothing, expression, and props.
- Wardrobe panel.
- Persist selected outfit.
- Keep room for future Live2D or Spine integration.

### Phase 6: Productization

Goal: turn the demo into a usable desktop application.

Scope:

- System tray.
- Optional launch at startup.
- Settings screen.
- Packaging installer.
- Basic diagnostics and logs.
- Optional automatic updates.

## Initial Architecture

The frontend owns visual presentation, animation state, interaction UI, and chat UI. The Rust backend owns native window operations, keyboard listening, storage-sensitive commands, tray integration, and future OS-specific features.

Suggested layout:

```text
MiniShuya/
  src/
    app/
    components/
    features/
      pet/
      chat/
      wardrobe/
      settings/
    lib/
    styles/
  src-tauri/
    src/
      commands/
      keyboard/
      window/
      storage/
  public/
    assets/
      pet/
      outfits/
  docs/
  README.md
  package.json
  rust-toolchain.toml
```

## Data and Event Flow

Frontend interactions such as drag, petting, outfit selection, and chat input update local UI state first. When native behavior is required, the frontend calls Tauri commands exposed by Rust.

Keyboard events originate in Rust, are filtered for privacy, then emitted to the frontend as abstract typing activity. The frontend does not need to receive or store the full typed text for typing animations.

LLM chat requests originate in the frontend, pass through a dedicated chat service layer, and use locally configured provider settings. API keys should be stored locally and should not be committed.

## Error Handling

The application should degrade gracefully:

- If keyboard listening fails, the pet still runs without typing linkage.
- If LLM configuration is missing or invalid, chat UI shows a setup prompt instead of crashing.
- If position persistence fails, the app falls back to a default screen position.
- If assets are missing, the app renders a built-in placeholder character.

## Testing and Verification

Early testing should focus on behavior that can break the desktop experience:

- Project starts successfully in development mode.
- Window transparency and drag behavior work on Windows.
- Position persistence survives restart.
- Keyboard listener can be enabled and disabled.
- LLM chat handles failed requests without freezing the UI.

Automated tests can start small:

- TypeScript unit tests for state transitions and utility logic.
- Rust unit tests for pure helper functions.
- Manual verification checklist for desktop-window behavior.

## Git and GitHub Workflow

All project changes should be committed through git with clear commit messages. The recommended commit style is Conventional Commits:

- `docs: add initial project roadmap`
- `chore: initialize tauri project`
- `feat: add draggable desktop pet window`
- `fix: restore saved window position`

The local repository should be connected to a GitHub remote before implementation begins. After that, changes should be committed locally and pushed to GitHub regularly.

## First Implementation Target

The first implementation target is Phase 0 and Phase 1 only:

1. Initialize the Tauri 2 + React + TypeScript project.
2. Configure tooling and documentation.
3. Build the transparent, always-on-top, draggable desktop pet window.
4. Render a simple animated placeholder character.
5. Persist the last window position.

LLM chat, keyboard linkage, and wardrobe features are intentionally deferred until the foundation is stable.
