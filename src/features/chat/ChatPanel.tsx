import { useState, type KeyboardEvent } from "react";
import type { ChatMessage } from "./chatTypes";

type ChatPanelProps = {
  messages: ChatMessage[];
  settingsReady: boolean;
  isSending: boolean;
  error: string | null;
  onSend: (content: string) => void | Promise<void>;
  onOpenSettings: () => void;
  onClearConversation: () => void;
  onClose: () => void;
};

export function ChatPanel({
  messages,
  settingsReady,
  isSending,
  error,
  onSend,
  onOpenSettings,
  onClearConversation,
  onClose,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sending = isSending || isSubmitting;
  const canSend = settingsReady && draft.trim().length > 0 && !sending;

  const send = async () => {
    const content = draft.trim();
    if (!content || !settingsReady || sending) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSend(content);
      setDraft((current) => (current === draft ? "" : current));
    } catch {
      // The parent owns the recoverable error message; keep the draft for retry.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    void send();
  };

  return (
    <section className="chat-panel" aria-label="MiniShuya 聊天">
      <header className="panel-header">
        <h2>MiniShuya</h2>
        <div className="panel-header__actions">
          <button type="button" className="ghost-button" onClick={onOpenSettings}>
            设置
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="关闭聊天"
          >
            ×
          </button>
        </div>
      </header>

      {!settingsReady ? (
        <div className="empty-state">
          <strong>先连接一个模型</strong>
          <p>填写 API 地址、Key 和模型名称后，MiniShuya 就可以开始聊天。</p>
          <button type="button" className="primary-button" onClick={onOpenSettings}>
            打开设置
          </button>
        </div>
      ) : null}

      {settingsReady && messages.length === 0 ? (
        <div className="empty-state">
          <strong>今天想聊什么？</strong>
          <p>可以问一个问题，也可以让 MiniShuya 记住你的偏好。</p>
        </div>
      ) : null}

      {messages.length > 0 ? (
        <div className="message-list" role="log" aria-label="消息记录" aria-live="polite">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`message message--${message.role}`}
              aria-label={message.role === "user" ? "用户消息" : "MiniShuya 回复"}
            >
              {message.content}
            </article>
          ))}
        </div>
      ) : null}

      {sending ? (
        <p className="thinking-state" role="status">
          MiniShuya 正在想…
        </p>
      ) : null}
      {error ? (
        <p className="panel-error" role="alert">
          {error}
        </p>
      ) : null}

      <footer className="chat-composer">
        <textarea
          aria-label="输入消息"
          value={draft}
          rows={3}
          placeholder={settingsReady ? "和 MiniShuya 说点什么" : "先完成模型设置"}
          disabled={!settingsReady}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="composer-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClearConversation}
            disabled={messages.length === 0 || sending}
            aria-label="清空对话"
          >
            清空
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => void send()}
            disabled={!canSend}
            aria-label="发送消息"
          >
            发送
          </button>
        </div>
      </footer>
    </section>
  );
}
