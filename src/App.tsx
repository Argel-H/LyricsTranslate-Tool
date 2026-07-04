import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useSettingsStore } from "@/stores/settingsStore";
import { useModalStore } from "@/stores/modalStore";
import { useI18n } from "@/hooks/useI18n";
import { Modal } from "@/features/shell/Modal";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ProjectSetupPage } from "@/features/project-setup/ProjectSetupPage";
import { EditorPage } from "@/features/editor/EditorPage";
import { AnimatedPage } from "@/components/shared/AnimatedPage";
import { db } from "@/db/database";
import { Globe, Trash2 } from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/appConfig";
import type { LanguageCode } from "@/lib/constants";

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <div className="relative min-h-screen">
    <AnimatePresence>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AnimatedPage><DashboardPage /></AnimatedPage>} />
        <Route path="/new-project" element={<AnimatedPage><ProjectSetupPage /></AnimatedPage>} />
        <Route path="/edit-project/:id" element={<AnimatedPage><ProjectSetupPage /></AnimatedPage>} />
        <Route path="/editor/:id" element={<AnimatedPage><EditorPage /></AnimatedPage>} />
      </Routes>
    </AnimatePresence>
    </div>
  );
}

function App() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const settingsOpen = useModalStore((s) => s.settingsOpen);
  const aboutOpen = useModalStore((s) => s.aboutOpen);
  const closeSettings = useModalStore((s) => s.closeSettings);
  const closeAbout = useModalStore((s) => s.closeAbout);
  const language = useSettingsStore((s) => s.language);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <BrowserRouter>
      <AnimatedRoutes />

      <Modal
        open={settingsOpen}
        onClose={closeSettings}
        title={t("settings.title")}
      >
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
            {[
              ["en", "English"],
              ["es", "Español"],
              ["pt", "Português"],
            ].map(([code, label]) => (
              <button
                key={code}
                onClick={() => useSettingsStore.getState().setLanguage(code as LanguageCode)}
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

          <div className="border-t border-outline-variant/20 pt-6 mt-6">
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

      <Modal open={aboutOpen} onClose={closeAbout} title={`${t("about.title")} ${APP_NAME}`}>
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-on-primary font-headline-sm font-bold text-2xl shadow-md mx-auto">
            L
          </div>
          <p className="font-body-lg text-on-surface-variant">{t("about.description")}</p>
          <p className="font-label-md text-on-surface-variant">
            {t("about.version")} {APP_VERSION}
          </p>
          <p className="font-body-md text-on-surface-variant pt-2">{t("about.madeWith")}</p>
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
                onClick={async () => {
                  await db.delete();
                  setResetConfirmOpen(false);
                  window.location.reload();
                }}
                className="px-5 py-2.5 rounded-full font-label-lg bg-error-container text-on-error-container hover:bg-error hover:text-on-error transition-all"
              >
                {t("settings.deleteEverything")}
              </button>
            </div>
          </div>
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;
