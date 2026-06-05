use crate::chat_storage::{ChatMemory, ChatRole, ChatSettings, Conversation};
use serde::{Deserialize, Serialize};

pub const OPENAI_COMPATIBLE_PATH: &str = "/chat/completions";
pub const SYSTEM_PROMPT: &str = "你是 MiniShuya，一个小巧、温和、安静的 Windows 桌面伙伴。你说中文，语气亲近但不过度热闹。你优先给出有帮助、简洁、可执行的回答。不要假装知道用户没有告诉你的事实。";

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct OpenAiMessage {
    pub role: String,
    pub content: String,
}

pub fn approximate_tokens(text: &str) -> usize {
    if text.is_empty() {
        0
    } else {
        text.chars().count().div_ceil(3)
    }
}

pub fn build_chat_completions_url(base_url: &str) -> Result<String, String> {
    let url = base_url.trim().trim_end_matches('/');
    if url.is_empty() {
        return Err("请先在设置里填写 API 地址、Key 和模型名称。".to_string());
    }

    if url.ends_with(OPENAI_COMPATIBLE_PATH) {
        Ok(url.to_string())
    } else {
        Ok(format!("{url}{OPENAI_COMPATIBLE_PATH}"))
    }
}

pub fn build_context_messages(
    settings: &ChatSettings,
    conversation: &Conversation,
    memory: &ChatMemory,
    current_user_message: &str,
) -> Vec<OpenAiMessage> {
    let system_content = build_system_content(settings, memory);
    let system_tokens = approximate_tokens(&system_content);
    let current_tokens = approximate_tokens(current_user_message);
    let budget = settings.max_context_tokens.saturating_mul(85) / 100;
    let reserved = system_tokens
        .saturating_add(current_tokens)
        .saturating_add(16);
    let recent_budget = budget.saturating_sub(reserved);

    let mut recent_messages = Vec::new();
    let mut used_recent_tokens = 0usize;
    for message in conversation.messages.iter().rev() {
        let token_count = approximate_tokens(&message.content);
        if used_recent_tokens.saturating_add(token_count) > recent_budget {
            continue;
        }

        recent_messages.push(OpenAiMessage {
            role: role_name(message.role).to_string(),
            content: message.content.clone(),
        });
        used_recent_tokens += token_count;
    }
    recent_messages.reverse();

    let mut messages = Vec::with_capacity(recent_messages.len() + 2);
    messages.push(OpenAiMessage {
        role: "system".to_string(),
        content: system_content,
    });
    messages.extend(recent_messages);
    messages.push(OpenAiMessage {
        role: "user".to_string(),
        content: current_user_message.to_string(),
    });
    messages
}

fn build_system_content(settings: &ChatSettings, memory: &ChatMemory) -> String {
    let mut content = SYSTEM_PROMPT.to_string();
    if settings.memory_enabled {
        let profile = memory.profile.trim();
        if !profile.is_empty() {
            content.push_str("\n\n用户记忆:\n");
            content.push_str(profile);
        }

        let summary = memory.summary.trim();
        if !summary.is_empty() {
            content.push_str("\n\n对话摘要:\n");
            content.push_str(summary);
        }
    }
    content
}

fn role_name(role: ChatRole) -> &'static str {
    match role {
        ChatRole::User => "user",
        ChatRole::Assistant => "assistant",
    }
}
