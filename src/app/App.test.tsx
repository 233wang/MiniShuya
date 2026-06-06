import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ChatMemory,
  ChatSendResult,
  ChatSettingsView,
  Conversation,
} from "../features/chat/chatTypes";
import { App } from "./App";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

const settings: ChatSettingsView = {
  baseUrl: "https://api.deepseek.com/v1",
  model: "deepseek-chat",
  temperature: 0.7,
  maxContextTokens: 6000,
  memoryEnabled: true,
  apiKeyConfigured: true,
};

const memory: ChatMemory = {
  profile: "称呼我为小王",
  summary: "",
  updatedAt: null,
  summarizedThroughMessageId: null,
};

function mockCommands() {
  invokeMock.mockImplementation((command: string, args?: Record<string, unknown>) => {
    switch (command) {
      case "system_idle_millis":
        return Promise.resolve(0);
      case "load_chat_settings":
        return Promise.resolve(settings);
      case "load_conversation":
        return Promise.resolve({ messages: [] } satisfies Conversation);
      case "load_chat_memory":
        return Promise.resolve(memory);
      case "send_chat_message":
        return Promise.resolve({
          userMessage: {
            id: "u1",
            role: "user",
            content: String(args?.content),
            createdAt: "1",
          },
          assistantMessage: {
            id: "a1",
            role: "assistant",
            content: "我记得你，小王。",
            createdAt: "2",
          },
          conversation: {
            messages: [
              {
                id: "u1",
                role: "user",
                content: String(args?.content),
                createdAt: "1",
              },
              {
                id: "a1",
                role: "assistant",
                content: "我记得你，小王。",
                createdAt: "2",
              },
            ],
          },
          memory,
        } satisfies ChatSendResult);
      default:
        return Promise.resolve();
    }
  });
}

describe("App chat MVP integration", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    mockCommands();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("loads local state and completes a chat turn from the pet menu", async () => {
    render(<App />);

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("load_chat_settings");
      expect(invokeMock).toHaveBeenCalledWith("load_conversation");
      expect(invokeMock).toHaveBeenCalledWith("load_chat_memory");
    });

    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    fireEvent.contextMenu(pet);
    await userEvent.click(screen.getByRole("menuitem", { name: "聊天" }));
    await userEvent.type(screen.getByLabelText("输入消息"), "你还记得我吗？{enter}");

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("send_chat_message", {
        content: "你还记得我吗？",
      });
      expect(screen.getByText("我记得你，小王。")).toBeInTheDocument();
    });
  });

  it("saves edited provider settings and memory, then returns to chat", async () => {
    render(<App />);
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("load_chat_settings"));

    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    fireEvent.contextMenu(pet);
    await userEvent.click(screen.getByRole("menuitem", { name: "设置" }));

    await userEvent.clear(screen.getByLabelText("模型"));
    await userEvent.type(screen.getByLabelText("模型"), "qwen-plus");
    await userEvent.clear(screen.getByLabelText("用户记忆"));
    await userEvent.type(screen.getByLabelText("用户记忆"), "偏好简洁回答");
    await userEvent.click(screen.getByRole("button", { name: "保存设置" }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("save_chat_settings", {
        settings: expect.objectContaining({ model: "qwen-plus", apiKey: "" }),
      });
      expect(invokeMock).toHaveBeenCalledWith("save_chat_memory", {
        memory: expect.objectContaining({ profile: "偏好简洁回答" }),
      });
      expect(screen.getByLabelText("MiniShuya 聊天")).toBeInTheDocument();
    });
  });
});
