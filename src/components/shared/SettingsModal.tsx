import { useState } from "react";
import { Modal } from "@/features/shell/Modal";
import { useI18n } from "@/hooks/useI18n";
import { Settings, Brain } from "lucide-react";
import { db } from "@/db/database";
import { GeneralTab } from "./GeneralTab";
import { AITab } from "./AITab";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"general" | "ai">("general");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleReset = async () => {
    await db.delete();
    setResetConfirmOpen(false);
    window.location.reload();
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={t("settings.title")} className="w-[60vw] max-w-4xl h-[80vh]">
        <div className="flex gap-0 min-h-[400px]">
          {/* Sidebar */}
          <div className="w-52 shrink-0 border-r border-outline-variant/10 pr-3 flex flex-col gap-1">
            <button
              onClick={() => setActiveTab("general")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors ${
                activeTab === "general"
                  ? "bg-secondary-container text-on-secondary-container"
                  : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
              }`}
            >
              <Settings className="size-5 shrink-0" />
              <span className="font-label-lg">{t("settings.tabGeneral")}</span>
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors ${
                activeTab === "ai"
                  ? "bg-secondary-container text-on-secondary-container"
                  : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
              }`}
            >
              <Brain className="size-5 shrink-0" />
              <span className="font-label-lg">{t("settings.tabAI")}</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 pl-4 overflow-y-auto pb-8">
            {activeTab === "general" && (
              <GeneralTab onResetRequest={() => setResetConfirmOpen(true)} />
            )}
            {activeTab === "ai" && (
              <AITab open={open} />
            )}
          </div>
        </div>
      </Modal>

      {resetConfirmOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-high rounded-3xl p-6 shadow-2xl border border-outline-variant/20 max-w-sm w-full mx-4">
            <h3 className="font-title-lg text-on-surface mb-2">{t("settings.resetDatabase")}</h3>
            <p className="font-body-md text-on-surface-variant mb-6">{t("settings.resetConfirm")}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setResetConfirmOpen(false)} className="px-5 py-2.5 rounded-full font-label-lg text-on-surface-variant hover:bg-surface-container-highest transition-colors">
                {t("common.cancel")}
              </button>
              <button onClick={handleReset} className="px-5 py-2.5 rounded-full font-label-lg bg-error-container text-on-error-container hover:bg-error hover:text-on-error transition-all">
                {t("settings.deleteEverything")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
