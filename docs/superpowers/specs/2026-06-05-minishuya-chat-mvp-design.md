# MiniShuya Chat MVP Design

## Overview

MiniShuya has a stable desktop-pet foundation: a transparent always-on-top window, draggable character, persisted position, right-click exit menu, action states, image frames, and alpha-based click-through hit testing. The next MVP step is to make MiniShuya useful as a gentle desktop companion by adding large-model chat through an OpenAI-compatible API.

This phase should produce a usable chat loop, not a full assistant platform. The pet remains small and calm on the desktop. Chat, settings, memory, and context controls should feel like quiet supporting tools around the character rather than a large generic web app.

## Goals

- Add OpenAI-compatible chat through a Rust-side request proxy.
- Support provider configuration for cloud APIs such as Qwen, DeepSeek, OpenAI-compatible local services, and similar endpoints.
- Add a compact chat panel UI that can be opened from the pet menu.
- Add a compact model settings UI.
- Support multi-turn conversation with locally persisted message history.
- Add a transparent, user-visible memory mechanism.
- Define and implement a deterministic context-window budget strategy.
- Preserve current desktop-pet behavior: transparent click-through, drag, saved position, right-click menu, taskbar visibility, and current action animations.

## Non-Goals

- No knowledge-base retrieval.
- No multi-character persona system.
- No voice input or speech output.
- No streaming response requirement for the first MVP.
- No cloud sync.
- No automatic secret upload or telemetry.
- No built-in provider account management.
- No complex prompt-template editor.
- No new action animations or gameplay systems in this phase.

## Current Baseline

The current application already includes:

- Tauri 2, React, TypeScript, Rust, and pnpm.
- Transparent frameless always-on-top pet window.
- Manual window movement and position persistence.
- Right-click menu with `退出`.
- Pet action state machine and image-frame playback.
- Rust hit testing aligned to the currently rendered character frame.
- Local app config directory use for `window-position.json`.

The current application does not yet include:

- Chat UI.
- Model/API settings.
- Conversation storage.
- Memory storage.
- System tray or hide/show controls.
- Startup controls.

For this MVP, chat is the main line. Tray and startup can follow after the chat loop unless implementation reveals that hide/show is required to make the chat panel manageable.

## Recommended Architecture

Use a Rust-side OpenAI-compatible proxy:

- React owns UI state, panel visibility, form state, and optimistic message rendering.
- Rust owns local settings persistence, API-key handling, HTTP requests, conversation persistence, memory persistence, and context assembly helpers where secret-bearing config is needed.
- Shared request and response shapes are kept simple and serializable through Tauri commands.

This avoids exposing API keys directly in frontend application code and leaves room for provider-specific compatibility fixes as concrete provider issues are discovered.

## Feature Surface

### Pet Menu

The right-click menu should expand from a single exit action to a compact command menu:

- `聊天`: opens or focuses the chat panel.
- `设置`: opens model settings.
- `隐藏`: hides the pet window when system tray support exists. If tray is deferred, omit this item for the first chat MVP.
- `退出`: saves position and exits.

The menu must stay compact and must not cover the character artwork more than necessary. The menu remains usable only when visible, preserving the current native menu hit region behavior.

### Chat Panel

The chat panel is a small companion panel attached near the pet window. It should not become a large centered app window.

Required states:

- Empty state: shows a short first-message prompt and indicates that model settings are required if missing.
- Ready state: shows message history, input, and send button.
- Sending state: disables duplicate send, shows that MiniShuya is thinking, and keeps the typed message visible.
- Error state: shows a concise recoverable error near the composer.
- Missing settings state: provides a direct path to settings.

Required controls:

- Message list.
- Multiline input with Enter to send and Shift+Enter for newline.
- Send button.
- Settings button or menu path.
- Clear conversation action, guarded by confirmation.

The panel should use restrained product UI styling: readable text, standard form controls, visible focus states, and no decorative card-heavy layout. The character remains the personality anchor.

### Model Settings

Settings should be local and compact:

- `baseUrl`: OpenAI-compatible endpoint base URL.
- `apiKey`: secret token.
- `model`: model id such as `deepseek-chat`, `qwen-plus`, or another provider-specific name.
- `temperature`: number, default `0.7`.
- `maxContextTokens`: number, default `6000`.
- `memoryEnabled`: boolean, default `true`.

The MVP should validate obvious input problems:

- `baseUrl` is required before sending.
- `apiKey` is required before sending.
- `model` is required before sending.
- `temperature` must be within `0` to `2`.
- `maxContextTokens` must be a positive number.

The settings UI should not try to validate every provider-specific URL shape. Providers differ, and OpenAI-compatible services often use custom paths.

## OpenAI-Compatible API Contract

Rust should send a Chat Completions compatible request:

```json
{
  "model": "model-name",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "temperature": 0.7
}
```

The endpoint should be derived conservatively:

- If `baseUrl` ends with `/chat/completions`, use it directly.
- Otherwise append `/chat/completions` after trimming trailing slashes.

The MVP response parser should support the common shape:

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "..."
      }
    }
  ]
}
```

If the provider returns a non-2xx status, invalid JSON, empty choices, or empty content, Rust returns a user-facing error string to the frontend.

## Conversation Model

Persist one default local conversation for the MVP.

Message shape:

```ts
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};
```

Conversation file:

```text
<app-config-dir>/conversation.json
```

Conversation persistence should be simple:

- Load on app start or when chat panel first opens.
- Save after appending a user message.
- Save after receiving an assistant response.
- Preserve messages after app restart.
- Clear conversation by replacing it with an empty message list.

## Memory Model

The MVP memory should be visible and controllable, not hidden magic.

Use two memory fields:

```ts
type ChatMemory = {
  profile: string;
  summary: string;
  updatedAt: string | null;
};
```

Memory file:

```text
<app-config-dir>/chat-memory.json
```

### Profile Memory

`profile` is a user-editable text field for stable preferences and facts, for example:

- The user's preferred name.
- Preferred response language.
- Persistent likes or dislikes.
- Work style preferences.

Settings should expose this field when `memoryEnabled` is on.

### Summary Memory

`summary` is an automatically maintained short summary of older conversation once history grows beyond the context budget.

For the first MVP, summary maintenance can be deterministic and lightweight:

- If recent messages fit inside the context budget, keep the existing summary unchanged.
- If messages exceed the budget, ask the model to summarize older messages into a concise memory paragraph.
- Store the returned summary locally.
- Keep recent messages intact.

If the summary request fails, do not block the user message. Fall back to sending the latest messages that fit within the context budget and show a non-blocking warning only if needed.

## Context Window Strategy

Context assembly must be deterministic and testable.

The prompt order is:

1. System prompt.
2. Profile memory, when enabled and non-empty.
3. Summary memory, when enabled and non-empty.
4. Recent conversation messages, newest preserved while staying under budget.
5. Current user message.

System prompt:

```text
你是 MiniShuya，一个小巧、温和、安静的 Windows 桌面伙伴。你说中文，语气亲近但不过度热闹。你优先给出有帮助、简洁、可执行的回答。不要假装知道用户没有告诉你的事实。
```

Budgeting can use an approximate token estimator for MVP:

```ts
approxTokens = Math.ceil(text.length / 3)
```

This approximation is acceptable for a first MVP because target providers may use different tokenizers. The implementation must leave margin by using only about 85% of `maxContextTokens` for assembled content.

Rules:

- The current user message is always included.
- System prompt is always included.
- Profile and summary memory are included before recent messages when enabled.
- Recent messages are included from newest to oldest, then restored to chronological order in the final request.
- If a single current user message exceeds the budget, send it anyway and let the provider return a model-length error.
- Context assembly should be covered by unit tests.

## Rust Commands

Add commands:

- `load_chat_settings() -> ChatSettings`
- `save_chat_settings(settings: ChatSettings) -> Result<(), String>`
- `load_conversation() -> Conversation`
- `clear_conversation() -> Result<(), String>`
- `send_chat_message(content: String) -> ChatSendResult`
- `load_chat_memory() -> ChatMemory`
- `save_chat_memory(memory: ChatMemory) -> Result<(), String>`

`send_chat_message` should:

1. Load settings.
2. Validate settings.
3. Load conversation.
4. Load memory when enabled.
5. Append the user message.
6. Assemble context.
7. Call the OpenAI-compatible endpoint.
8. Append the assistant response.
9. Save conversation.
10. Return the appended user and assistant messages plus memory status.

The command should use timeout-aware HTTP behavior. A practical MVP timeout is 60 seconds.

## File Structure

Frontend:

```text
src/features/chat/
  ChatPanel.tsx
  ChatPanel.test.tsx
  chatTypes.ts
  chatState.ts
  chatState.test.ts

src/features/settings/
  ModelSettingsPanel.tsx
  ModelSettingsPanel.test.tsx
  settingsTypes.ts

src/app/App.tsx
src/features/pet/Pet.tsx
src/styles/global.css
```

Rust:

```text
src-tauri/src/chat.rs
src-tauri/src/chat_context.rs
src-tauri/src/chat_context_tests.rs
src-tauri/src/chat_storage.rs
src-tauri/src/chat_storage_tests.rs
src-tauri/src/lib.rs
src-tauri/Cargo.toml
```

The split keeps context assembly and local storage testable without requiring network access.

## Error Handling

Frontend should handle:

- Missing settings.
- Network timeout.
- Provider non-2xx response.
- Invalid provider response.
- Empty assistant response.
- Local storage read/write failure.

Errors should be concise and actionable:

- `请先在设置里填写 API 地址、Key 和模型名称。`
- `模型请求超时，请稍后再试。`
- `服务返回错误：<status>`
- `没有读取到模型回复，请检查模型接口是否兼容。`

The application should not crash if chat fails. The pet should remain draggable and exit should remain available.

## Testing Strategy

Frontend tests:

- Chat panel empty state.
- Missing settings path opens settings.
- Sending disables duplicate send.
- User and assistant messages render in order.
- Error message renders without losing draft input.
- Settings validation displays required-field errors.
- Existing pet menu, drag, and hit-region behavior continues to pass.

Rust tests:

- Settings validation.
- Conversation load returns empty conversation when file is missing.
- Conversation save/load round trip.
- Memory save/load round trip.
- Context assembly includes system prompt and current user message.
- Context assembly includes profile and summary when enabled.
- Context assembly keeps newest recent messages under budget.
- Context assembly preserves chronological order.
- Endpoint URL derivation handles both base URLs and full `/chat/completions` URLs.

Manual verification:

- Run `pnpm tauri dev`.
- Open right-click menu and launch chat.
- Configure a compatible provider.
- Send a first message and receive a response.
- Send a follow-up and verify the assistant sees prior context.
- Restart the app and verify conversation persists.
- Edit memory profile and verify it affects the next response.
- Clear conversation and verify the panel returns to empty state.
- Confirm pet drag, click-through, menu, and exit still work.

## Acceptance Criteria

- MiniShuya can send and receive messages through an OpenAI-compatible API.
- The user can configure `baseUrl`, `apiKey`, `model`, `temperature`, `maxContextTokens`, and memory on/off.
- Conversation history persists locally across restart.
- Multi-turn context works for follow-up questions.
- Memory is visible, editable, and can be disabled.
- Context assembly is deterministic and covered by tests.
- Chat and settings UI are compact, readable, and do not turn the pet into a large generic app window.
- Existing desktop pet behavior remains intact.
