import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import { ChatPanel } from "../features/chat/ChatPanel";
import { settingsReady } from "../features/chat/chatState";
import type {
  ChatMemory,
  ChatSendResult,
  ChatSettings,
  ChatSettingsView,
  Conversation,
} from "../features/chat/chatTypes";
import { type CharacterHitRegion } from "../features/pet/characterAssets";
import { Pet } from "../features/pet/Pet";
import { ModelSettingsPanel } from "../features/settings/ModelSettingsPanel";

const emptyMemory: ChatMemory = {
  profile: "",
  summary: "",
  updatedAt: null,
  summarizedThroughMessageId: null,
};

export function App() {
  const [systemIdleMillis, setSystemIdleMillis] = useState(0);
  const [activePanel, setActivePanel] = useState<"chat" | "settings" | null>(null);
  const [chatSettings, setChatSettings] = useState<ChatSettingsView | null>(null);
  const [chatMemory, setChatMemory] = useState<ChatMemory>(emptyMemory);
  const [messages, setMessages] = useState<Conversation["messages"]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const updateSystemIdleMillis = () => {
      void invoke<number>("system_idle_millis").then((idleMillis) => {
        if (!cancelled) {
          setSystemIdleMillis(idleMillis);
        }
      });
    };

    updateSystemIdleMillis();
    const interval = window.setInterval(updateSystemIdleMillis, 1_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    void invoke("set_overlay_hit_region_visible", { visible: activePanel !== null });
  }, [activePanel]);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      invoke<ChatSettingsView>("load_chat_settings"),
      invoke<Conversation>("load_conversation"),
      invoke<ChatMemory>("load_chat_memory"),
    ])
      .then(([settings, conversation, memory]) => {
        if (!cancelled) {
          setChatSettings(settings);
          setMessages(conversation.messages);
          setChatMemory(memory);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setChatError(String(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDragMove = useCallback((delta: { deltaX: number; deltaY: number }) => {
    void invoke("move_window_by", delta);
  }, []);

  const handleDragEnd = useCallback(() => {
    void invoke("save_current_position");
  }, []);

  const handleExit = useCallback(() => {
    void invoke("exit_app");
  }, []);

  const handleMenuVisibilityChange = useCallback((visible: boolean) => {
    void invoke("set_menu_hit_region_visible", { visible });
  }, []);

  const handleCharacterHitRegionChange = useCallback((region: CharacterHitRegion) => {
    void invoke("set_character_hit_region", { region });
  }, []);

  const handleCharacterFrameChange = useCallback((frameKey: string) => {
    void invoke("set_current_character_frame", { frameKey });
  }, []);

  const readPrimaryMouseDown = useCallback(() => invoke<boolean>("is_primary_mouse_down"), []);

  const handleSendChatMessage = useCallback(async (content: string) => {
    setIsSending(true);
    setChatError(null);
    try {
      const result = await invoke<ChatSendResult>("send_chat_message", { content });
      setMessages(result.conversation.messages);
      setChatMemory(result.memory);
    } catch (error) {
      setChatError(String(error));
      throw error;
    } finally {
      setIsSending(false);
    }
  }, []);

  const handleSaveSettings = useCallback((settings: ChatSettings, memory: ChatMemory) => {
    setIsSavingSettings(true);
    setSettingsError(null);
    void Promise.all([
      invoke("save_chat_settings", { settings }),
      invoke("save_chat_memory", { memory }),
    ])
      .then(() => {
        setChatSettings((current) => ({
          baseUrl: settings.baseUrl,
          model: settings.model,
          temperature: settings.temperature,
          maxContextTokens: settings.maxContextTokens,
          memoryEnabled: settings.memoryEnabled,
          apiKeyConfigured:
            settings.apiKey.trim().length > 0 || current?.apiKeyConfigured === true,
        }));
        setChatMemory(memory);
        setActivePanel("chat");
      })
      .catch((error) => setSettingsError(String(error)))
      .finally(() => setIsSavingSettings(false));
  }, []);

  const handleClearConversation = useCallback(() => {
    if (!window.confirm("清空当前对话？")) {
      return;
    }

    setChatError(null);
    void invoke("clear_conversation")
      .then(() => setMessages([]))
      .catch((error) => setChatError(String(error)));
  }, []);

  return (
    <main className="app-shell">
      <Pet
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onExit={handleExit}
        onOpenChat={() => setActivePanel("chat")}
        onOpenSettings={() => setActivePanel("settings")}
        systemIdleMillis={systemIdleMillis}
        readPrimaryMouseDown={readPrimaryMouseDown}
        onCharacterHitRegionChange={handleCharacterHitRegionChange}
        onCharacterFrameChange={handleCharacterFrameChange}
        onMenuVisibilityChange={handleMenuVisibilityChange}
      />
      {activePanel === "chat" ? (
        <ChatPanel
          messages={messages}
          settingsReady={chatSettings ? settingsReady(chatSettings) : false}
          isSending={isSending}
          error={chatError}
          onSend={handleSendChatMessage}
          onOpenSettings={() => setActivePanel("settings")}
          onClearConversation={handleClearConversation}
          onClose={() => setActivePanel(null)}
        />
      ) : null}
      {activePanel === "settings" ? (
        <ModelSettingsPanel
          settings={chatSettings}
          memory={chatMemory}
          isSaving={isSavingSettings}
          error={settingsError}
          onSave={handleSaveSettings}
          onClose={() => setActivePanel(null)}
        />
      ) : null}
    </main>
  );
}
