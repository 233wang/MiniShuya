use crate::chat_context::{
    approximate_tokens, build_chat_completions_url, build_context_messages, build_summary_messages,
    messages_to_summarize, SYSTEM_PROMPT,
};
use crate::chat_storage::{ChatMemory, ChatMessage, ChatRole, ChatSettings, Conversation};

fn settings(memory_enabled: bool, max_context_tokens: usize) -> ChatSettings {
    ChatSettings {
        base_url: "https://api.deepseek.com/v1".to_string(),
        api_key: "secret".to_string(),
        model: "deepseek-chat".to_string(),
        temperature: 0.7,
        max_context_tokens,
        memory_enabled,
    }
}

fn memory(profile: &str, summary: &str) -> ChatMemory {
    ChatMemory {
        profile: profile.to_string(),
        summary: summary.to_string(),
        updated_at: None,
        summarized_through_message_id: None,
    }
}

#[test]
fn identifies_only_newly_excluded_messages_for_summary() {
    let old_long = "旧消息很长".repeat(80);
    let conversation = Conversation {
        messages: vec![
            message("01", ChatRole::User, &old_long),
            message("02", ChatRole::Assistant, &old_long),
            message("03", ChatRole::User, "最近问题"),
            message("04", ChatRole::Assistant, "最近回答"),
        ],
    };
    let mut memory = memory("", "已有摘要");

    let first = messages_to_summarize(&settings(true, 90), &conversation, &memory, "当前问题");
    assert_eq!(
        first
            .iter()
            .map(|message| message.id.as_str())
            .collect::<Vec<_>>(),
        vec!["01"]
    );

    memory.summarized_through_message_id = Some("01".to_string());
    assert_eq!(
        messages_to_summarize(&settings(true, 90), &conversation, &memory, "当前问题")
            .iter()
            .map(|message| message.id.as_str())
            .collect::<Vec<_>>(),
        vec!["02"]
    );

    memory.summarized_through_message_id = Some("02".to_string());
    assert!(
        messages_to_summarize(&settings(true, 90), &conversation, &memory, "当前问题").is_empty()
    );
}

#[test]
fn builds_summary_request_with_existing_summary_and_old_messages() {
    let messages = build_summary_messages(
        &memory("", "用户正在开发桌宠"),
        &[
            message("01", ChatRole::User, "我偏好简洁回答"),
            message("02", ChatRole::Assistant, "我会保持简洁"),
        ],
    );

    assert_eq!(messages.first().unwrap().role, "system");
    assert!(messages.last().unwrap().content.contains("已有摘要"));
    assert!(messages
        .last()
        .unwrap()
        .content
        .contains("用户正在开发桌宠"));
    assert!(messages
        .last()
        .unwrap()
        .content
        .contains("user: 我偏好简洁回答"));
    assert!(messages
        .last()
        .unwrap()
        .content
        .contains("assistant: 我会保持简洁"));
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
        "https://api.deepseek.com/v1/chat/completions"
    );
    assert_eq!(
        build_chat_completions_url("https://dashscope.aliyuncs.com/compatible-mode/v1/").unwrap(),
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    );
    assert_eq!(
        build_chat_completions_url("https://example.com/v1/chat/completions").unwrap(),
        "https://example.com/v1/chat/completions"
    );
    assert_eq!(
        build_chat_completions_url("   ").unwrap_err(),
        "请先在设置里填写 API 地址、Key 和模型名称。"
    );
}

#[test]
fn includes_system_prompt_and_current_user_message() {
    let messages = build_context_messages(
        &settings(true, 6000),
        &Conversation { messages: vec![] },
        &memory("", ""),
        "现在的问题",
    );

    assert_eq!(messages.first().unwrap().role, "system");
    assert!(messages.first().unwrap().content.contains(SYSTEM_PROMPT));
    assert_eq!(messages.last().unwrap().role, "user");
    assert_eq!(messages.last().unwrap().content, "现在的问题");
}

#[test]
fn includes_profile_and_summary_when_memory_enabled() {
    let messages = build_context_messages(
        &settings(true, 6000),
        &Conversation { messages: vec![] },
        &memory("用户喜欢简洁回答", "用户正在开发 MiniShuya"),
        "继续",
    );

    let system_content = &messages.first().unwrap().content;
    assert!(system_content.contains("用户记忆"));
    assert!(system_content.contains("用户喜欢简洁回答"));
    assert!(system_content.contains("对话摘要"));
    assert!(system_content.contains("用户正在开发 MiniShuya"));
}

#[test]
fn omits_memory_when_disabled() {
    let messages = build_context_messages(
        &settings(false, 6000),
        &Conversation { messages: vec![] },
        &memory("用户喜欢简洁回答", "用户正在开发 MiniShuya"),
        "继续",
    );

    let system_content = &messages.first().unwrap().content;
    assert!(!system_content.contains("用户记忆"));
    assert!(!system_content.contains("对话摘要"));
}

#[test]
fn keeps_newest_recent_messages_under_budget_and_preserves_order() {
    let old_long = "旧消息很长".repeat(80);
    let conversation = Conversation {
        messages: vec![
            message("01", ChatRole::User, &old_long),
            message("02", ChatRole::Assistant, &old_long),
            message("03", ChatRole::User, "最近问题"),
            message("04", ChatRole::Assistant, "最近回答"),
        ],
    };

    let messages = build_context_messages(
        &settings(false, 90),
        &conversation,
        &memory("", ""),
        "当前问题",
    );
    let contents: Vec<&str> = messages
        .iter()
        .map(|message| message.content.as_str())
        .collect();

    assert!(!contents.contains(&old_long.as_str()));
    assert!(contents.contains(&"最近问题"));
    assert!(contents.contains(&"最近回答"));
    assert_eq!(contents.last(), Some(&"当前问题"));

    let recent_question_index = contents
        .iter()
        .position(|content| *content == "最近问题")
        .unwrap();
    let recent_answer_index = contents
        .iter()
        .position(|content| *content == "最近回答")
        .unwrap();
    assert!(recent_question_index < recent_answer_index);
}

#[test]
fn counts_recent_message_structural_overhead() {
    let conversation = Conversation {
        messages: vec![
            message("01", ChatRole::User, "一"),
            message("02", ChatRole::Assistant, "二"),
            message("03", ChatRole::User, "三"),
            message("04", ChatRole::Assistant, "四"),
        ],
    };

    let messages = build_context_messages(
        &settings(false, 74),
        &conversation,
        &memory("", ""),
        "当前问题",
    );
    let recent_count = messages
        .iter()
        .filter(|message| message.content == "一" || message.content == "二")
        .count();

    assert_eq!(recent_count, 0);
    assert!(messages.iter().any(|message| message.content == "三"));
    assert!(messages.iter().any(|message| message.content == "四"));
}
