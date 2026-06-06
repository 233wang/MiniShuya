import type {
  ChatMessage,
  ChatSettings,
  ChatSettingsDraft,
  ChatSettingsErrors,
  ChatSettingsView,
} from "./chatTypes";

type ReadySettings = ChatSettings | ChatSettingsView | ChatSettingsDraft;

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

export function settingsDraftFromView(settings: ChatSettingsView): ChatSettingsDraft {
  return {
    ...settings,
    apiKey: "",
  };
}

export function chatSettingsFromDraft(settings: ChatSettingsDraft): ChatSettings {
  return {
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
    model: settings.model,
    temperature: settings.temperature,
    maxContextTokens: settings.maxContextTokens,
    memoryEnabled: settings.memoryEnabled,
  };
}

export function settingsReady(settings: ReadySettings): boolean {
  const apiKeyReady =
    ("apiKey" in settings && settings.apiKey.trim().length > 0) ||
    ("apiKeyConfigured" in settings && settings.apiKeyConfigured);

  return (
    settings.baseUrl.trim().length > 0 &&
    apiKeyReady &&
    settings.model.trim().length > 0 &&
    settings.temperature >= 0 &&
    settings.temperature <= 2 &&
    settings.maxContextTokens > 0
  );
}

export function validateSettingsDraft(
  settings: ChatSettings | ChatSettingsDraft,
): ChatSettingsErrors {
  const errors: ChatSettingsErrors = {};
  if (!settings.baseUrl.trim()) {
    errors.baseUrl = "请输入 API 地址";
  }
  if (
    !settings.apiKey.trim() &&
    !("apiKeyConfigured" in settings && settings.apiKeyConfigured)
  ) {
    errors.apiKey = "请输入 API Key";
  }
  if (!settings.model.trim()) {
    errors.model = "请输入模型名称";
  }
  if (
    !Number.isFinite(settings.temperature) ||
    settings.temperature < 0 ||
    settings.temperature > 2
  ) {
    errors.temperature = "temperature 必须在 0 到 2 之间";
  }
  if (!Number.isFinite(settings.maxContextTokens) || settings.maxContextTokens <= 0) {
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
