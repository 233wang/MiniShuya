export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type UserChatMessage = ChatMessage & {
  role: "user";
};

export type AssistantChatMessage = ChatMessage & {
  role: "assistant";
};

export type Conversation = {
  messages: ChatMessage[];
};

export type ChatMemory = {
  profile: string;
  summary: string;
  updatedAt: string | null;
  summarizedThroughMessageId: string | null;
};

export type ChatSettingsFields = {
  baseUrl: string;
  model: string;
  temperature: number;
  maxContextTokens: number;
  memoryEnabled: boolean;
};

export type ChatSettings = ChatSettingsFields & {
  apiKey: string;
};

export type ChatSettingsView = ChatSettingsFields & {
  apiKeyConfigured: boolean;
};

export type ChatSettingsDraft = ChatSettings & {
  apiKeyConfigured: boolean;
  configuredApiKeyBaseUrl: string | null;
};

export type ChatSettingsErrors = Partial<Record<keyof ChatSettings, string>>;

export type ChatSendResult = {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  conversation: Conversation;
  memory: ChatMemory;
};
