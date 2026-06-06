use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::AppHandle;

use crate::chat_context::{build_chat_completions_url, build_context_messages, OpenAiMessage};
use crate::chat_storage::{
    app_config_dir, default_chat_memory, load_chat_memory_from_dir, load_chat_settings_from_dir,
    load_conversation_from_dir, save_chat_memory_to_dir, save_chat_settings_to_dir,
    save_conversation_to_dir, ChatMemory, ChatMessage, ChatRole, ChatSettings, Conversation,
};

const REQUEST_TIMEOUT_SECONDS: u64 = 60;
const MISSING_SETTINGS_ERROR: &str = "请先在设置里填写 API 地址、Key 和模型名称。";
const INVALID_RESPONSE_ERROR: &str = "没有读取到模型回复，请检查模型接口是否兼容。";
static SEND_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

#[derive(Debug)]
struct SendGuard;

impl SendGuard {
    fn acquire() -> Result<Self, String> {
        SEND_IN_PROGRESS
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .map(|_| Self)
            .map_err(|_| "已有消息正在发送，请稍后再试。".to_string())
    }
}

impl Drop for SendGuard {
    fn drop(&mut self) {
        SEND_IN_PROGRESS.store(false, Ordering::Release);
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSendResult {
    pub user_message: ChatMessage,
    pub assistant_message: ChatMessage,
    pub conversation: Conversation,
    pub memory: ChatMemory,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSettingsView {
    pub base_url: String,
    pub model: String,
    pub temperature: f32,
    pub max_context_tokens: usize,
    pub memory_enabled: bool,
    pub api_key_configured: bool,
}

impl From<&ChatSettings> for ChatSettingsView {
    fn from(settings: &ChatSettings) -> Self {
        Self {
            base_url: settings.base_url.clone(),
            model: settings.model.clone(),
            temperature: settings.temperature,
            max_context_tokens: settings.max_context_tokens,
            memory_enabled: settings.memory_enabled,
            api_key_configured: !settings.api_key.trim().is_empty(),
        }
    }
}

#[derive(Debug, Serialize)]
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
        return Err(MISSING_SETTINGS_ERROR.to_string());
    }

    validate_base_url_security(&settings.base_url)?;
    validate_chat_settings_for_save(settings)
}

fn validate_base_url_security(base_url: &str) -> Result<(), String> {
    let url = reqwest::Url::parse(base_url.trim())
        .map_err(|_| "API 地址格式无效，请检查后重试。".to_string())?;
    let host = url.host_str().unwrap_or_default();
    let is_loopback =
        host.eq_ignore_ascii_case("localhost") || host == "127.0.0.1" || host == "::1";
    if url.scheme() != "https" && !is_loopback {
        return Err("远程 API 地址必须使用 HTTPS；本机服务可以使用 HTTP。".to_string());
    }

    Ok(())
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

pub fn parse_openai_response(body: &str) -> Result<String, String> {
    let response: OpenAiChatResponse =
        serde_json::from_str(body).map_err(|_| INVALID_RESPONSE_ERROR.to_string())?;
    let content = response
        .choices
        .first()
        .map(|choice| choice.message.content.trim())
        .filter(|content| !content.is_empty())
        .ok_or_else(|| INVALID_RESPONSE_ERROR.to_string())?;

    Ok(content.to_string())
}

fn provider_status_error(status: reqwest::StatusCode) -> String {
    format!("服务返回错误：{status}，请检查 API Key、API 地址和模型名称。")
}

fn now_millis_string() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .to_string()
}

fn new_message(role: ChatRole, content: String) -> ChatMessage {
    let timestamp = now_millis_string();
    let prefix = match role {
        ChatRole::User => "user",
        ChatRole::Assistant => "assistant",
    };

    ChatMessage {
        id: format!("{prefix}-{timestamp}"),
        role,
        content,
        created_at: timestamp,
    }
}

fn remove_message_by_id(conversation: &mut Conversation, message_id: &str) {
    conversation
        .messages
        .retain(|message| message.id != message_id);
}

#[tauri::command]
pub fn load_chat_settings(app: AppHandle) -> Result<ChatSettingsView, String> {
    let settings = load_chat_settings_from_dir(&app_config_dir(&app)?)?;
    Ok(ChatSettingsView::from(&settings))
}

#[tauri::command]
pub fn save_chat_settings(app: AppHandle, mut settings: ChatSettings) -> Result<(), String> {
    validate_chat_settings_for_save(&settings)?;
    let dir = app_config_dir(&app)?;
    if settings.api_key.trim().is_empty() {
        settings.api_key = load_chat_settings_from_dir(&dir)?.api_key;
    }
    save_chat_settings_to_dir(&dir, &settings)
}

#[tauri::command]
pub fn load_conversation(app: AppHandle) -> Result<Conversation, String> {
    load_conversation_from_dir(&app_config_dir(&app)?)
}

#[tauri::command]
pub fn clear_conversation(app: AppHandle) -> Result<(), String> {
    save_conversation_to_dir(
        &app_config_dir(&app)?,
        &Conversation {
            messages: Vec::new(),
        },
    )
}

#[tauri::command]
pub fn load_chat_memory(app: AppHandle) -> Result<ChatMemory, String> {
    load_chat_memory_from_dir(&app_config_dir(&app)?)
}

#[tauri::command]
pub fn save_chat_memory(app: AppHandle, memory: ChatMemory) -> Result<(), String> {
    save_chat_memory_to_dir(&app_config_dir(&app)?, &memory)
}

#[tauri::command]
pub async fn send_chat_message(app: AppHandle, content: String) -> Result<ChatSendResult, String> {
    let _send_guard = SendGuard::acquire()?;
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
    let context_messages = build_context_messages(&settings, &conversation, &memory, &user_content);

    let user_message = new_message(ChatRole::User, user_content);
    conversation.messages.push(user_message.clone());
    save_conversation_to_dir(&dir, &conversation)?;

    let assistant_content = request_assistant_response(&settings, context_messages)
        .await
        .map_err(|error| {
            remove_message_by_id(&mut conversation, &user_message.id);
            match save_conversation_to_dir(&dir, &conversation) {
                Ok(()) => error,
                Err(save_error) => format!("{error}；同时无法回滚会话：{save_error}"),
            }
        })?;
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

async fn request_assistant_response(
    settings: &ChatSettings,
    context_messages: Vec<OpenAiMessage>,
) -> Result<String, String> {
    let request = OpenAiChatRequest {
        model: settings.model.clone(),
        messages: context_messages,
        temperature: settings.temperature,
    };
    let url = build_chat_completions_url(&settings.base_url)?;
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(REQUEST_TIMEOUT_SECONDS))
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
        return Err(provider_status_error(status));
    }

    parse_openai_response(&body)
}

#[cfg(test)]
mod tests {
    use crate::chat_storage::ChatSettings;

    use super::{
        parse_openai_response, provider_status_error, remove_message_by_id,
        validate_base_url_security, validate_chat_settings, validate_chat_settings_for_save,
        ChatSettingsView, SendGuard,
    };
    use crate::chat_storage::{ChatMessage, ChatRole, Conversation};

    fn settings() -> ChatSettings {
        ChatSettings {
            base_url: "https://example.com/v1".to_string(),
            api_key: "secret".to_string(),
            model: "example-model".to_string(),
            temperature: 0.7,
            max_context_tokens: 6000,
            memory_enabled: true,
        }
    }

    #[test]
    fn validates_required_send_settings() {
        let mut settings = settings();
        settings.base_url.clear();

        assert_eq!(
            validate_chat_settings(&settings).unwrap_err(),
            "请先在设置里填写 API 地址、Key 和模型名称。"
        );

        settings.base_url = "https://example.com/v1".to_string();
        settings.api_key.clear();
        assert_eq!(
            validate_chat_settings(&settings).unwrap_err(),
            "请先在设置里填写 API 地址、Key 和模型名称。"
        );

        settings.api_key = "secret".to_string();
        settings.model.clear();
        assert_eq!(
            validate_chat_settings(&settings).unwrap_err(),
            "请先在设置里填写 API 地址、Key 和模型名称。"
        );
    }

    #[test]
    fn validates_temperature_range() {
        let mut settings = settings();
        settings.temperature = -0.1;
        assert_eq!(
            validate_chat_settings(&settings).unwrap_err(),
            "temperature 必须在 0 到 2 之间。"
        );

        settings.temperature = 2.1;
        assert_eq!(
            validate_chat_settings(&settings).unwrap_err(),
            "temperature 必须在 0 到 2 之间。"
        );
    }

    #[test]
    fn parses_common_openai_response() {
        let body = r#"{"choices":[{"message":{"content":"你好，我在。"}}]}"#;

        assert_eq!(parse_openai_response(body).unwrap(), "你好，我在。");
    }

    #[test]
    fn rejects_empty_openai_response() {
        assert_eq!(
            parse_openai_response(r#"{"choices":[]}"#).unwrap_err(),
            "没有读取到模型回复，请检查模型接口是否兼容。"
        );
        assert_eq!(
            parse_openai_response(r#"{"choices":[{"message":{"content":"   "}}]}"#).unwrap_err(),
            "没有读取到模型回复，请检查模型接口是否兼容。"
        );
        assert_eq!(
            parse_openai_response("not json").unwrap_err(),
            "没有读取到模型回复，请检查模型接口是否兼容。"
        );
    }

    #[test]
    fn provider_status_error_is_actionable() {
        assert_eq!(
            provider_status_error(reqwest::StatusCode::UNAUTHORIZED),
            "服务返回错误：401 Unauthorized，请检查 API Key、API 地址和模型名称。"
        );
    }

    #[test]
    fn rejects_remote_plain_http_but_allows_loopback_http() {
        assert_eq!(
            validate_base_url_security("http://example.com/v1").unwrap_err(),
            "远程 API 地址必须使用 HTTPS；本机服务可以使用 HTTP。"
        );
        assert!(validate_base_url_security("http://127.0.0.1:11434/v1").is_ok());
        assert!(validate_base_url_security("http://localhost:11434/v1").is_ok());
        assert!(validate_base_url_security("https://api.deepseek.com/v1").is_ok());
    }

    #[test]
    fn settings_view_does_not_expose_api_key() {
        let view = ChatSettingsView::from(&settings());
        let json = serde_json::to_string(&view).unwrap();

        assert!(view.api_key_configured);
        assert!(!json.contains("secret"));
        assert!(!json.contains("apiKey\""));
    }

    #[test]
    fn send_guard_rejects_concurrent_send() {
        let first = SendGuard::acquire().unwrap();
        assert_eq!(
            SendGuard::acquire().unwrap_err(),
            "已有消息正在发送，请稍后再试。"
        );
        drop(first);
        assert!(SendGuard::acquire().is_ok());
    }

    #[test]
    fn removes_failed_user_message_from_conversation() {
        let mut conversation = Conversation {
            messages: vec![
                ChatMessage {
                    id: "keep".to_string(),
                    role: ChatRole::Assistant,
                    content: "已有回复".to_string(),
                    created_at: "1".to_string(),
                },
                ChatMessage {
                    id: "remove".to_string(),
                    role: ChatRole::User,
                    content: "失败消息".to_string(),
                    created_at: "2".to_string(),
                },
            ],
        };

        remove_message_by_id(&mut conversation, "remove");

        assert_eq!(conversation.messages.len(), 1);
        assert_eq!(conversation.messages[0].id, "keep");
    }

    #[test]
    fn save_validation_allows_empty_provider_fields() {
        let mut settings = settings();
        settings.base_url.clear();
        settings.api_key.clear();
        settings.model.clear();

        assert!(validate_chat_settings_for_save(&settings).is_ok());

        settings.temperature = 2.1;
        assert_eq!(
            validate_chat_settings_for_save(&settings).unwrap_err(),
            "temperature 必须在 0 到 2 之间。"
        );

        settings.temperature = 0.7;
        settings.max_context_tokens = 0;
        assert_eq!(
            validate_chat_settings_for_save(&settings).unwrap_err(),
            "maxContextTokens 必须是正数。"
        );
    }
}
