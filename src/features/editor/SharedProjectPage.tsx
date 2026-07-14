import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";
import { createProject } from "@/db/projectRepository";
import { M3LoadingIndicator } from "@alerix/m3-loading-indicator/react";
import { useSharedProjectLoader } from "@/hooks/useSharedProjectLoader";
import { LanguageLabel } from "@/components/shared/LanguageLabel";

/**
 * SharedProjectPage – Decodes a share link and shows a preview card.
 *
 * The user must explicitly click "Import Project" to create a local copy
 * or "View Only" to inspect the lyrics in read-only mode. No auto-import.
 */
export function SharedProjectPage() {
  const { data } = useParams<{ data: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { status, project: projectInput, errorKey } = useSharedProjectLoader(data);
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    if (!projectInput) return;
    setImporting(true);
    try {
      const id = await createProject(projectInput);
      navigate(`/editor/${id}`, { replace: true });
    } catch {
      setImporting(false);
    }
  }

  function handleViewOnly() {
    if (!data) return;
    navigate(`/view/${data}`, { replace: true });
  }

  // ── Loading ──
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#141317] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center">
            <M3LoadingIndicator size={40} style={{ color: "rgb(208, 188, 255)" }} />
          </div>
          <span className="font-body-lg text-on-surface-variant">
            {t("share.decoding")}
          </span>
        </div>
      </div>
    );
  }

  // ── Preview card ──
  if (status === "ready" && projectInput) {
    const { trackName, artistName, lyrics, originLanguage, translationLanguage, coverUrl } = projectInput;
    const lyricsCount = Object.keys(lyrics || {}).length;
    const artistStr = (artistName || []).join(", ");

    return (
      <div className="min-h-screen bg-[#141317] flex items-center justify-center p-6">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="bg-surface-container-low rounded-[24px] p-8 flex flex-col items-center gap-4">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={trackName}
                className="w-24 h-24 rounded-2xl object-cover shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-primary-container flex items-center justify-center shadow-lg">
                <span className="text-on-primary-container text-3xl">🎵</span>
              </div>
            )}

            <h2 className="font-headline-sm text-on-surface text-center">{trackName}</h2>

            {artistStr && (
              <p className="font-body-md text-on-surface-variant -mt-2">{artistStr}</p>
            )}

            <div className="flex gap-4 text-center">
              {originLanguage && translationLanguage && (
                <div className="bg-surface-container-high rounded-full px-4 py-1.5">
                  <span className="font-label-md text-on-surface-variant flex items-center gap-1.5">
                    <LanguageLabel language={originLanguage} />
                    <span className="mx-0.5">→</span>
                    <LanguageLabel language={translationLanguage} />
                  </span>
                </div>
              )}
              <div className="bg-surface-container-high rounded-full px-4 py-1.5">
                <span className="font-label-md text-on-surface-variant">
                  {lyricsCount} {t("share.lines")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleImport}
              disabled={importing}
              className="w-full py-4 bg-primary-container text-on-primary-container rounded-full font-label-lg text-base
                         hover:bg-primary hover:text-on-primary transition-all
                         disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
            >
              {importing && <M3LoadingIndicator size={18} />}
              {importing ? t("share.importing") : t("share.importProject")}
            </button>
            <button
              onClick={handleViewOnly}
              className="w-full py-4 bg-surface-container-high text-on-surface-variant rounded-full font-label-lg text-base
                         hover:bg-surface-container-highest transition-all"
            >
              {t("share.viewOnly")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  const errorMsg = errorKey ? t(errorKey) : t("share.missing");
  return (
    <div className="min-h-screen bg-[#141317] flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center">
          <span className="text-error text-2xl">!</span>
        </div>
        <p className="font-title-md text-on-surface">{errorMsg}</p>
        <button
          onClick={() => navigate("/", { replace: true })}
          className="px-6 py-3 bg-primary-container text-on-primary-container rounded-full font-label-lg hover:bg-primary hover:text-on-primary transition-all mt-2"
        >
          {t("editor.backToDashboard")}
        </button>
      </div>
    </div>
  );
}
