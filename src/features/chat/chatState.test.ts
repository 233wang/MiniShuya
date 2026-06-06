import { describe, expect, it } from "vitest";
import {
  appendAssistantMessage,
  appendUserMessage,
  chatSettingsFromDraft,
  defaultChatSettings,
  settingsDraftFromView,
  settingsReady,
  validateSettingsDraft,
} from "./chatState";
import type {
  ChatMessage,
  ChatSettings,
  ChatSettingsDraft,
  ChatSettingsView,
} from "./chatTypes";

const baseSettings: ChatSettings = {
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: "secret",
  model: "deepseek-chat",
  temperature: 0.7,
  maxContextTokens: 6000,
  memoryEnabled: true,
};

const configuredSettingsView: ChatSettingsView = {
  baseUrl: "https://api.deepseek.com/v1",
  model: "deepseek-chat",
  temperature: 0.7,
  maxContextTokens: 6000,
  memoryEnabled: true,
  apiKeyConfigured: true,
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

  it("treats a masked configured API key as ready", () => {
    expect(settingsReady(configuredSettingsView)).toBe(true);
    expect(settingsReady({ ...configuredSettingsView, apiKeyConfigured: false })).toBe(false);
  });

  it("treats a newly entered API key as ready", () => {
    expect(settingsReady(baseSettings)).toBe(true);
    expect(settingsReady({ ...baseSettings, apiKey: "  " })).toBe(false);
  });

  it("rejects non-finite numeric settings as not ready", () => {
    expect(settingsReady({ ...baseSettings, temperature: Number.NaN })).toBe(false);
    expect(settingsReady({ ...baseSettings, maxContextTokens: Number.POSITIVE_INFINITY })).toBe(
      false,
    );
  });

  it("creates an editable draft without exposing the stored API key", () => {
    expect(settingsDraftFromView(configuredSettingsView)).toEqual({
      ...configuredSettingsView,
      apiKey: "",
      configuredApiKeyBaseUrl: configuredSettingsView.baseUrl,
    });
  });

  it("allows a blank draft API key when a stored key is configured", () => {
    const draft = settingsDraftFromView(configuredSettingsView);

    expect(settingsReady(draft)).toBe(true);
    expect(validateSettingsDraft(draft)).toEqual({});
  });

  it("requires a new API key when the draft base URL changes", () => {
    const draft = {
      ...settingsDraftFromView(configuredSettingsView),
      baseUrl: "https://api.openai.com/v1",
    };

    expect(settingsReady(draft)).toBe(false);
    expect(validateSettingsDraft(draft)).toEqual({
      apiKey: "请输入 API Key",
    });
    expect(settingsReady({ ...draft, apiKey: "new-secret" })).toBe(true);
    expect(validateSettingsDraft({ ...draft, apiKey: "new-secret" })).toEqual({});
  });

  it("validates required settings fields including an unconfigured API key", () => {
    const draft: ChatSettingsDraft = {
      ...settingsDraftFromView(configuredSettingsView),
      baseUrl: "",
      apiKeyConfigured: false,
      model: "",
    };

    expect(validateSettingsDraft(draft)).toEqual({
      baseUrl: "请输入 API 地址",
      apiKey: "请输入 API Key",
      model: "请输入模型名称",
    });
  });

  it("validates numeric settings", () => {
    expect(
      validateSettingsDraft({
        ...settingsDraftFromView(configuredSettingsView),
        temperature: 3,
        maxContextTokens: 0,
      }),
    ).toEqual({
      temperature: "temperature 必须在 0 到 2 之间",
      maxContextTokens: "上下文窗口必须是正数",
    });
  });

  it("rejects non-finite numeric settings", () => {
    expect(
      validateSettingsDraft({
        ...settingsDraftFromView(configuredSettingsView),
        temperature: Number.NaN,
        maxContextTokens: Number.NaN,
      }),
    ).toEqual({
      temperature: "temperature 必须在 0 到 2 之间",
      maxContextTokens: "上下文窗口必须是正数",
    });
  });

  it("creates a save payload without draft-only key state", () => {
    const draft = settingsDraftFromView(configuredSettingsView);

    expect(chatSettingsFromDraft(draft)).toEqual({
      baseUrl: configuredSettingsView.baseUrl,
      apiKey: "",
      model: configuredSettingsView.model,
      temperature: configuredSettingsView.temperature,
      maxContextTokens: configuredSettingsView.maxContextTokens,
      memoryEnabled: configuredSettingsView.memoryEnabled,
    });
  });

  it("appends user and assistant messages in order without mutating the source", () => {
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
