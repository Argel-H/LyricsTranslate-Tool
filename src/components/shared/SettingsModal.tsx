import { Modal } from "@/features/shell/Modal";
import { DropdownSelect } from "@/features/project-setup/DropdownSelect";
import { useI18n } from "@/hooks/useI18n";
import { useSettingsStore } from "@/stores/settingsStore";
import { LANGUAGE_LABELS, type LanguageCode } from "@/lib/constants";
import { AI_PROVIDERS } from "@/lib/aiConfig";
import type { AIProvider } from "@/lib/aiConfig";
import { useState, useEffect, useRef } from "react";
import { Globe, Trash2, Brain, Key, X, Eye, EyeOff } from "lucide-react";
import { db } from "@/db/database";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

function maskKey(key: string): string {
  if (key.length <= 3) return key;
  return key.slice(0, 3) + "•".repeat(key.length - 3);
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { t } = useI18n();
  const language = useSettingsStore((s) => s.language);
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const setAiProvider = useSettingsStore((s) => s.setAiProvider);
  const saveApiKey = useSettingsStore((s) => s.saveApiKey);
  const deleteApiKey = useSettingsStore((s) => s.deleteApiKey);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
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
    if (!currentKey) {
      setKeyInput("");
    }
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

  const handleReset = async () => {
    await db.delete();
    setResetConfirmOpen(false);
    window.location.reload();
  };

  const providerOptions = AI_PROVIDERS.map((p) => p.label);
  const selectedLabel = AI_PROVIDERS.find((p) => p.value === providerDraft)?.label ?? "None";

  return (
    <>
      <Modal open={open} onClose={onClose} title={t("settings.title")}>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Globe className="size-5 text-primary" />
            <div>
              <p className="font-label-lg text-on-surface">{t("settings.language")}</p>
              <p className="font-body-md text-on-surface-variant mt-1">
                {t("settings.languageDescription")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {(Object.entries(LANGUAGE_LABELS) as [LanguageCode, string][]).map(([code, label]) => (
              <button
                key={code}
                onClick={() => useSettingsStore.getState().setLanguage(code)}
                className={`px-6 py-3 rounded-full font-label-lg transition-all duration-200 border ${
                  language === code
                    ? "bg-primary-container !text-on-primary-container border-primary shadow-md"
                    : "bg-surface-container-high text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-highest hover:text-on-surface"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="border-t border-outline-variant/20 pt-6">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="size-5 text-primary" />
              <div>
                <p className="font-label-lg text-on-surface">{t("settings.aiTranslation")}</p>
              </div>
            </div>
            <div className="space-y-4">
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
              {providerDraft && (
                <>
                  <div className="relative flex items-center gap-2">
                    <div className="relative flex-1">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-on-surface-variant pointer-events-none" />
                      <input
                        ref={keyInputRef}
                        type={showKey ? "text" : "password"}
                        value={
                          keyInput
                            ? keyInput
                            : currentKey
                              ? maskKey(currentKey)
                              : ""
                        }
                        onChange={(e) => setKeyInput(e.target.value)}
                        onFocus={handleFocusKeyInput}
                        placeholder={currentKey ? maskKey(currentKey) : t("settings.aiApiKey")}
                        className="w-full pl-12 pr-12 py-3 rounded-full bg-surface-container-high border border-outline-variant/50 text-on-surface font-body-md placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                      >
                        {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {currentKey && (
                      <button
                        type="button"
                        onClick={handleRemoveKey}
                        className="size-9 rounded-lg bg-error-container/30 hover:bg-error-container text-error hover:text-on-error-container flex items-center justify-center transition-colors shrink-0"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleSaveKey}
                    disabled={!keyInput}
                    className={`px-6 py-2.5 rounded-full font-label-lg transition-all ${
                      saved
                        ? "bg-green-600 text-white"
                        : "bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary disabled:opacity-50"
                    }`}
                  >
                    {saved ? t("settings.aiSaved") : t("settings.aiSave")}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-outline-variant/20 pt-6">
            <div className="flex items-center gap-3 mb-3">
              <Trash2 className="size-5 text-error" />
              <div>
                <p className="font-label-lg text-on-surface">{t("settings.resetDatabase")}</p>
                <p className="font-body-md text-on-surface-variant mt-1">
                  {t("settings.resetDesc")}
                </p>
              </div>
            </div>
            <button
              onClick={() => setResetConfirmOpen(true)}
              className="px-5 py-2.5 rounded-full font-label-lg bg-error-container text-on-error-container hover:bg-error hover:text-on-error transition-all"
            >
              {t("settings.resetAll")}
            </button>
          </div>
        </div>
      </Modal>

      {resetConfirmOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-high rounded-3xl p-6 shadow-2xl border border-outline-variant/20 max-w-sm w-full mx-4">
            <h3 className="font-title-lg text-on-surface mb-2">{t("settings.resetDatabase")}</h3>
            <p className="font-body-md text-on-surface-variant mb-6">{t("settings.resetConfirm")}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="px-5 py-2.5 rounded-full font-label-lg text-on-surface-variant hover:bg-surface-container-highest transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleReset}
                className="px-5 py-2.5 rounded-full font-label-lg bg-error-container text-on-error-container hover:bg-error hover:text-on-error transition-all"
              >
                {t("settings.deleteEverything")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
