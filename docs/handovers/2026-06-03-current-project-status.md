# MiniShuya Current Project Status

## Project Info

- Project name: `MiniShuya`
- Project path: `E:\DaliySoftware\CodeXProject\MiniShuya`
- Project type: Windows desktop pet
- Tech stack: `Tauri 2 + React + TypeScript + Rust + pnpm`
- Reply language preference: Chinese

## GitHub Status

- GitHub repository: `git@github.com:233wang/MiniShuya.git`
- Main branch: `main`
- Main repository state: pushed to GitHub
- Completed commits:
  - `852810d docs: add initial project roadmap`
  - `155bcc9 docs: add phase 0 and 1 implementation plan`
  - `057262c chore: ignore local worktrees`

GitHub SSH key:

- Private key path: `C:\Users\wangjian\.ssh\id_ed25519_github`
- The public key has been added to GitHub.

GitHub network access:

- This repository uses a project-level SSH configuration.
- GitHub access goes through local proxy `127.0.0.1:7892`.
- Proxy process observed earlier: `yeshayunCore.exe`.
- Push to GitHub has been verified successfully.

## Documentation Status

Created and pushed:

- Roadmap design:
  - `docs/superpowers/specs/2026-06-02-minishuya-roadmap-design.md`
- Phase 0/1 implementation plan:
  - `docs/superpowers/plans/2026-06-02-minishuya-phase-0-1.md`

Phase 0/1 goals:

- Initialize Tauri + React + TypeScript project.
- Configure tooling and README.
- Build a transparent, frameless, always-on-top desktop pet window.
- Render a placeholder cartoon humanoid character.
- Add idle animation.
- Add drag behavior.
- Persist and restore window position.

## Worktree Status

An isolated worktree has been created:

```text
E:\DaliySoftware\CodeXProject\MiniShuya\.worktrees\phase-0-1
```

Feature branch:

```text
feat/phase-0-1-demo
```

Created with:

```powershell
git worktree add .worktrees\phase-0-1 -b feat/phase-0-1-demo
```

`.worktrees/` has been added to `.gitignore`, committed, and pushed to `main`.

## Current Implementation Progress

Currently executing:

```text
Task 1: Scaffold Tauri React TypeScript Project
```

Completed:

- Created isolated worktree.
- Successfully generated the Tauri scaffold in the worktree with:

```powershell
pnpm create tauri-app . --template react-ts --manager pnpm --identifier com.minishuya.app --tauri-version 2 --yes --force
```

Successful output included:

```text
Template created!
```

Not completed yet:

- `pnpm install`
- `pnpm build`
- Commit scaffold
- Push `feat/phase-0-1-demo`

## pnpm Configuration

The user requested pnpm cache and store not be placed on drive C.

Configured base directory:

```text
E:\DaliySoftware\pnpm_install\
```

Created directories:

```text
E:\DaliySoftware\pnpm_install\store
E:\DaliySoftware\pnpm_install\cache
E:\DaliySoftware\pnpm_install\state
E:\DaliySoftware\pnpm_install\home
```

Confirmed pnpm config:

```text
store-dir: E:\DaliySoftware\pnpm_install\store
cache-dir: E:\DaliySoftware\pnpm_install\cache
state-dir: E:\DaliySoftware\pnpm_install\state
PNPM_HOME: E:\DaliySoftware\pnpm_install\home
```

Note:

- `PNPM_HOME` is set as a user environment variable.
- A newly opened PowerShell or VS Code terminal should fully inherit it.

## Suggested Next Steps

Continue from the worktree:

```powershell
cd E:\DaliySoftware\CodeXProject\MiniShuya\.worktrees\phase-0-1
```

Check state:

```powershell
git status --short --branch
pnpm config get store-dir
pnpm config get cache-dir
pnpm config get state-dir
```

Continue Task 1:

```powershell
pnpm install
pnpm build
git status --short
git add .
git commit -m "chore: initialize tauri react project"
git push -u origin feat/phase-0-1-demo
```

If `pnpm install` fails because of sandbox permissions, rerun it with elevated permission. This is expected because dependency installation writes `node_modules`, lockfiles, temporary files, and pnpm store/cache data.
