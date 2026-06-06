import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ChatMemory, ChatSettingsView } from "../chat/chatTypes";
import { ModelSettingsPanel } from "./ModelSettingsPanel";

const settings: ChatSettingsView = {
  baseUrl: "https://api.deepseek.com/v1",
  model: "deepseek-chat",
  temperature: 0.7,
  maxContextTokens: 6000,
  memoryEnabled: true,
  apiKeyConfigured: true,
};

const memory: ChatMemory = {
  profile: "用户喜欢简洁中文。",
  summary: "",
  updatedAt: null,
};

const renderPanel = (
  props?: Partial<Parameters<typeof ModelSettingsPanel>[0]>,
) =>
  render(
    <ModelSettingsPanel
      settings={settings}
      memory={memory}
      isSaving={false}
      error={null}
      onSave={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />,
  );

describe("ModelSettingsPanel", () => {
  it("renders provider settings without exposing the stored API key", () => {
    renderPanel();

    expect(screen.getByLabelText("API 地址")).toHaveValue(settings.baseUrl);
    expect(screen.getByLabelText("API Key")).toHaveValue("");
    expect(screen.getByText("已配置，可留空保留")).toBeInTheDocument();
    expect(screen.getByLabelText("模型")).toHaveValue(settings.model);
    expect(screen.getByLabelText("用户记忆")).toHaveValue(memory.profile);
  });

  it("validates required fields before save", async () => {
    const onSave = vi.fn();
    renderPanel({
      settings: {
        ...settings,
        baseUrl: "",
        model: "",
        apiKeyConfigured: false,
      },
      onSave,
    });

    await userEvent.click(screen.getByRole("button", { name: "保存设置" }));

    expect(screen.getByText("请输入 API 地址")).toBeInTheDocument();
    expect(screen.getByText("请输入 API Key")).toBeInTheDocument();
    expect(screen.getByText("请输入模型名称")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("renders safe defaults while settings are unavailable", () => {
    renderPanel({ settings: null });

    expect(screen.getByLabelText("API 地址")).toHaveValue("");
    expect(screen.getByLabelText("API Key")).toHaveValue("");
    expect(screen.getByText("尚未配置，请填写 Key")).toBeInTheDocument();
    expect(screen.getByLabelText("模型")).toHaveValue("");
  });

  it("requires a new API key after the API address changes", async () => {
    const onSave = vi.fn();
    renderPanel({ onSave });

    const baseUrl = screen.getByLabelText("API 地址");
    await userEvent.clear(baseUrl);
    await userEvent.type(baseUrl, "https://api.openai.com/v1");
    await userEvent.click(screen.getByRole("button", { name: "保存设置" }));

    expect(screen.getByText("请输入 API Key")).toBeInTheDocument();
    expect(screen.getByText("地址已更改，需要填写新 Key")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("submits edited settings and memory while preserving a configured key", async () => {
    const onSave = vi.fn();
    renderPanel({ onSave });

    await userEvent.clear(screen.getByLabelText("模型"));
    await userEvent.type(screen.getByLabelText("模型"), "qwen-plus");
    await userEvent.clear(screen.getByLabelText("用户记忆"));
    await userEvent.type(screen.getByLabelText("用户记忆"), "称呼我为小王");
    await userEvent.click(screen.getByRole("button", { name: "保存设置" }));

    expect(onSave).toHaveBeenCalledWith(
      {
        baseUrl: settings.baseUrl,
        apiKey: "",
        model: "qwen-plus",
        temperature: 0.7,
        maxContextTokens: 6000,
        memoryEnabled: true,
      },
      {
        ...memory,
        profile: "称呼我为小王",
      },
    );
  });

  it("submits a new key for a changed API address", async () => {
    const onSave = vi.fn();
    renderPanel({ onSave });

    const baseUrl = screen.getByLabelText("API 地址");
    await userEvent.clear(baseUrl);
    await userEvent.type(baseUrl, "https://api.openai.com/v1");
    await userEvent.type(screen.getByLabelText("API Key"), "new-secret");
    await userEvent.click(screen.getByRole("button", { name: "保存设置" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "https://api.openai.com/v1",
        apiKey: "new-secret",
      }),
      memory,
    );
  });

  it("hides user memory when memory is disabled and saves the switch", async () => {
    const onSave = vi.fn();
    renderPanel({ onSave });

    await userEvent.click(screen.getByRole("checkbox", { name: "启用记忆" }));

    expect(screen.queryByLabelText("用户记忆")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "保存设置" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ memoryEnabled: false }),
      memory,
    );
  });

  it("shows saving and error states and allows closing", async () => {
    const onClose = vi.fn();
    renderPanel({
      isSaving: true,
      error: "保存失败，请重试",
      onClose,
    });

    expect(screen.getByRole("alert")).toHaveTextContent("保存失败，请重试");
    expect(screen.getByRole("button", { name: "保存中" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "关闭设置" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
