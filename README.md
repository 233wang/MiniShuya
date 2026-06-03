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
