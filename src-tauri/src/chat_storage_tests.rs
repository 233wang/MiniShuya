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

    assert_eq!(
        load_chat_settings_from_dir(&dir).unwrap(),
        default_chat_settings()
    );
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
