# MiniShuya Chat MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a compact OpenAI-compatible chat MVP for MiniShuya with local settings, multi-turn conversation history, visible memory, deterministic context budgeting, and restrained desktop-pet UI.

**Architecture:** React owns panel visibility, form state, rendering, and optimistic UI. Rust owns local persistence, settings validation, context assembly, OpenAI-compatible HTTP calls, and secret-bearing API configuration. Existing pet drag, action animation, and alpha hit-test behavior stay intact.

**Tech Stack:** Tauri 2, React 19, TypeScript, Rust 2021, serde, serde_json, reqwest, Vitest, React Testing Library, Rust unit tests.

---

## File Structure

Create these Rust files:

- `src-tauri/src/chat.rs`: Tauri commands, settings validation, OpenAI-compatible request/response, send-message orchestration.
- `src-tauri/src/chat_context.rs`: system prompt, approximate token budgeting, context assembly, endpoint URL derivation.
- `src-tauri/src/chat_storage.rs`: app-config-dir file paths and JSON load/save helpers.
- `src-tauri/src/chat_context_tests.rs`: unit tests for context assembly and URL derivation.
- `src-tauri/src/chat_storage_tests.rs`: unit tests for default values and JSON round trips using temporary directories.

Modify these Rust files:

- `src-tauri/src/lib.rs`: register chat modules, tests, and Tauri commands.
- `src-tauri/Cargo.toml`: add `reqwest` dependency.

Create these frontend files:

- `src/features/chat/chatTypes.ts`: shared TypeScript chat/settings/memory types.
- `src/features/chat/chatState.ts`: pure helpers for message ordering, validation, optimistic append, and error labels.
- `src/features/chat/chatState.test.ts`: unit tests for chat helpers.
- `src/features/chat/ChatPanel.tsx`: compact chat panel.
- `src/features/chat/ChatPanel.test.tsx`: UI tests for empty, sending, error, and message rendering states.
- `src/features/settings/ModelSettingsPanel.tsx`: compact provider and memory settings panel.
- `src/features/settings/ModelSettingsPanel.test.tsx`: UI tests for validation and save behavior.

Modify these frontend files:

- `src/app/App.tsx`: panel state, Tauri command calls, chat/settings integration.
- `src/features/pet/Pet.tsx`: menu actions for `聊天`, `设置`, and `退出`.
- `src/features/pet/Pet.test.tsx`: update menu tests and add open-chat/open-settings coverage.
- `src/styles/global.css`: chat/settings panel styling and updated menu styling.

---

### Task 1: Rust Chat Storage

**Files:**
- Create: `src-tauri/src/chat_storage.rs`
- Create: `src-tauri/src/chat_storage_tests.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write failing storage tests**

Create `src-tauri/src/chat_storage_tests.rs` with:

```rust
use crate::chat_storage::{
    default_chat_memory, default_chat_settings, load_chat_memory_from_dir,
    load_chat_settings_from_dir, load_conversation_from_dir, save_chat_memory_to_dir,
    save_chat_settings_to_dir, save_conversation_to_dir, ChatMemory, ChatMessage, ChatRole,
    ChatSettings, Conversation,
};

fn unique_temp_dir(name: &str) -> std::path::PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "minishuya-{name}-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("clock should be valid")
            .as_nanos()
    ));
    std::fs::create_dir_all(&dir).expect("temp dir should be created");
    dir
}

#[test]
fn missing_files_return_defaults() {
    let dir = unique_temp_dir("missing-chat-files");

    assert_eq!(load_chat_settings_from_dir(&dir).unwrap(), default_chat_settings());
    assert_eq!(
        load_chat_memory_from_dir(&dir).unwrap(),
        default_chat_memory()
    );
    assert_eq!(
        load_conversation_from_dir(&dir).unwrap(),
        Conversation { messages: vec![] }
    );
}

#[test]
fn saves_and_loads_chat_settings() {
    let dir = unique_temp_dir("settings-round-trip");
    let settings = ChatSettings {
        base_url: "https://api.deepseek.com/v1".to_string(),
        api_key: "secret".to_string(),
        model: "deepseek-chat".to_string(),
        temperature: 0.4,
        max_context_tokens: 4096,
        memory_enabled: true,
    };

    save_chat_settings_to_dir(&dir, &settings).unwrap();

    assert_eq!(load_chat_settings_from_dir(&dir).unwrap(), settings);
}

#[test]
fn saves_and_loads_conversation() {
    let dir = unique_temp_dir("conversation-round-trip");
    let conversation = Conversation {
        messages: vec![
            ChatMessage {
                id: "u1".to_string(),
                role: ChatRole::User,
                content: "你好".to_string(),
                created_at: "2026-06-05T10:00:00Z".to_string(),
            },
            ChatMessage {
                id: "a1".to_string(),
                role: ChatRole::Assistant,
                content: "我在。".to_string(),
                created_at: "2026-06-05T10:00:01Z".to_string(),
            },
        ],
    };

    save_conversation_to_dir(&dir, &conversation).unwrap();

    assert_eq!(load_conversation_from_dir(&dir).unwrap(), conversation);
}

#[test]
fn saves_and_loads_memory() {
    let dir = unique_temp_dir("memory-round-trip");
    let memory = ChatMemory {
        profile: "用户喜欢简洁回答。".to_string(),
        summary: "用户正在开发 MiniShuya。".to_string(),
        updated_at: Some("2026-06-05T10:00:00Z".to_string()),
    };

    save_chat_memory_to_dir(&dir, &memory).unwrap();

    assert_eq!(load_chat_memory_from_dir(&dir).unwrap(), memory);
}
```

- [ ] **Step 2: Wire tests into `src-tauri/src/lib.rs`**

Add these module declarations near existing test modules:

```rust
mod chat_storage;

#[cfg(test)]
mod chat_storage_tests;
```

- [ ] **Step 3: Run storage tests and verify failure**

Run:

```powershell
cd src-tauri
cargo test chat_storage
```

Expected: FAIL because `chat_storage` does not exist yet.

- [ ] **Step 4: Implement storage module**

Create `src-tauri/src/chat_storage.rs` with:

```rust
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const CHAT_SETTINGS_FILE: &str = "chat-settings.json";
const CONVERSATION_FILE: &str = "conversation.json";
const CHAT_MEMORY_FILE: &str = "chat-memory.json";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSettings {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub temperature: f32,
    pub max_context_tokens: usize,
    pub memory_enabled: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMemory {
    pub profile: String,
    pub summary: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ChatRole {
    User,
    Assistant,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub id: String,
    pub role: ChatRole,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    pub messages: Vec<ChatMessage>,
}

pub fn default_chat_settings() -> ChatSettings {
    ChatSettings {
        base_url: String::new(),
        api_key: String::new(),
        model: String::new(),
        temperature: 0.7,
        max_context_tokens: 6000,
        memory_enabled: true,
    }
}

pub fn default_chat_memory() -> ChatMemory {
    ChatMemory {
        profile: String::new(),
        summary: String::new(),
        updated_at: None,
    }
}

pub fn app_config_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("failed to resolve app config dir: {error}"))?;
    fs::create_dir_all(&dir)
        .map_err(|error| format!("failed to create app config dir: {error}"))?;
    Ok(dir)
}

fn read_json_or_default<T: for<'de> Deserialize<'de>>(
    file: &Path,
    default_value: T,
) -> Result<T, String> {
    if !file.exists() {
        return Ok(default_value);
    }

    let content = fs::read_to_string(file)
        .map_err(|error| format!("failed to read {}: {error}", file.display()))?;
    serde_json::from_str(&content)
        .map_err(|error| format!("invalid JSON in {}: {error}", file.display()))
}

fn write_json<T: Serialize>(file: &Path, value: &T) -> Result<(), String> {
    if let Some(parent) = file.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("failed to create {}: {error}", parent.display()))?;
    }

    let content = serde_json::to_string_pretty(value)
        .map_err(|error| format!("failed to serialize {}: {error}", file.display()))?;
    fs::write(file, content).map_err(|error| format!("failed to write {}: {error}", file.display()))
}

pub fn load_chat_settings_from_dir(dir: &Path) -> Result<ChatSettings, String> {
    read_json_or_default(&dir.join(CHAT_SETTINGS_FILE), default_chat_settings())
}

pub fn save_chat_settings_to_dir(dir: &Path, settings: &ChatSettings) -> Result<(), String> {
    write_json(&dir.join(CHAT_SETTINGS_FILE), settings)
}

pub fn load_conversation_from_dir(dir: &Path) -> Result<Conversation, String> {
    read_json_or_default(&dir.join(CONVERSATION_FILE), Conversation { messages: vec![] })
}

pub fn save_conversation_to_dir(dir: &Path, conversation: &Conversation) -> Result<(), String> {
    write_json(&dir.join(CONVERSATION_FILE), conversation)
}

pub fn load_chat_memory_from_dir(dir: &Path) -> Result<ChatMemory, String> {
    read_json_or_default(&dir.join(CHAT_MEMORY_FILE), default_chat_memory())
}

pub fn save_chat_memory_to_dir(dir: &Path, memory: &ChatMemory) -> Result<(), String> {
    write_json(&dir.join(CHAT_MEMORY_FILE), memory)
}
```

- [ ] **Step 5: Run storage tests and verify pass**

Run:

```powershell
cd src-tauri
cargo test chat_storage
```

Expected: PASS for storage tests.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src-tauri/src/lib.rs src-tauri/src/chat_storage.rs src-tauri/src/chat_storage_tests.rs
git commit -m "feat: add chat storage"
```

---

### Task 2: Rust Context Assembly

**Files:**
- Create: `src-tauri/src/chat_context.rs`
- Create: `src-tauri/src/chat_context_tests.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write failing context tests**

Create `src-tauri/src/chat_context_tests.rs` with:

```rust
use crate::chat_context::{
    approximate_tokens, build_chat_completions_url, build_context_messages,
    OPENAI_COMPATIBLE_PATH, SYSTEM_PROMPT,
};
use crate::chat_storage::{ChatMemory, ChatMessage, ChatRole, ChatSettings, Conversation};

fn settings(max_context_tokens: usize, memory_enabled: bool) -> ChatSettings {
    ChatSettings {
        base_url: "https://api.deepseek.com/v1".to_string(),
        api_key: "secret".to_string(),
        model: "deepseek-chat".to_string(),
        temperature: 0.7,
        max_context_tokens,
        memory_enabled,
    }
}

fn message(id: &str, role: ChatRole, content: &str) -> ChatMessage {
    ChatMessage {
        id: id.to_string(),
        role,
        content: content.to_string(),
        created_at: format!("2026-06-05T10:00:{id}Z"),
    }
}

#[test]
fn estimates_tokens_from_text_length() {
    assert_eq!(approximate_tokens(""), 0);
    assert_eq!(approximate_tokens("abc"), 1);
    assert_eq!(approximate_tokens("abcd"), 2);
}

#[test]
fn derives_chat_completions_url() {
    assert_eq!(
        build_chat_completions_url("https://api.deepseek.com/v1").unwrap(),
        format!("https://api.deepseek.com/v1{OPENAI_COMPATIBLE_PATH}")
    );
    assert_eq!(
        build_chat_completions_url("https://dashscope.aliyuncs.com/compatible-mode/v1/").unwrap(),
        format!(
            "https://dashscope.aliyuncs.com/compatible-mode/v1{OPENAI_COMPATIBLE_PATH}"
        )
    );
    assert_eq!(
        build_chat_completions_url("https://example.com/v1/chat/completions").unwrap(),
        "https://example.com/v1/chat/completions"
    );
}

#[test]
fn includes_system_prompt_and_current_user_message() {
    let messages = build_context_messages(
        &settings(6000, true),
        &Conversation { messages: vec![] },
        &ChatMemory {
            profile: String::new(),
            summary: String::new(),
            updated_at: None,
        },
        "你好",
    );

    assert_eq!(messages.first().unwrap().role, "system");
    assert!(messages.first().unwrap().content.contains(SYSTEM_PROMPT));
    assert_eq!(messages.last().unwrap().role, "user");
    assert_eq!(messages.last().unwrap().content, "你好");
}

#[test]
fn includes_profile_and_summary_when_memory_enabled() {
    let messages = build_context_messages(
        &settings(6000, true),
        &Conversation { messages: vec![] },
        &ChatMemory {
            profile: "用户喜欢中文简洁回答。".to_string(),
            summary: "用户正在开发桌宠。".to_string(),
            updated_at: Some("2026-06-05T10:00:00Z".to_string()),
        },
        "继续",
    );

    let system = &messages[0].content;
    assert!(system.contains("用户记忆"));
    assert!(system.contains("用户喜欢中文简洁回答。"));
    assert!(system.contains("对话摘要"));
    assert!(system.contains("用户正在开发桌宠。"));
}

#[test]
fn omits_memory_when_disabled() {
    let messages = build_context_messages(
        &settings(6000, false),
        &Conversation { messages: vec![] },
        &ChatMemory {
            profile: "用户喜欢中文简洁回答。".to_string(),
            summary: "用户正在开发桌宠。".to_string(),
            updated_at: Some("2026-06-05T10:00:00Z".to_string()),
        },
        "继续",
    );

    assert!(!messages[0].content.contains("用户记忆"));
    assert!(!messages[0].content.contains("对话摘要"));
}

#[test]
fn keeps_newest_recent_messages_under_budget_and_preserves_order() {
    let conversation = Conversation {
        messages: vec![
            message("01", ChatRole::User, "这是一条很早以前的长消息，会被预算裁剪。"),
            message("02", ChatRole::Assistant, "这也是旧回复，会被裁剪。"),
            message("03", ChatRole::User, "最近问题"),
            message("04", ChatRole::Assistant, "最近回答"),
        ],
    };

    let messages = build_context_messages(
        &settings(80, false),
        &conversation,
        &ChatMemory {
            profile: String::new(),
            summary: String::new(),
            updated_at: None,
        },
        "当前问题",
    );

    let contents = messages
        .iter()
        .map(|message| message.content.as_str())
        .collect::<Vec<_>>();

    assert!(contents.contains(&"最近问题"));
    assert!(contents.contains(&"最近回答"));
    assert!(contents.contains(&"当前问题"));
    assert!(!contents.contains(&"这是一条很早以前的长消息，会被预算裁剪。"));
    assert!(
        contents
            .iter()
            .position(|content| *content == "最近问题")
            .unwrap()
            < contents
                .iter()
                .position(|content| *content == "最近回答")
                .unwrap()
    );
}
```

- [ ] **Step 2: Wire tests into `src-tauri/src/lib.rs`**

Add:

```rust
mod chat_context;

#[cfg(test)]
mod chat_context_tests;
```

- [ ] **Step 3: Run context tests and verify failure**

Run:

```powershell
cd src-tauri
cargo test chat_context
```

Expected: FAIL because `chat_context` does not exist yet.

- [ ] **Step 4: Implement context module**

Create `src-tauri/src/chat_context.rs` with:

```rust
use serde::{Deserialize, Serialize};

use crate::chat_storage::{ChatMemory, ChatRole, ChatSettings, Conversation};

pub const OPENAI_COMPATIBLE_PATH: &str = "/chat/completions";
pub const SYSTEM_PROMPT: &str = "你是 MiniShuya，一个小巧、温和、安静的 Windows 桌面伙伴。你说中文，语气亲近但不过度热闹。你优先给出有帮助、简洁、可执行的回答。不要假装知道用户没有告诉你的事实。";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OpenAiMessage {
    pub role: String,
    pub content: String,
}

pub fn approximate_tokens(text: &str) -> usize {
    if text.is_empty() {
        return 0;
    }

    text.chars().count().div_ceil(3)
}

pub fn build_chat_completions_url(base_url: &str) -> Result<String, String> {
    let trimmed = base_url.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Err("请先在设置里填写 API 地址、Key 和模型名称。".to_string());
    }

    if trimmed.ends_with(OPENAI_COMPATIBLE_PATH) {
        return Ok(trimmed.to_string());
    }

    Ok(format!("{trimmed}{OPENAI_COMPATIBLE_PATH}"))
}

fn role_to_openai(role: ChatRole) -> &'static str {
    match role {
        ChatRole::User => "user",
        ChatRole::Assistant => "assistant",
    }
}

fn system_content(settings: &ChatSettings, memory: &ChatMemory) -> String {
    if !settings.memory_enabled {
        return SYSTEM_PROMPT.to_string();
    }

    let mut content = SYSTEM_PROMPT.to_string();
    if !memory.profile.trim().is_empty() {
        content.push_str("\n\n用户记忆：\n");
        content.push_str(memory.profile.trim());
    }
    if !memory.summary.trim().is_empty() {
        content.push_str("\n\n对话摘要：\n");
        content.push_str(memory.summary.trim());
    }

    content
}

pub fn build_context_messages(
    settings: &ChatSettings,
    conversation: &Conversation,
    memory: &ChatMemory,
    current_user_message: &str,
) -> Vec<OpenAiMessage> {
    let budget = ((settings.max_context_tokens as f32) * 0.85).floor() as usize;
    let system_message = OpenAiMessage {
        role: "system".to_string(),
        content: system_content(settings, memory),
    };
    let current_message = OpenAiMessage {
        role: "user".to_string(),
        content: current_user_message.to_string(),
    };
    let reserved = approximate_tokens(&system_message.content)
        + approximate_tokens(&current_message.content)
        + 16;
    let recent_budget = budget.saturating_sub(reserved);
    let mut selected = Vec::new();
    let mut used = 0usize;

    for message in conversation.messages.iter().rev() {
        let message_tokens = approximate_tokens(&message.content) + 4;
        if used + message_tokens > recent_budget {
            continue;
        }
        used += message_tokens;
        selected.push(OpenAiMessage {
            role: role_to_openai(message.role).to_string(),
            content: message.content.clone(),
        });
    }

    selected.reverse();

    let mut messages = Vec::with_capacity(selected.len() + 2);
    messages.push(system_message);
    messages.extend(selected);
    messages.push(current_message);
    messages
}
```

- [ ] **Step 5: Run context tests and verify pass**

Run:

```powershell
cd src-tauri
cargo test chat_context
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src-tauri/src/lib.rs src-tauri/src/chat_context.rs src-tauri/src/chat_context_tests.rs
git commit -m "feat: add chat context assembly"
```

---

### Task 3: Rust Chat Commands And OpenAI-Compatible Request

**Files:**
- Create: `src-tauri/src/chat.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Add HTTP dependency**

Modify `src-tauri/Cargo.toml` dependencies:

```toml
reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls"] }
```

- [ ] **Step 2: Write command module with validation and response parser tests inline**

Create `src-tauri/src/chat.rs` with tests first:

```rust
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::chat_context::{build_chat_completions_url, build_context_messages, OpenAiMessage};
use crate::chat_storage::{
    app_config_dir, default_chat_memory, load_chat_memory_from_dir, load_chat_settings_from_dir,
    load_conversation_from_dir, save_chat_memory_to_dir, save_chat_settings_to_dir,
    save_conversation_to_dir, ChatMemory, ChatMessage, ChatRole, ChatSettings, Conversation,
};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSendResult {
    pub user_message: ChatMessage,
    pub assistant_message: ChatMessage,
    pub conversation: Conversation,
    pub memory: ChatMemory,
}

#[derive(Debug, Clone, Serialize)]
struct OpenAiChatRequest {
    model: String,
    messages: Vec<OpenAiMessage>,
    temperature: f32,
}

#[derive(Debug, Deserialize)]
struct OpenAiChatResponse {
    choices: Vec<OpenAiChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenAiChoice {
    message: OpenAiResponseMessage,
}

#[derive(Debug, Deserialize)]
struct OpenAiResponseMessage {
    content: String,
}

pub fn validate_chat_settings(settings: &ChatSettings) -> Result<(), String> {
    if settings.base_url.trim().is_empty()
        || settings.api_key.trim().is_empty()
        || settings.model.trim().is_empty()
    {
        return Err("请先在设置里填写 API 地址、Key 和模型名称。".to_string());
    }
    if !(0.0..=2.0).contains(&settings.temperature) {
        return Err("temperature 必须在 0 到 2 之间。".to_string());
    }
    if settings.max_context_tokens == 0 {
        return Err("maxContextTokens 必须是正数。".to_string());
    }
    Ok(())
}

pub fn parse_openai_response(body: &str) -> Result<String, String> {
    let response: OpenAiChatResponse = serde_json::from_str(body)
        .map_err(|_| "没有读取到模型回复，请检查模型接口是否兼容。".to_string())?;
    let content = response
        .choices
        .first()
        .map(|choice| choice.message.content.trim())
        .filter(|content| !content.is_empty())
        .ok_or_else(|| "没有读取到模型回复，请检查模型接口是否兼容。".to_string())?;
    Ok(content.to_string())
}

fn now_string() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    millis.to_string()
}

fn new_message(role: ChatRole, content: String) -> ChatMessage {
    let timestamp = now_string();
    let role_prefix = match role {
        ChatRole::User => "user",
        ChatRole::Assistant => "assistant",
    };

    ChatMessage {
        id: format!("{role_prefix}-{timestamp}"),
        role,
        content,
        created_at: timestamp,
    }
}

#[tauri::command]
pub fn load_chat_settings(app: AppHandle) -> Result<ChatSettings, String> {
    let dir = app_config_dir(&app)?;
    load_chat_settings_from_dir(&dir)
}

#[tauri::command]
pub fn save_chat_settings(app: AppHandle, settings: ChatSettings) -> Result<(), String> {
    validate_chat_settings_for_save(&settings)?;
    let dir = app_config_dir(&app)?;
    save_chat_settings_to_dir(&dir, &settings)
}

fn validate_chat_settings_for_save(settings: &ChatSettings) -> Result<(), String> {
    if !(0.0..=2.0).contains(&settings.temperature) {
        return Err("temperature 必须在 0 到 2 之间。".to_string());
    }
    if settings.max_context_tokens == 0 {
        return Err("maxContextTokens 必须是正数。".to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn load_conversation(app: AppHandle) -> Result<Conversation, String> {
    let dir = app_config_dir(&app)?;
    load_conversation_from_dir(&dir)
}

#[tauri::command]
pub fn clear_conversation(app: AppHandle) -> Result<(), String> {
    let dir = app_config_dir(&app)?;
    save_conversation_to_dir(&dir, &Conversation { messages: vec![] })
}

#[tauri::command]
pub fn load_chat_memory(app: AppHandle) -> Result<ChatMemory, String> {
    let dir = app_config_dir(&app)?;
    load_chat_memory_from_dir(&dir)
}

#[tauri::command]
pub fn save_chat_memory(app: AppHandle, memory: ChatMemory) -> Result<(), String> {
    let dir = app_config_dir(&app)?;
    save_chat_memory_to_dir(&dir, &memory)
}

#[tauri::command]
pub async fn send_chat_message(app: AppHandle, content: String) -> Result<ChatSendResult, String> {
    let user_content = content.trim().to_string();
    if user_content.is_empty() {
        return Err("请输入消息内容。".to_string());
    }

    let dir = app_config_dir(&app)?;
    let settings = load_chat_settings_from_dir(&dir)?;
    validate_chat_settings(&settings)?;
    let mut conversation = load_conversation_from_dir(&dir)?;
    let memory = if settings.memory_enabled {
        load_chat_memory_from_dir(&dir)?
    } else {
        default_chat_memory()
    };

    let user_message = new_message(ChatRole::User, user_content.clone());
    conversation.messages.push(user_message.clone());
    save_conversation_to_dir(&dir, &conversation)?;

    let context_messages =
        build_context_messages(&settings, &conversation, &memory, &user_content);
    let request = OpenAiChatRequest {
        model: settings.model.clone(),
        messages: context_messages,
        temperature: settings.temperature,
    };
    let url = build_chat_completions_url(&settings.base_url)?;
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|error| format!("模型请求初始化失败：{error}"))?;
    let response = client
        .post(url)
        .bearer_auth(settings.api_key.trim())
        .json(&request)
        .send()
        .await
        .map_err(|error| {
            if error.is_timeout() {
                "模型请求超时，请稍后再试。".to_string()
            } else {
                format!("模型请求失败：{error}")
            }
        })?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|error| format!("读取模型回复失败：{error}"))?;
    if !status.is_success() {
        return Err(format!("服务返回错误：{status}"));
    }

    let assistant_content = parse_openai_response(&body)?;
    let assistant_message = new_message(ChatRole::Assistant, assistant_content);
    conversation.messages.push(assistant_message.clone());
    save_conversation_to_dir(&dir, &conversation)?;

    Ok(ChatSendResult {
        user_message,
        assistant_message,
        conversation,
        memory,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_required_send_settings() {
        let settings = ChatSettings {
            base_url: String::new(),
            api_key: String::new(),
            model: String::new(),
            temperature: 0.7,
            max_context_tokens: 6000,
            memory_enabled: true,
        };

        assert_eq!(
            validate_chat_settings(&settings).unwrap_err(),
            "请先在设置里填写 API 地址、Key 和模型名称。"
        );
    }

    #[test]
    fn validates_temperature_range() {
        let settings = ChatSettings {
            base_url: "https://example.com/v1".to_string(),
            api_key: "secret".to_string(),
            model: "model".to_string(),
            temperature: 3.0,
            max_context_tokens: 6000,
            memory_enabled: true,
        };

        assert_eq!(
            validate_chat_settings(&settings).unwrap_err(),
            "temperature 必须在 0 到 2 之间。"
        );
    }

    #[test]
    fn parses_common_openai_response() {
        let body = r#"{"choices":[{"message":{"role":"assistant","content":"你好，我在。"}}]}"#;

        assert_eq!(parse_openai_response(body).unwrap(), "你好，我在。");
    }

    #[test]
    fn rejects_empty_openai_response() {
        let body = r#"{"choices":[{"message":{"role":"assistant","content":"   "}}]}"#;

        assert_eq!(
            parse_openai_response(body).unwrap_err(),
            "没有读取到模型回复，请检查模型接口是否兼容。"
        );
    }
}
```

- [ ] **Step 3: Register commands in `src-tauri/src/lib.rs`**

Add module:

```rust
mod chat;
```

Add commands inside `tauri::generate_handler![...]`:

```rust
chat::clear_conversation,
chat::load_chat_memory,
chat::load_chat_settings,
chat::load_conversation,
chat::save_chat_memory,
chat::save_chat_settings,
chat::send_chat_message,
```

- [ ] **Step 4: Run Rust chat tests**

Run:

```powershell
cd src-tauri
cargo test chat
```

Expected: PASS. If Cargo must fetch `reqwest`, allow the dependency download when prompted by the harness.

- [ ] **Step 5: Commit**

Run:

```powershell
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/lib.rs src-tauri/src/chat.rs
git commit -m "feat: add openai compatible chat commands"
```

---

### Task 4: Frontend Chat Types And Pure State Helpers

**Files:**
- Create: `src/features/chat/chatTypes.ts`
- Create: `src/features/chat/chatState.ts`
- Create: `src/features/chat/chatState.test.ts`

- [ ] **Step 1: Write failing frontend state tests**

Create `src/features/chat/chatState.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import {
  appendAssistantMessage,
  appendUserMessage,
  defaultChatSettings,
  settingsReady,
  validateSettingsDraft,
} from "./chatState";
import type { ChatMessage, ChatSettings } from "./chatTypes";

const baseSettings: ChatSettings = {
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: "secret",
  model: "deepseek-chat",
  temperature: 0.7,
  maxContextTokens: 6000,
  memoryEnabled: true,
};

describe("chatState", () => {
  it("provides default settings", () => {
    expect(defaultChatSettings()).toEqual({
      baseUrl: "",
      apiKey: "",
      model: "",
      temperature: 0.7,
      maxContextTokens: 6000,
      memoryEnabled: true,
    });
  });

  it("detects ready settings", () => {
    expect(settingsReady(baseSettings)).toBe(true);
    expect(settingsReady({ ...baseSettings, apiKey: "" })).toBe(false);
  });

  it("validates required settings fields", () => {
    expect(
      validateSettingsDraft({
        ...baseSettings,
        baseUrl: "",
        apiKey: "",
        model: "",
      }),
    ).toEqual({
      baseUrl: "请输入 API 地址",
      apiKey: "请输入 API Key",
      model: "请输入模型名称",
    });
  });

  it("validates numeric settings", () => {
    expect(
      validateSettingsDraft({
        ...baseSettings,
        temperature: 3,
        maxContextTokens: 0,
      }),
    ).toEqual({
      temperature: "temperature 必须在 0 到 2 之间",
      maxContextTokens: "上下文窗口必须是正数",
    });
  });

  it("appends user and assistant messages in order", () => {
    const messages: ChatMessage[] = [];
    const withUser = appendUserMessage(messages, {
      id: "u1",
      role: "user",
      content: "你好",
      createdAt: "1",
    });
    const withAssistant = appendAssistantMessage(withUser, {
      id: "a1",
      role: "assistant",
      content: "我在。",
      createdAt: "2",
    });

    expect(withAssistant.map((message) => message.content)).toEqual(["你好", "我在。"]);
    expect(messages).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```powershell
pnpm test src/features/chat/chatState.test.ts
```

Expected: FAIL because chat modules do not exist yet.

- [ ] **Step 3: Add chat types**

Create `src/features/chat/chatTypes.ts`:

```ts
export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type Conversation = {
  messages: ChatMessage[];
};

export type ChatMemory = {
  profile: string;
  summary: string;
  updatedAt: string | null;
};

export type ChatSettings = {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxContextTokens: number;
  memoryEnabled: boolean;
};

export type ChatSettingsErrors = Partial<Record<keyof ChatSettings, string>>;

export type ChatSendResult = {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  conversation: Conversation;
  memory: ChatMemory;
};
```

- [ ] **Step 4: Add pure state helpers**

Create `src/features/chat/chatState.ts`:

```ts
import type { ChatMessage, ChatSettings, ChatSettingsErrors } from "./chatTypes";

export function defaultChatSettings(): ChatSettings {
  return {
    baseUrl: "",
    apiKey: "",
    model: "",
    temperature: 0.7,
    maxContextTokens: 6000,
    memoryEnabled: true,
  };
}

export function settingsReady(settings: ChatSettings): boolean {
  return (
    settings.baseUrl.trim().length > 0 &&
    settings.apiKey.trim().length > 0 &&
    settings.model.trim().length > 0 &&
    settings.temperature >= 0 &&
    settings.temperature <= 2 &&
    settings.maxContextTokens > 0
  );
}

export function validateSettingsDraft(settings: ChatSettings): ChatSettingsErrors {
  const errors: ChatSettingsErrors = {};
  if (!settings.baseUrl.trim()) {
    errors.baseUrl = "请输入 API 地址";
  }
  if (!settings.apiKey.trim()) {
    errors.apiKey = "请输入 API Key";
  }
  if (!settings.model.trim()) {
    errors.model = "请输入模型名称";
  }
  if (settings.temperature < 0 || settings.temperature > 2) {
    errors.temperature = "temperature 必须在 0 到 2 之间";
  }
  if (settings.maxContextTokens <= 0) {
    errors.maxContextTokens = "上下文窗口必须是正数";
  }
  return errors;
}

export function appendUserMessage(
  messages: ChatMessage[],
  message: ChatMessage,
): ChatMessage[] {
  return [...messages, message];
}

export function appendAssistantMessage(
  messages: ChatMessage[],
  message: ChatMessage,
): ChatMessage[] {
  return [...messages, message];
}
```

- [ ] **Step 5: Run frontend state tests**

Run:

```powershell
pnpm test src/features/chat/chatState.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/features/chat/chatTypes.ts src/features/chat/chatState.ts src/features/chat/chatState.test.ts
git commit -m "feat: add chat frontend state helpers"
```

---

### Task 5: Model Settings Panel

**Files:**
- Create: `src/features/settings/ModelSettingsPanel.tsx`
- Create: `src/features/settings/ModelSettingsPanel.test.tsx`

- [ ] **Step 1: Write failing settings panel tests**

Create `src/features/settings/ModelSettingsPanel.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ModelSettingsPanel } from "./ModelSettingsPanel";
import type { ChatMemory, ChatSettings } from "../chat/chatTypes";

const settings: ChatSettings = {
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: "secret",
  model: "deepseek-chat",
  temperature: 0.7,
  maxContextTokens: 6000,
  memoryEnabled: true,
};

const memory: ChatMemory = {
  profile: "用户喜欢简洁中文。",
  summary: "",
  updatedAt: null,
};

describe("ModelSettingsPanel", () => {
  it("renders existing provider settings", () => {
    render(
      <ModelSettingsPanel
        settings={settings}
        memory={memory}
        isSaving={false}
        error={null}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("API 地址")).toHaveValue("https://api.deepseek.com/v1");
    expect(screen.getByLabelText("模型")).toHaveValue("deepseek-chat");
    expect(screen.getByLabelText("用户记忆")).toHaveValue("用户喜欢简洁中文。");
  });

  it("validates required fields before save", async () => {
    const onSave = vi.fn();
    render(
      <ModelSettingsPanel
        settings={{ ...settings, baseUrl: "", apiKey: "", model: "" }}
        memory={memory}
        isSaving={false}
        error={null}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "保存设置" }));

    expect(screen.getByText("请输入 API 地址")).toBeInTheDocument();
    expect(screen.getByText("请输入 API Key")).toBeInTheDocument();
    expect(screen.getByText("请输入模型名称")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("submits edited settings and memory", async () => {
    const onSave = vi.fn();
    render(
      <ModelSettingsPanel
        settings={settings}
        memory={memory}
        isSaving={false}
        error={null}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    await userEvent.clear(screen.getByLabelText("模型"));
    await userEvent.type(screen.getByLabelText("模型"), "qwen-plus");
    await userEvent.click(screen.getByRole("button", { name: "保存设置" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ model: "qwen-plus" }),
      expect.objectContaining({ profile: "用户喜欢简洁中文。" }),
    );
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```powershell
pnpm test src/features/settings/ModelSettingsPanel.test.tsx
```

Expected: FAIL because the component does not exist yet.

- [ ] **Step 3: Implement settings panel**

Create `src/features/settings/ModelSettingsPanel.tsx`:

```tsx
import { useState } from "react";
import {
  defaultChatSettings,
  validateSettingsDraft,
} from "../chat/chatState";
import type {
  ChatMemory,
  ChatSettings,
  ChatSettingsErrors,
} from "../chat/chatTypes";

type ModelSettingsPanelProps = {
  settings: ChatSettings | null;
  memory: ChatMemory;
  isSaving: boolean;
  error: string | null;
  onSave: (settings: ChatSettings, memory: ChatMemory) => void;
  onClose: () => void;
};

export function ModelSettingsPanel({
  settings,
  memory,
  isSaving,
  error,
  onSave,
  onClose,
}: ModelSettingsPanelProps) {
  const [draft, setDraft] = useState<ChatSettings>(settings ?? defaultChatSettings());
  const [memoryDraft, setMemoryDraft] = useState<ChatMemory>(memory);
  const [errors, setErrors] = useState<ChatSettingsErrors>({});

  const updateDraft = <Key extends keyof ChatSettings>(key: Key, value: ChatSettings[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const submit = () => {
    const nextErrors = validateSettingsDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    onSave(draft, memoryDraft);
  };

  return (
    <section className="settings-panel" aria-label="模型设置">
      <header className="panel-header">
        <h2>模型设置</h2>
        <button className="icon-button" type="button" onClick={onClose} aria-label="关闭设置">
          ×
        </button>
      </header>

      <label className="field">
        <span>API 地址</span>
        <input
          value={draft.baseUrl}
          placeholder="https://api.deepseek.com/v1"
          onChange={(event) => updateDraft("baseUrl", event.target.value)}
        />
        {errors.baseUrl ? <small className="field-error">{errors.baseUrl}</small> : null}
      </label>

      <label className="field">
        <span>API Key</span>
        <input
          type="password"
          value={draft.apiKey}
          onChange={(event) => updateDraft("apiKey", event.target.value)}
        />
        {errors.apiKey ? <small className="field-error">{errors.apiKey}</small> : null}
      </label>

      <label className="field">
        <span>模型</span>
        <input
          value={draft.model}
          placeholder="deepseek-chat"
          onChange={(event) => updateDraft("model", event.target.value)}
        />
        {errors.model ? <small className="field-error">{errors.model}</small> : null}
      </label>

      <div className="settings-grid">
        <label className="field">
          <span>Temperature</span>
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={draft.temperature}
            onChange={(event) => updateDraft("temperature", Number(event.target.value))}
          />
          {errors.temperature ? (
            <small className="field-error">{errors.temperature}</small>
          ) : null}
        </label>

        <label className="field">
          <span>上下文窗口</span>
          <input
            type="number"
            min={1}
            value={draft.maxContextTokens}
            onChange={(event) =>
              updateDraft("maxContextTokens", Number(event.target.value))
            }
          />
          {errors.maxContextTokens ? (
            <small className="field-error">{errors.maxContextTokens}</small>
          ) : null}
        </label>
      </div>

      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={draft.memoryEnabled}
          onChange={(event) => updateDraft("memoryEnabled", event.target.checked)}
        />
        <span>启用记忆</span>
      </label>

      {draft.memoryEnabled ? (
        <label className="field">
          <span>用户记忆</span>
          <textarea
            value={memoryDraft.profile}
            rows={4}
            onChange={(event) =>
              setMemoryDraft((current) => ({
                ...current,
                profile: event.target.value,
              }))
            }
          />
        </label>
      ) : null}

      {error ? <p className="panel-error">{error}</p> : null}

      <footer className="panel-actions">
        <button type="button" className="secondary-button" onClick={onClose}>
          取消
        </button>
        <button type="button" className="primary-button" onClick={submit} disabled={isSaving}>
          {isSaving ? "保存中" : "保存设置"}
        </button>
      </footer>
    </section>
  );
}
```

- [ ] **Step 4: Run settings panel tests**

Run:

```powershell
pnpm test src/features/settings/ModelSettingsPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/features/settings/ModelSettingsPanel.tsx src/features/settings/ModelSettingsPanel.test.tsx
git commit -m "feat: add model settings panel"
```

---

### Task 6: Chat Panel

**Files:**
- Create: `src/features/chat/ChatPanel.tsx`
- Create: `src/features/chat/ChatPanel.test.tsx`

- [ ] **Step 1: Write failing chat panel tests**

Create `src/features/chat/ChatPanel.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatPanel } from "./ChatPanel";
import type { ChatMessage } from "./chatTypes";

const messages: ChatMessage[] = [
  { id: "u1", role: "user", content: "你好", createdAt: "1" },
  { id: "a1", role: "assistant", content: "我在。", createdAt: "2" },
];

describe("ChatPanel", () => {
  it("renders missing settings state", () => {
    render(
      <ChatPanel
        messages={[]}
        settingsReady={false}
        isSending={false}
        error={null}
        onSend={vi.fn()}
        onOpenSettings={vi.fn()}
        onClearConversation={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("先连接一个模型")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开设置" })).toBeInTheDocument();
  });

  it("renders messages in order", () => {
    render(
      <ChatPanel
        messages={messages}
        settingsReady
        isSending={false}
        error={null}
        onSend={vi.fn()}
        onOpenSettings={vi.fn()}
        onClearConversation={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("你好")).toBeInTheDocument();
    expect(screen.getByText("我在。")).toBeInTheDocument();
  });

  it("sends draft with Enter and keeps Shift Enter as newline", async () => {
    const onSend = vi.fn();
    render(
      <ChatPanel
        messages={[]}
        settingsReady
        isSending={false}
        error={null}
        onSend={onSend}
        onOpenSettings={vi.fn()}
        onClearConversation={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("输入消息");
    await userEvent.type(input, "你好");
    await userEvent.keyboard("{Enter}");

    expect(onSend).toHaveBeenCalledWith("你好");
  });

  it("shows sending and error states", () => {
    render(
      <ChatPanel
        messages={messages}
        settingsReady
        isSending
        error="模型请求超时，请稍后再试。"
        onSend={vi.fn()}
        onOpenSettings={vi.fn()}
        onClearConversation={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("MiniShuya 正在想")).toBeInTheDocument();
    expect(screen.getByText("模型请求超时，请稍后再试。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发送消息" })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```powershell
pnpm test src/features/chat/ChatPanel.test.tsx
```

Expected: FAIL because component does not exist.

- [ ] **Step 3: Implement chat panel**

Create `src/features/chat/ChatPanel.tsx`:

```tsx
import { useState, type KeyboardEvent } from "react";
import type { ChatMessage } from "./chatTypes";

type ChatPanelProps = {
  messages: ChatMessage[];
  settingsReady: boolean;
  isSending: boolean;
  error: string | null;
  onSend: (content: string) => void;
  onOpenSettings: () => void;
  onClearConversation: () => void;
  onClose: () => void;
};

export function ChatPanel({
  messages,
  settingsReady,
  isSending,
  error,
  onSend,
  onOpenSettings,
  onClearConversation,
  onClose,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const canSend = settingsReady && draft.trim().length > 0 && !isSending;

  const send = () => {
    const content = draft.trim();
    if (!content || !settingsReady || isSending) {
      return;
    }
    onSend(content);
    setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    event.preventDefault();
    send();
  };

  return (
    <section className="chat-panel" aria-label="MiniShuya 聊天">
      <header className="panel-header">
        <h2>MiniShuya</h2>
        <div className="panel-header__actions">
          <button type="button" className="ghost-button" onClick={onOpenSettings}>
            设置
          </button>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭聊天">
            ×
          </button>
        </div>
      </header>

      {!settingsReady ? (
        <div className="empty-state">
          <strong>先连接一个模型</strong>
          <p>填写 API 地址、Key 和模型名称后，MiniShuya 就可以开始聊天。</p>
          <button type="button" className="primary-button" onClick={onOpenSettings}>
            打开设置
          </button>
        </div>
      ) : null}

      {settingsReady && messages.length === 0 ? (
        <div className="empty-state">
          <strong>今天想聊什么？</strong>
          <p>可以问一个问题，也可以让 MiniShuya 记住你的偏好。</p>
        </div>
      ) : null}

      {messages.length > 0 ? (
        <div className="message-list" aria-label="消息记录">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`message message--${message.role}`}
              aria-label={message.role === "user" ? "用户消息" : "MiniShuya 回复"}
            >
              {message.content}
            </article>
          ))}
        </div>
      ) : null}

      {isSending ? <p className="thinking-state">MiniShuya 正在想</p> : null}
      {error ? <p className="panel-error">{error}</p> : null}

      <footer className="chat-composer">
        <textarea
          aria-label="输入消息"
          value={draft}
          rows={3}
          placeholder={settingsReady ? "和 MiniShuya 说点什么" : "先完成模型设置"}
          disabled={!settingsReady}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="composer-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClearConversation}
            disabled={messages.length === 0 || isSending}
          >
            清空
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={send}
            disabled={!canSend}
            aria-label="发送消息"
          >
            发送
          </button>
        </div>
      </footer>
    </section>
  );
}
```

- [ ] **Step 4: Run chat panel tests**

Run:

```powershell
pnpm test src/features/chat/ChatPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/features/chat/ChatPanel.tsx src/features/chat/ChatPanel.test.tsx
git commit -m "feat: add chat panel"
```

---

### Task 7: Pet Menu And App Integration

**Files:**
- Modify: `src/features/pet/Pet.tsx`
- Modify: `src/features/pet/Pet.test.tsx`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Update Pet tests for new menu actions**

Modify `src/features/pet/Pet.test.tsx` by adding tests using the existing render helper pattern:

```tsx
it("opens chat and settings from the pet menu", () => {
  const onOpenChat = vi.fn();
  const onOpenSettings = vi.fn();
  renderPet({ onOpenChat, onOpenSettings });

  const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
  fireEvent.contextMenu(pet);
  fireEvent.click(screen.getByRole("menuitem", { name: "聊天" }));
  fireEvent.contextMenu(pet);
  fireEvent.click(screen.getByRole("menuitem", { name: "设置" }));

  expect(onOpenChat).toHaveBeenCalledTimes(1);
  expect(onOpenSettings).toHaveBeenCalledTimes(1);
});
```

Update existing menu item assertions to use named menu items:

```tsx
expect(screen.getByRole("menuitem", { name: "退出" })).toBeInTheDocument();
```

- [ ] **Step 2: Run Pet tests and verify failure**

Run:

```powershell
pnpm test src/features/pet/Pet.test.tsx
```

Expected: FAIL because `Pet` does not expose `onOpenChat` or `onOpenSettings`.

- [ ] **Step 3: Modify Pet props and menu rendering**

In `src/features/pet/Pet.tsx`, add props:

```ts
onOpenChat: () => void;
onOpenSettings: () => void;
```

Destructure them in `Pet(...)`.

Replace the single exit item with:

```tsx
{[
  { label: "聊天", action: onOpenChat },
  { label: "设置", action: onOpenSettings },
  { label: "退出", action: onExit },
].map((item) => (
  <span
    key={item.label}
    className="pet-menu__item"
    role="menuitem"
    tabIndex={0}
    onClick={(event) => {
      event.stopPropagation();
      closeMenu();
      item.action();
    }}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        closeMenu();
        item.action();
      }
    }}
  >
    {item.label}
  </span>
))}
```

- [ ] **Step 4: Integrate panels and Tauri commands in App**

Modify `src/app/App.tsx` imports:

```tsx
import { ChatPanel } from "../features/chat/ChatPanel";
import { settingsReady as chatSettingsReady } from "../features/chat/chatState";
import type {
  ChatMemory,
  ChatSendResult,
  ChatSettings,
  Conversation,
} from "../features/chat/chatTypes";
import { ModelSettingsPanel } from "../features/settings/ModelSettingsPanel";
```

Add state:

```tsx
const [activePanel, setActivePanel] = useState<"chat" | "settings" | null>(null);
const [chatSettings, setChatSettings] = useState<ChatSettings | null>(null);
const [chatMemory, setChatMemory] = useState<ChatMemory>({
  profile: "",
  summary: "",
  updatedAt: null,
});
const [messages, setMessages] = useState<Conversation["messages"]>([]);
const [isSending, setIsSending] = useState(false);
const [isSavingSettings, setIsSavingSettings] = useState(false);
const [chatError, setChatError] = useState<string | null>(null);
const [settingsError, setSettingsError] = useState<string | null>(null);
```

Add load effect:

```tsx
useEffect(() => {
  let cancelled = false;

  void Promise.all([
    invoke<ChatSettings>("load_chat_settings"),
    invoke<Conversation>("load_conversation"),
    invoke<ChatMemory>("load_chat_memory"),
  ])
    .then(([settings, conversation, memory]) => {
      if (cancelled) {
        return;
      }
      setChatSettings(settings);
      setMessages(conversation.messages);
      setChatMemory(memory);
    })
    .catch((error) => {
      if (!cancelled) {
        setChatError(String(error));
      }
    });

  return () => {
    cancelled = true;
  };
}, []);
```

Add callbacks:

```tsx
const handleSendChatMessage = useCallback((content: string) => {
  setIsSending(true);
  setChatError(null);
  void invoke<ChatSendResult>("send_chat_message", { content })
    .then((result) => {
      setMessages(result.conversation.messages);
      setChatMemory(result.memory);
    })
    .catch((error) => setChatError(String(error)))
    .finally(() => setIsSending(false));
}, []);

const handleSaveSettings = useCallback((settings: ChatSettings, memory: ChatMemory) => {
  setIsSavingSettings(true);
  setSettingsError(null);
  void Promise.all([
    invoke("save_chat_settings", { settings }),
    invoke("save_chat_memory", { memory }),
  ])
    .then(() => {
      setChatSettings(settings);
      setChatMemory(memory);
      setActivePanel("chat");
    })
    .catch((error) => setSettingsError(String(error)))
    .finally(() => setIsSavingSettings(false));
}, []);

const handleClearConversation = useCallback(() => {
  if (!window.confirm("清空当前对话？")) {
    return;
  }
  void invoke("clear_conversation")
    .then(() => setMessages([]))
    .catch((error) => setChatError(String(error)));
}, []);
```

Pass new callbacks to `Pet`:

```tsx
onOpenChat={() => setActivePanel("chat")}
onOpenSettings={() => setActivePanel("settings")}
```

Render panels after `Pet`:

```tsx
{activePanel === "chat" ? (
  <ChatPanel
    messages={messages}
    settingsReady={chatSettings ? chatSettingsReady(chatSettings) : false}
    isSending={isSending}
    error={chatError}
    onSend={handleSendChatMessage}
    onOpenSettings={() => setActivePanel("settings")}
    onClearConversation={handleClearConversation}
    onClose={() => setActivePanel(null)}
  />
) : null}

{activePanel === "settings" ? (
  <ModelSettingsPanel
    settings={chatSettings}
    memory={chatMemory}
    isSaving={isSavingSettings}
    error={settingsError}
    onSave={handleSaveSettings}
    onClose={() => setActivePanel(null)}
  />
) : null}
```

- [ ] **Step 5: Run frontend tests**

Run:

```powershell
pnpm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/app/App.tsx src/features/pet/Pet.tsx src/features/pet/Pet.test.tsx
git commit -m "feat: connect chat panels to pet menu"
```

---

### Task 8: Styling And Desktop Fit

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src/features/chat/ChatPanel.test.tsx`

- [ ] **Step 1: Add test for panel accessible labels**

Add to `src/features/chat/ChatPanel.test.tsx`:

```tsx
it("uses compact panel landmarks", () => {
  render(
    <ChatPanel
      messages={[]}
      settingsReady
      isSending={false}
      error={null}
      onSend={vi.fn()}
      onOpenSettings={vi.fn()}
      onClearConversation={vi.fn()}
      onClose={vi.fn()}
    />,
  );

  expect(screen.getByRole("region", { name: "MiniShuya 聊天" })).toBeInTheDocument();
});
```

If Testing Library does not expose `section` as `region` without an accessible name in the current environment, change the assertion to:

```tsx
expect(screen.getByLabelText("MiniShuya 聊天")).toBeInTheDocument();
```

- [ ] **Step 2: Update CSS for panels and menu**

Append to `src/styles/global.css`:

```css
.chat-panel,
.settings-panel {
  position: absolute;
  left: 158px;
  bottom: 8px;
  z-index: 3;
  width: 320px;
  max-height: 440px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(126, 92, 140, 0.2);
  border-radius: 12px;
  background: rgba(255, 251, 253, 0.98);
  color: #332b38;
  box-shadow: 0 8px 14px rgba(64, 48, 76, 0.14);
  pointer-events: auto;
}

.settings-panel {
  width: 340px;
  max-height: 520px;
  overflow: auto;
}

.panel-header,
.panel-actions,
.composer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.panel-header h2 {
  margin: 0;
  font-size: 14px;
  line-height: 1.25;
}

.panel-header__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.message-list {
  display: flex;
  max-height: 220px;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
  padding-right: 2px;
}

.message {
  max-width: 86%;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.45;
  white-space: pre-wrap;
}

.message--user {
  align-self: flex-end;
  background: #70465a;
  color: #fffafd;
}

.message--assistant {
  align-self: flex-start;
  background: #f5edf2;
  color: #332b38;
}

.empty-state {
  display: grid;
  gap: 6px;
  padding: 8px 0;
}

.empty-state strong {
  font-size: 13px;
}

.empty-state p,
.thinking-state,
.panel-error,
.field-error {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
}

.empty-state p,
.thinking-state {
  color: #665172;
}

.panel-error,
.field-error {
  color: #9d2f45;
}

.chat-composer {
  display: grid;
  gap: 8px;
}

.field {
  display: grid;
  gap: 5px;
  font-size: 12px;
  font-weight: 650;
  color: #59465f;
}

.field input,
.field textarea,
.chat-composer textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(126, 92, 140, 0.24);
  border-radius: 8px;
  padding: 8px 9px;
  background: #fffafd;
  color: #332b38;
  font: inherit;
  font-size: 13px;
  line-height: 1.35;
  outline: 0;
  resize: vertical;
}

.field input:focus-visible,
.field textarea:focus-visible,
.chat-composer textarea:focus-visible,
.primary-button:focus-visible,
.secondary-button:focus-visible,
.ghost-button:focus-visible,
.icon-button:focus-visible {
  outline: 2px solid rgba(112, 70, 90, 0.42);
  outline-offset: 2px;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #59465f;
  font-size: 13px;
}

.primary-button,
.secondary-button,
.ghost-button,
.icon-button {
  border: 0;
  border-radius: 8px;
  font-weight: 650;
  cursor: pointer;
}

.primary-button {
  min-height: 30px;
  padding: 0 12px;
  background: #70465a;
  color: #fffafd;
}

.secondary-button,
.ghost-button {
  min-height: 30px;
  padding: 0 10px;
  background: #f5edf2;
  color: #70465a;
}

.icon-button {
  width: 28px;
  height: 28px;
  background: #f5edf2;
  color: #70465a;
}

.primary-button:disabled,
.secondary-button:disabled {
  cursor: default;
  opacity: 0.55;
}

.pet-menu {
  width: 86px;
}

.pet-menu__item + .pet-menu__item {
  margin-top: 5px;
}

@media (prefers-reduced-motion: reduce) {
  .pet,
  .pet__character {
    animation: none;
    transition: none;
  }
}
```

- [ ] **Step 3: Increase window size for compact panel**

Modify `src-tauri/tauri.conf.json` main window:

```json
"width": 500,
"height": 470,
```

Keep:

```json
"transparent": true,
"alwaysOnTop": true,
"shadow": false,
"skipTaskbar": false
```

- [ ] **Step 4: Run frontend tests and build**

Run:

```powershell
pnpm test
pnpm build
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/styles/global.css src-tauri/tauri.conf.json src/features/chat/ChatPanel.test.tsx
git commit -m "feat: style chat mvp panels"
```

---

### Task 9: Final Verification

**Files:**
- No planned code changes unless verification finds a defect.

- [ ] **Step 1: Run full frontend verification**

Run:

```powershell
pnpm test
pnpm build
```

Expected: all frontend tests and build pass.

- [ ] **Step 2: Run full Rust verification**

Run from repository root:

```powershell
cd src-tauri
cargo fmt --check
cargo test
cargo clippy
```

Expected: formatting, all Rust tests, and clippy pass.

- [ ] **Step 3: Manual desktop verification**

Run:

```powershell
pnpm tauri dev
```

Verify:

- Pet renders in transparent always-on-top window.
- Visible character pixels remain draggable.
- Transparent areas still click through.
- Right-click menu contains `聊天`, `设置`, and `退出`.
- `聊天` opens the chat panel.
- `设置` opens the model settings panel.
- Saving DeepSeek or Qwen-style OpenAI-compatible settings persists after closing and reopening settings.
- Sending a message returns a model response when valid settings are provided.
- Follow-up message can use previous conversation context.
- User memory profile can be edited and saved.
- Clearing conversation returns the chat panel to empty state.
- Existing exit behavior still saves position and quits.

- [ ] **Step 4: Fix verification defects with focused commits**

For any defect, write the smallest failing test first, implement the fix, run the relevant test, then commit only the files changed for that defect with a focused Conventional Commit message naming the concrete failure. For example, if settings validation accepts an invalid temperature, commit with `fix: reject invalid chat temperature`.

- [ ] **Step 5: Final status**

Run:

```powershell
git status --short
```

Expected: clean working tree.
