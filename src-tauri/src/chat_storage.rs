use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

const CHAT_SETTINGS_FILE: &str = "chat-settings.json";
const CHAT_MEMORY_FILE: &str = "chat-memory.json";
const CONVERSATION_FILE: &str = "conversation.json";

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSettings {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub temperature: f32,
    pub max_context_tokens: usize,
    pub memory_enabled: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMemory {
    pub profile: String,
    pub summary: String,
    pub updated_at: Option<String>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ChatRole {
    User,
    Assistant,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub id: String,
    pub role: ChatRole,
    pub content: String,
    pub created_at: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
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

pub fn app_config_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("failed to resolve app config dir: {error}"))?;
    fs::create_dir_all(&dir)
        .map_err(|error| format!("failed to create app config dir: {error}"))?;
    Ok(dir)
}

pub fn load_chat_settings_from_dir(dir: &Path) -> Result<ChatSettings, String> {
    load_json_or_default(&dir.join(CHAT_SETTINGS_FILE), default_chat_settings)
}

pub fn save_chat_settings_to_dir(dir: &Path, settings: &ChatSettings) -> Result<(), String> {
    save_json(&dir.join(CHAT_SETTINGS_FILE), settings)
}

pub fn load_conversation_from_dir(dir: &Path) -> Result<Conversation, String> {
    load_json_or_default(&dir.join(CONVERSATION_FILE), || Conversation {
        messages: Vec::new(),
    })
}

pub fn save_conversation_to_dir(dir: &Path, conversation: &Conversation) -> Result<(), String> {
    save_json(&dir.join(CONVERSATION_FILE), conversation)
}

pub fn load_chat_memory_from_dir(dir: &Path) -> Result<ChatMemory, String> {
    load_json_or_default(&dir.join(CHAT_MEMORY_FILE), default_chat_memory)
}

pub fn save_chat_memory_to_dir(dir: &Path, memory: &ChatMemory) -> Result<(), String> {
    save_json(&dir.join(CHAT_MEMORY_FILE), memory)
}

fn load_json_or_default<T, F>(path: &Path, default_value: F) -> Result<T, String>
where
    T: for<'de> Deserialize<'de>,
    F: FnOnce() -> T,
{
    if !path.exists() {
        return Ok(default_value());
    }

    let content = fs::read_to_string(path)
        .map_err(|error| format!("failed to read {}: {error}", path.display()))?;
    serde_json::from_str(&content)
        .map_err(|error| format!("failed to parse {}: {error}", path.display()))
}

fn save_json<T>(path: &Path, value: &T) -> Result<(), String>
where
    T: Serialize,
{
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("failed to create {}: {error}", parent.display()))?;
    }

    let content = serde_json::to_string_pretty(value)
        .map_err(|error| format!("failed to serialize {}: {error}", path.display()))?;
    fs::write(path, content).map_err(|error| format!("failed to write {}: {error}", path.display()))
}
