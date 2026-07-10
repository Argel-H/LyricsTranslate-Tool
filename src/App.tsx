import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useSettingsStore } from "@/stores/settingsStore";
import { useModalStore } from "@/stores/modalStore";
import { useI18n } from "@/hooks/useI18n";
import { Modal } from "@/features/shell/Modal";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { AllProjectsPage } from "@/features/dashboard/AllProjectsPage";
import { ProjectSetupPage } from "@/features/project-setup/ProjectSetupPage";
import { EditorPage } from "@/features/editor/EditorPage";
import { AnimatedPage } from "@/components/shared/AnimatedPage";
import { SettingsModal } from "@/components/shared/SettingsModal";
import { ChangelogModal } from "@/components/shared/ChangelogModal";
import { APP_NAME, APP_VERSION } from "@/lib/appConfig";

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <div className="relative min-h-screen">
      <AnimatePresence>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<AnimatedPage><DashboardPage /></AnimatedPage>} />
          <Route path="/projects" element={<AnimatedPage><AllProjectsPage /></AnimatedPage>} />
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
  const changelogOpen = useModalStore((s) => s.changelogOpen);
  const closeSettings = useModalStore((s) => s.closeSettings);
  const closeAbout = useModalStore((s) => s.closeAbout);
  const closeChangelog = useModalStore((s) => s.closeChangelog);
  const { t } = useI18n();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <BrowserRouter>
      <AnimatedRoutes />

      <SettingsModal open={settingsOpen} onClose={closeSettings} />

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
          <button
            onClick={() => { closeAbout(); useModalStore.getState().openChangelog(); }}
            className="text-primary hover:underline font-label-md"
          >
            {t("about.viewChangelog")}
          </button>
        </div>
      </Modal>

      <ChangelogModal open={changelogOpen} onClose={closeChangelog} />
    </BrowserRouter>
  );
}

export default App;
