import { AppShell } from "@/features/shell/AppShell";
import { MasterCard } from "@/features/shell/MasterCard";
import { useSettingsStore } from "@/stores/settingsStore";
import { useI18n } from "@/hooks/useI18n";
import { Globe } from "lucide-react";

export function SettingsPage() {
  const { language, setLanguage } = useSettingsStore();
  const { t } = useI18n();

  const languages: Array<{ value: "en" | "es" | "pt"; label: string }> = [
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
    { value: "pt", label: "Português" },
  ];

  return (
    <AppShell
      title={t("settings.title")}
      activePage="settings"
      onBack={() => window.history.back()}
      sidebarBg="bg-surface-container-lowest"
      topbarBg="bg-surface-container-lowest"
      bodyBg="bg-surface-container-lowest"
      showTopbarBorder={false}
    >
      <MasterCard bgColor="bg-[#141317]">
        <div className="max-w-2xl mx-auto space-y-8">
          <section className="bg-surface-container p-8 rounded-section border border-outline-variant/10 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="size-6 text-primary" />
              <div>
                <h2 className="font-title-lg text-title-lg text-on-surface">
                  {t("settings.language")}
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  {t("settings.languageDescription")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {languages.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => setLanguage(lang.value)}
                  className={`px-6 py-3 rounded-full font-label-lg text-label-lg transition-all duration-200 border ${
                    language === lang.value
                      ? "bg-primary-container !text-on-primary-container border-primary shadow-md"
                      : "bg-surface-container-high text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-highest hover:text-on-surface"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </MasterCard>
    </AppShell>
  );
}
