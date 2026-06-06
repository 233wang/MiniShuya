import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatPanel } from "./ChatPanel";
import type { ChatMessage } from "./chatTypes";

const messages: ChatMessage[] = [
  { id: "u1", role: "user", content: "你好", createdAt: "1" },
  { id: "a1", role: "assistant", content: "我在。", createdAt: "2" },
  { id: "u2", role: "user", content: "记得我喜欢咖啡吗？", createdAt: "3" },
];

const renderPanel = (props?: Partial<Parameters<typeof ChatPanel>[0]>) =>
  render(
    <ChatPanel
      messages={[]}
      settingsReady
      isSending={false}
      error={null}
      onSend={vi.fn(async () => {})}
      onOpenSettings={vi.fn()}
      onClearConversation={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />,
  );

describe("ChatPanel", () => {
  it("renders missing settings state and opens settings", async () => {
    const onOpenSettings = vi.fn();
    renderPanel({ settingsReady: false, onOpenSettings });

    expect(screen.getByText("先连接一个模型")).toBeInTheDocument();
    expect(screen.getByLabelText("输入消息")).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "打开设置" }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it("renders an empty prompt when settings are ready", () => {
    renderPanel();

    expect(screen.getByText("今天想聊什么？")).toBeInTheDocument();
    expect(screen.getByLabelText("输入消息")).toBeEnabled();
  });

  it("renders multi-turn messages in order with accessible roles", () => {
    renderPanel({ messages });

    const history = screen.getByRole("log", { name: "消息记录" });
    expect(history).toHaveTextContent("你好我在。记得我喜欢咖啡吗？");
    expect(screen.getAllByLabelText("用户消息")).toHaveLength(2);
    expect(screen.getByLabelText("MiniShuya 回复")).toHaveTextContent("我在。");
  });

  it("sends a trimmed draft with Enter and keeps Shift Enter as a newline", async () => {
    const onSend = vi.fn(async () => {});
    renderPanel({ onSend });

    const input = screen.getByLabelText("输入消息");
    await userEvent.type(input, "  第一行{shift>}{enter}{/shift}第二行  ");

    expect(input).toHaveValue("  第一行\n第二行  ");
    expect(onSend).not.toHaveBeenCalled();

    await userEvent.type(input, "{enter}");
    expect(onSend).toHaveBeenCalledWith("第一行\n第二行");
    expect(input).toHaveValue("");
  });

  it("does not send Enter while an IME composition is active", async () => {
    const onSend = vi.fn(async () => {});
    renderPanel({ onSend });

    const input = screen.getByLabelText("输入消息");
    await userEvent.type(input, "输入中");
    fireEvent.keyDown(input, {
      key: "Enter",
      isComposing: true,
      keyCode: 229,
    });

    expect(onSend).not.toHaveBeenCalled();
    expect(input).toHaveValue("输入中");
  });

  it("scrolls to the latest message on open and when messages are added", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    const { rerender } = renderPanel({ messages });
    expect(scrollIntoView).toHaveBeenCalledOnce();

    rerender(
      <ChatPanel
        messages={[
          ...messages,
          { id: "a2", role: "assistant", content: "当然记得。", createdAt: "4" },
        ]}
        settingsReady
        isSending={false}
        error={null}
        onSend={vi.fn(async () => {})}
        onOpenSettings={vi.fn()}
        onClearConversation={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it("keeps the draft visible and prevents duplicate sends while an async send is pending", async () => {
    let resolveSend: (() => void) | undefined;
    const onSend = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        }),
    );
    renderPanel({ onSend });

    const input = screen.getByLabelText("输入消息");
    await userEvent.type(input, "等回复");
    await userEvent.click(screen.getByRole("button", { name: "发送消息" }));

    expect(screen.getByText("MiniShuya 正在想…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发送消息" })).toBeDisabled();
    expect(input).toHaveValue("等回复");

    await userEvent.type(input, "{enter}");
    expect(onSend).toHaveBeenCalledOnce();

    resolveSend?.();
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("shows a recoverable error and preserves the draft after a failed send", async () => {
    const onSend = vi.fn().mockRejectedValue(new Error("request failed"));
    const { rerender } = renderPanel({ onSend });

    const input = screen.getByLabelText("输入消息");
    await userEvent.type(input, "请再试一次");
    await userEvent.click(screen.getByRole("button", { name: "发送消息" }));

    await waitFor(() => expect(onSend).toHaveBeenCalledOnce());
    expect(input).toHaveValue("请再试一次");

    rerender(
      <ChatPanel
        messages={[]}
        settingsReady
        isSending={false}
        error="模型请求超时，请稍后再试。"
        onSend={onSend}
        onOpenSettings={vi.fn()}
        onClearConversation={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("模型请求超时，请稍后再试。");
    expect(screen.getByLabelText("输入消息")).toHaveValue("请再试一次");
  });

  it("shows parent-controlled sending state and disables duplicate sends", async () => {
    const onSend = vi.fn(async () => {});
    const onOpenSettings = vi.fn();
    const onClearConversation = vi.fn();
    const onClose = vi.fn();
    renderPanel({
      isSending: true,
      messages,
      onSend,
      onOpenSettings,
      onClearConversation,
      onClose,
    });

    expect(screen.getByText("MiniShuya 正在想…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发送消息" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "设置" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "关闭聊天" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "清空对话" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("输入消息"), "重复发送{enter}");
    await userEvent.click(screen.getByRole("button", { name: "设置" }));
    await userEvent.click(screen.getByRole("button", { name: "关闭聊天" }));
    await userEvent.click(screen.getByRole("button", { name: "清空对话" }));
    expect(onSend).not.toHaveBeenCalled();
    expect(onOpenSettings).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onClearConversation).not.toHaveBeenCalled();
  });

  it("calls clear and close actions and disables clear when unavailable", async () => {
    const onClearConversation = vi.fn();
    const onClose = vi.fn();
    const { rerender } = renderPanel({ onClearConversation, onClose });

    expect(screen.getByRole("button", { name: "清空对话" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "关闭聊天" }));
    expect(onClose).toHaveBeenCalledOnce();

    rerender(
      <ChatPanel
        messages={messages}
        settingsReady
        isSending={false}
        error={null}
        onSend={vi.fn(async () => {})}
        onOpenSettings={vi.fn()}
        onClearConversation={onClearConversation}
        onClose={onClose}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "清空对话" }));
    expect(onClearConversation).toHaveBeenCalledOnce();
  });
});
