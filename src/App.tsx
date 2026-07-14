import { useEffect } from "react";
import type { ReactNode } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useSettingsStore } from "@/stores/settingsStore";
import { useModalStore } from "@/stores/modalStore";
import { useI18n } from "@/hooks/useI18n";
import { Modal } from "@/features/shell/Modal";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { AllProjectsPage } from "@/features/dashboard/AllProjectsPage";
import { ProjectSetupPage } from "@/features/project-setup/ProjectSetupPage";
import { EditorPage } from "@/features/editor/EditorPage";
import { SharedProjectPage } from "@/features/editor/SharedProjectPage";
import { ViewOnlyPage } from "@/features/editor/ViewOnlyPage";
import { SettingsModal } from "@/components/shared/SettingsModal";
import { ChangelogModal } from "@/components/shared/ChangelogModal";
import { APP_NAME, APP_VERSION } from "@/lib/config/appConfig";
import { migrateLyricTimestamps, normalizeLegacyStatuses } from "@/db/migration";
import { useShellStore } from "@/stores/shellStore";
import { AppShell } from "@/features/shell/AppShell";

function AnimatedContent({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] } }}
      exit={{ opacity: 0, transition: { duration: 0.12, ease: "easeIn" } }}
    >
      {children}
    </motion.div>
  );
}

function AppShellWrapper() {
  const location = useLocation();
  const config = useShellStore((s) => s.config);

  return (
    <AppShell
      title={config.title}
      activePage={config.activePage}
      variant={config.variant}
      onBack={config.onBack}
      onOpenSettings={config.onOpenSettings}
      onOpenAbout={config.onOpenAbout}
      actions={config.actions}
      leading={config.leading}
      sidebarBg={config.sidebarBg}
      topbarBg={config.topbarBg}
      showTopbar={config.showTopbar}
      showTopbarBorder={config.showTopbarBorder}
      bodyBg={config.bodyBg}
      bottomBar={config.bottomBar}
    >
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<AnimatedContent><DashboardPage /></AnimatedContent>} />
          <Route path="/projects" element={<AnimatedContent><AllProjectsPage /></AnimatedContent>} />
          <Route path="/new-project" element={<AnimatedContent><ProjectSetupPage /></AnimatedContent>} />
          <Route path="/edit-project/:id" element={<AnimatedContent><ProjectSetupPage /></AnimatedContent>} />
          <Route path="/editor/:id" element={<AnimatedContent><EditorPage /></AnimatedContent>} />
        </Routes>
      </AnimatePresence>
    </AppShell>
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

  useEffect(() => {
    migrateLyricTimestamps().catch(console.error);
    normalizeLegacyStatuses().catch(console.error);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/s/:data" element={<SharedProjectPage />} />
        <Route path="/view/:data" element={<ViewOnlyPage />} />
        <Route path="*" element={<AppShellWrapper />} />
      </Routes>

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
