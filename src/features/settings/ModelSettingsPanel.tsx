import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  chatSettingsFromDraft,
  settingsDraftFromView,
  validateSettingsDraft,
} from "../chat/chatState";
import type {
  ChatMemory,
  ChatSettingsDraft,
  ChatSettingsErrors,
  ChatSettingsView,
} from "../chat/chatTypes";

type ModelSettingsPanelProps = {
  settings: ChatSettingsView | null;
  memory: ChatMemory;
  isSaving: boolean;
  error: string | null;
  onSave: (
    settings: ReturnType<typeof chatSettingsFromDraft>,
    memory: ChatMemory,
  ) => void;
  onClose: () => void;
};

const emptySettingsView: ChatSettingsView = {
  baseUrl: "",
  model: "",
  temperature: 0.7,
  maxContextTokens: 6000,
  memoryEnabled: true,
  apiKeyConfigured: false,
};

export function ModelSettingsPanel({
  settings,
  memory,
  isSaving,
  error,
  onSave,
  onClose,
}: ModelSettingsPanelProps) {
  const [draft, setDraft] = useState<ChatSettingsDraft>(() =>
    settingsDraftFromView(settings ?? emptySettingsView),
  );
  const [memoryDraft, setMemoryDraft] = useState(memory);
  const [errors, setErrors] = useState<ChatSettingsErrors>({});
  const settingsDirty = useRef(false);
  const memoryDirty = useRef(false);

  useEffect(() => {
    if (!settingsDirty.current) {
      setDraft(settingsDraftFromView(settings ?? emptySettingsView));
      setErrors({});
    }
  }, [settings]);

  useEffect(() => {
    if (!memoryDirty.current) {
      setMemoryDraft(memory);
    }
  }, [memory]);

  const updateDraft = <Key extends keyof ChatSettingsDraft>(
    key: Key,
    value: ChatSettingsDraft[Key],
  ) => {
    settingsDirty.current = true;
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const keyCanBePreserved =
    draft.apiKeyConfigured &&
    draft.configuredApiKeyBaseUrl !== null &&
    draft.configuredApiKeyBaseUrl.trim() === draft.baseUrl.trim();
  const keyHelp = keyCanBePreserved
    ? "已配置，可留空保留"
    : draft.apiKeyConfigured
      ? "地址已更改，需要填写新 Key"
      : "尚未配置，请填写 Key";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const nextErrors = validateSettingsDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onSave(chatSettingsFromDraft(draft), memoryDraft);
  };

  return (
    <section className="settings-panel" aria-label="模型设置">
      <header className="panel-header">
        <h2>模型设置</h2>
        <button
          className="icon-button"
          type="button"
          disabled={isSaving}
          onClick={onClose}
          aria-label="关闭设置"
        >
          ×
        </button>
      </header>

      <form onSubmit={submit} noValidate>
        <label className="field">
          <span>API 地址</span>
          <input
            value={draft.baseUrl}
            disabled={isSaving}
            placeholder="https://api.deepseek.com/v1"
            aria-invalid={Boolean(errors.baseUrl)}
            aria-describedby={errors.baseUrl ? "base-url-error" : undefined}
            onChange={(event) => updateDraft("baseUrl", event.target.value)}
          />
          {errors.baseUrl ? (
            <small id="base-url-error" className="field-error">
              {errors.baseUrl}
            </small>
          ) : null}
        </label>

        <label className="field">
          <span>API Key</span>
          <input
            type="password"
            value={draft.apiKey}
            disabled={isSaving}
            autoComplete="off"
            aria-label="API Key"
            placeholder={keyCanBePreserved ? "留空保留当前 Key" : "输入 API Key"}
            aria-invalid={Boolean(errors.apiKey)}
            aria-describedby={errors.apiKey ? "api-key-error api-key-help" : "api-key-help"}
            onChange={(event) => updateDraft("apiKey", event.target.value)}
          />
          {errors.apiKey ? (
            <small id="api-key-error" className="field-error">
              {errors.apiKey}
            </small>
          ) : null}
          <small id="api-key-help" className="field-help">
            {keyHelp}
          </small>
        </label>

        <label className="field">
          <span>模型</span>
          <input
            value={draft.model}
            disabled={isSaving}
            placeholder="deepseek-chat"
            aria-invalid={Boolean(errors.model)}
            aria-describedby={errors.model ? "model-error" : undefined}
            onChange={(event) => updateDraft("model", event.target.value)}
          />
          {errors.model ? (
            <small id="model-error" className="field-error">
              {errors.model}
            </small>
          ) : null}
        </label>

        <div className="settings-grid">
          <label className="field">
            <span>Temperature</span>
            <input
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={draft.temperature}
              disabled={isSaving}
              aria-label="Temperature"
              aria-invalid={Boolean(errors.temperature)}
              aria-describedby={errors.temperature ? "temperature-error" : undefined}
              onChange={(event) => updateDraft("temperature", Number(event.target.value))}
            />
            {errors.temperature ? (
              <small id="temperature-error" className="field-error">
                {errors.temperature}
              </small>
            ) : null}
          </label>

          <label className="field">
            <span>上下文窗口</span>
            <input
              type="number"
              min={1}
              step={1}
              value={draft.maxContextTokens}
              disabled={isSaving}
              aria-label="上下文窗口"
              aria-invalid={Boolean(errors.maxContextTokens)}
              aria-describedby={
                errors.maxContextTokens ? "max-context-tokens-error" : undefined
              }
              onChange={(event) =>
                updateDraft("maxContextTokens", Number(event.target.value))
              }
            />
            {errors.maxContextTokens ? (
              <small id="max-context-tokens-error" className="field-error">
                {errors.maxContextTokens}
              </small>
            ) : null}
          </label>
        </div>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={draft.memoryEnabled}
            disabled={isSaving}
            onChange={(event) => updateDraft("memoryEnabled", event.target.checked)}
          />
          <span>启用记忆</span>
        </label>

        {draft.memoryEnabled ? (
          <>
            <label className="field">
              <span>用户记忆</span>
              <textarea
                value={memoryDraft.profile}
                rows={4}
                disabled={isSaving}
                onChange={(event) => {
                  memoryDirty.current = true;
                  setMemoryDraft((current) => ({
                    ...current,
                    profile: event.target.value,
                  }));
                }}
              />
            </label>
            <label className="field">
              <span>对话摘要（自动维护）</span>
              <textarea
                value={memoryDraft.summary}
                rows={3}
                readOnly
                disabled={isSaving}
                placeholder="长对话超出上下文窗口后，会在这里生成摘要。"
              />
            </label>
          </>
        ) : null}

        {error ? (
          <p className="panel-error" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="panel-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={isSaving}
            onClick={onClose}
          >
            取消
          </button>
          <button type="submit" className="primary-button" disabled={isSaving}>
            {isSaving ? "保存中" : "保存设置"}
          </button>
        </footer>
      </form>
    </section>
  );
}
