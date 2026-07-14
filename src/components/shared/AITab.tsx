import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useSettingsStore } from "@/stores/settingsStore";
import { AI_PROVIDERS } from "@/lib/config/aiConfig";
import type { AIProvider } from "@/lib/config/aiConfig";
import { DropdownSelect } from "@/features/project-setup/DropdownSelect";
import { Brain, Key, X, Eye, EyeOff } from "lucide-react";

function maskKey(key: string): string {
  if (key.length <= 3) return key;
  return key.slice(0, 3) + "•".repeat(key.length - 3);
}

interface AITabProps {
  open: boolean;
}

export function AITab({ open }: AITabProps) {
  const { t } = useI18n();
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const setAiProvider = useSettingsStore((s) => s.setAiProvider);
  const saveApiKey = useSettingsStore((s) => s.saveApiKey);
  const deleteApiKey = useSettingsStore((s) => s.deleteApiKey);
  const overwriteTranslations = useSettingsStore((s) => s.overwriteTranslations);
  const setOverwriteTranslations = useSettingsStore((s) => s.setOverwriteTranslations);

  const [providerDraft, setProviderDraft] = useState<AIProvider>(null);
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const keyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setProviderDraft(aiProvider);
      setKeyInput("");
      setShowKey(false);
    }
  }, [open, aiProvider]);

  const currentKey = providerDraft ? apiKeys[providerDraft] ?? "" : "";

  const handleFocusKeyInput = () => {
    if (!currentKey) setKeyInput("");
  };

  const handleSaveKey = async () => {
    if (!providerDraft) return;
    if (keyInput) {
      await saveApiKey(providerDraft, keyInput);
      setKeyInput("");
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRemoveKey = async () => {
    if (!providerDraft) return;
    await deleteApiKey(providerDraft);
  };

  const providerOptions = AI_PROVIDERS.map((p) => p.label);
  const selectedLabel = AI_PROVIDERS.find((p) => p.value === providerDraft)?.label ?? "None";

  return (
    <div className="space-y-6">
      {/* Provider */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Brain className="size-5 text-primary" />
          <div>
            <p className="font-label-lg text-on-surface">{t("settings.aiProvider")}</p>
          </div>
        </div>
        <DropdownSelect
          icon={Brain}
          label={t("settings.aiProvider")}
          value={selectedLabel}
          options={providerOptions}
          onChange={(label) => {
            const provider = AI_PROVIDERS.find((p) => p.label === label)?.value ?? null;
            setProviderDraft(provider);
            setAiProvider(provider);
            setKeyInput("");
          }}
        />
      </div>

      {/* API Key */}
      {providerDraft && (
        <div className="space-y-4">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-on-surface-variant pointer-events-none" />
              <input
                ref={keyInputRef}
                type={showKey ? "text" : "password"}
                value={keyInput ? keyInput : currentKey ? maskKey(currentKey) : ""}
                onChange={(e) => setKeyInput(e.target.value)}
                onFocus={handleFocusKeyInput}
                placeholder={currentKey ? maskKey(currentKey) : t("settings.aiApiKey")}
                className="w-full pl-12 pr-12 py-3 rounded-full bg-surface-container-high border border-outline-variant/50 text-on-surface font-body-md placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              />
              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {currentKey && (
              <button type="button" onClick={handleRemoveKey} className="size-9 rounded-lg bg-error-container/30 hover:bg-error-container text-error hover:text-on-error-container flex items-center justify-center transition-colors shrink-0">
                <X className="size-4" />
              </button>
            )}
          </div>
          <button
            onClick={handleSaveKey}
            disabled={!keyInput}
            className={`px-6 py-2.5 rounded-full font-label-lg transition-all ${
              saved ? "bg-green-600 text-white" : "bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary disabled:opacity-50"
            }`}
          >
            {saved ? t("settings.aiSaved") : t("settings.aiSave")}
          </button>
        </div>
      )}

      {/* Overwrite toggle */}
      <div className="border-t border-outline-variant/20 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-label-lg text-on-surface">{t("settings.overwriteTranslations")}</p>
            <p className="font-body-md text-on-surface-variant mt-1">{t("settings.overwriteTranslationsDesc")}</p>
          </div>
          <button
            onClick={() => setOverwriteTranslations(!overwriteTranslations)}
            className={`relative ml-4 inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
              overwriteTranslations ? "bg-primary" : "bg-surface-container-highest border border-outline-variant/50"
            }`}
            role="switch"
            aria-checked={overwriteTranslations}
          >
            <span className={`inline-block size-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${overwriteTranslations ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
