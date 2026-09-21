import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { MasterCard } from "@/features/shell/MasterCard";
import { SectionCard } from "./SectionCard";
import { RoundedInput } from "./RoundedInput";
import { DropdownSelect } from "./DropdownSelect";
import { Button } from "@/components/ui/button";
import { deleteProject } from "@/db/projectRepository";
import { useModalStore } from "@/stores/modalStore";
import { useI18n } from "@/hooks/useI18n";
import {
  Plus,
  ArrowRight,
  User,
  Image,
  X,
  Trash2,
  ExternalLink,
  Upload,
  AlertCircle,
  CheckCircle2,
  Search,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { getPlatformIcon, PLATFORMS, WALLPAPER_SOURCES } from "@/lib/platformIcons";
import { LANGUAGE_LABELS } from "@/lib/languageFlags";
import {
  makeRotatingFlagIcon,
  makeRotatingLanguageOptions,
} from "@/components/shared/RotatingFlag";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ProjectDetailsModal } from "@/components/shared/ProjectDetailsModal";
import { M3LoadingIndicator } from "@alerix/m3-loading-indicator/react";
import { useCoverTilt } from "@/hooks/useCoverTilt";
import { usePageShell } from "@/hooks/usePageShell";
import { useShellStore } from "@/stores/shellStore";
import { useProjectSetupForm } from "@/hooks/useProjectSetupForm";

const ROTATING_LANGUAGE_OPTIONS = makeRotatingLanguageOptions(LANGUAGE_LABELS);

export function ProjectSetupPage() {
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const { id: editId } = useParams<{ id?: string }>();
  const isEditing = !!editId;
  const { t } = useI18n();

  const {
    songName,
    setSongName,
    albumName,
    setAlbumName,
    artists,
    updateArtist,
    removeArtist,
    addArtist,
    coverUrl,
    setCoverUrl,
    songLinkUrl,
    setSongLinkUrl,
    originLanguage,
    setOriginLanguage,
    translationLanguage,
    setTranslationLanguage,
    socialEntries,
    updateSocialEntry,
    removeSocialEntry,
    addSocialEntry,
    wallpaperArtistName,
    setWallpaperArtistName,
    wallpaperSource,
    setWallpaperSource,
    wallpaperUrl,
    setWallpaperUrl,
    activeArtistTab,
    setActiveArtistTab,
    lyricsText,
    setLyricsText,
    lyricsValidation,
    setLyricsValidation,
    lyricsFileName,
    setLyricsFileName,
    debouncedCoverUrl,
    handleFileUpload,
    lookupLoading,
    lookupResult,
    lookupError,
    setLookupError,
    setLookupResult,
    handleLookup,
    applyLookup,
    submit,
  } = useProjectSetupForm({ editId });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tilt: coverTilt, handlers: { onMouseMove: handleCoverMouseMove, onMouseLeave: handleCoverMouseLeave } } = useCoverTilt();

  const rotatingOriginIcon = useMemo(
    () => makeRotatingFlagIcon(originLanguage),
    [originLanguage],
  );
  const rotatingTranslationIcon = useMemo(
    () => makeRotatingFlagIcon(translationLanguage),
    [translationLanguage],
  );

  const latestRef = useRef({ submit, songName, artists, setDeleteOpen });
  latestRef.current = { submit, songName, artists, setDeleteOpen };

  usePageShell({
    title: isEditing ? t("setup.editTitle") : t("setup.title"),
    onBack: () => smartBack(),
    sidebarBg: "bg-surface-container-lowest",
    topbarBg: "bg-surface-container-lowest",
    bodyBg: "bg-surface-container-lowest",
    showTopbarBorder: false,
    onOpenSettings: () => useModalStore.getState().openSettings(),
    onOpenAbout: () => useModalStore.getState().openAbout(),
  });

  useEffect(() => {
    useShellStore.getState().setConfig({
      actions: (
        <div className="flex items-center gap-3">
          {isEditing && (
            <button
              onClick={() => latestRef.current.setDeleteOpen(true)}
              className="p-2 rounded-full hover:bg-surface-container-highest text-on-surface-variant hover:text-error transition-colors"
              title={t("setup.deleteProjectTitle")}
            >
              <Trash2 className="size-5" />
            </button>
          )}
          <Button
            onClick={() => latestRef.current.submit()}
            disabled={!latestRef.current.songName.trim() || !latestRef.current.artists[0]?.trim()}
            className="bg-primary-container !text-on-primary-container font-label-lg text-label-lg px-6 h-12 rounded-full hover:bg-primary hover:text-on-primary transition-all flex items-center gap-2 disabled:opacity-50 shadow-md"
          >
            {isEditing ? t("common.save") : t("setup.next")}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      ),
    });
  }, [isEditing, t, songName, artists]);

  return (
    <>
      <MasterCard bgColor="bg-[#141317]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter max-w-7xl mx-auto">
          {/* Left Column */}
          <div className="lg:col-span-4 flex flex-col gap-lg">
            <SectionCard title={t("setup.trackDetails")}>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <RoundedInput
                    label={t("setup.songName")}
                    value={songName}
                    onChange={setSongName}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && songName.trim() && !lookupLoading) {
                        handleLookup();
                      }
                    }}
                  />
                </div>
                {!isEditing && (
                  <Button
                    variant="secondary"
                    onClick={handleLookup}
                    disabled={!songName.trim() || lookupLoading}
                    className={`font-label-lg text-label-lg py-3 px-3 rounded-sm flex items-center justify-center gap-2 transition-all h-12 aspect-square shrink-0 ${lookupLoading ? "bg-tertiary-container text-on-surface-variant" : "bg-tertiary-container text-on-tertiary-container hover:bg-tertiary-container/80"}`}
                  >
                    {lookupLoading ? (
                      <M3LoadingIndicator size={18} />
                    ) : (
                      <Search className="size-4" />
                    )}
                  </Button>
                )}
              </div>
              <RoundedInput
                label={t("setup.albumName")}
                value={albumName}
                onChange={setAlbumName}
              />
              {lookupError && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                  <AlertCircle className="size-4 shrink-0" />
                  <span className="font-body-sm">{lookupError}</span>
                  <button
                    onClick={() => setLookupError(null)}
                    className="ml-auto text-red-500 hover:text-red-700"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}
            </SectionCard>

            <SectionCard title={t("setup.artists")}>
              {artists.map((artist, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <div className="flex-1">
                    <RoundedInput
                      label={
                        i === 0
                          ? t("setup.mainArtist")
                          : t("setup.artistNumber").replace("%d", String(i + 1))
                      }
                      value={artist}
                      onChange={(v) => updateArtist(i, v)}
                    />
                  </div>
                  {artists.length > 1 && (
                    <button
                      onClick={() => removeArtist(i)}
                      className="p-2 rounded-full hover:bg-surface-container-highest text-on-surface-variant shrink-0"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              <Button
                variant="secondary"
                onClick={addArtist}
                className="bg-secondary-container text-on-secondary-container font-label-lg text-label-lg py-2 px-6 rounded-full flex items-center justify-center gap-2 self-center hover:bg-secondary-container/80 mt-2 transition-all h-auto"
              >
                <Plus className="size-4" />
                {t("setup.addArtist")}
              </Button>
            </SectionCard>

            <SectionCard title={t("setup.coverArt")}>
              <div className="flex gap-md items-end">
                <RoundedInput
                  label={t("setup.imageUrl")}
                  value={coverUrl}
                  onChange={setCoverUrl}
                  className="flex-grow"
                />
              </div>
              <div
                className="w-full aspect-square bg-surface-container-highest rounded-3xl flex items-center justify-center mt-2 relative overflow-hidden border border-outline-variant/30"
                onMouseMove={handleCoverMouseMove}
                onMouseLeave={handleCoverMouseLeave}
                style={{
                  transform: `perspective(700px) rotateX(${coverTilt.x}deg) rotateY(${coverTilt.y}deg)`,
                  transition:
                    coverTilt.x === 0 && coverTilt.y === 0
                      ? "transform 0.6s ease"
                      : "none",
                }}
              >
                {debouncedCoverUrl ? (
                  <img
                    src={debouncedCoverUrl}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <Image className="size-[120px]" />
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard title={t("setup.wallpaper")}>
              <RoundedInput
                label={t("setup.wallpaperArtistName")}
                value={wallpaperArtistName}
                onChange={setWallpaperArtistName}
              />
              <DropdownSelect
                icon={Image}
                label={t("setup.wallpaperSource")}
                value={wallpaperSource}
                options={WALLPAPER_SOURCES}
                onChange={setWallpaperSource}
                variant="compact"
                editable
                placeholder={t("setup.wallpaperSourcePlaceholder")}
              />
              <RoundedInput
                label={t("setup.wallpaperUrl")}
                value={wallpaperUrl}
                onChange={setWallpaperUrl}
              />
              {wallpaperUrl && (
                <a
                  href={wallpaperUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline font-label-md mt-2"
                >
                  <ExternalLink className="size-4" />
                  {t("setup.openLink")}
                </a>
              )}
            </SectionCard>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-8 flex flex-col gap-lg">
            {!isEditing && (
              <SectionCard title={t("setup.importLyrics")} gap="lg">
                <div className="flex flex-col gap-md">
                  <Textarea
                    placeholder={t("setup.pasteLyrics")}
                    value={lyricsText}
                    onChange={(e) => setLyricsText(e.target.value)}
                    className="min-h-[180px] font-mono text-sm resize-y"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-secondary-container text-on-secondary-container font-label-lg text-label-lg py-2 px-4 rounded-full hover:bg-secondary-container/80 transition-all h-auto flex items-center gap-2"
                      >
                        <Upload className="size-4" />
                        {t("setup.chooseFile")}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".lrc,.srt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      {lyricsFileName && (
                        <span className="font-body-sm text-on-surface-variant truncate max-w-[200px]">
                          {lyricsFileName}
                        </span>
                      )}
                    </div>
                    {lyricsText && (
                      <button
                        onClick={() => {
                          setLyricsText("");
                          setLyricsFileName(null);
                          setLyricsValidation(null);
                        }}
                        className="text-on-surface-variant hover:text-error font-label-md transition-colors"
                      >
                        {t("setup.clearLyrics")}
                      </button>
                    )}
                  </div>

                  {lyricsValidation && (
                    <div
                      className={`flex items-center gap-2 p-3 rounded-2xl ${
                        lyricsValidation.valid
                          ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                          : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                      }`}
                    >
                      {lyricsValidation.valid ? (
                        <CheckCircle2 className="size-4 shrink-0" />
                      ) : (
                        <AlertCircle className="size-4 shrink-0" />
                      )}
                      <span className="font-body-sm">
                        {lyricsValidation.valid
                          ? t("setup.lyricsValid")
                              .replace("{format}", lyricsValidation.format.toUpperCase())
                              .replace("{count}", String(lyricsValidation.lineCount))
                              .replace(
                                "{sync}",
                                lyricsValidation.isSynced
                                  ? t("setup.lyricsSynced")
                                  : t("setup.lyricsUnsynced")
                              )
                          : t("setup.lyricsInvalid").replace("{error}", lyricsValidation.error ?? "")}
                      </span>
                    </div>
                  )}

                  {!lyricsText && (
                    <p className="font-body-sm text-on-surface-variant/60">
                      {t("setup.emptyLyricsNote")}
                    </p>
                  )}
                </div>
              </SectionCard>
            )}
            <SectionCard title={t("setup.localization")}>
              <div className="flex flex-wrap items-center gap-md">
                <DropdownSelect
                  icon={rotatingOriginIcon}
                  label={t("setup.originLanguage")}
                  value={originLanguage}
                  options={ROTATING_LANGUAGE_OPTIONS}
                  onChange={setOriginLanguage}
                  className="!rounded-tr-md"
                />
                <span className="font-body-lg text-on-surface-variant mx-2">
                  {t("setup.to")}
                </span>
                <DropdownSelect
                  icon={rotatingTranslationIcon}
                  label={t("setup.translationLanguage")}
                  value={translationLanguage}
                  options={ROTATING_LANGUAGE_OPTIONS}
                  onChange={setTranslationLanguage}
                  className="rounded-bl-md"
                />
              </div>
            </SectionCard>

            <SectionCard title={t("setup.sharedLink")}>
              <RoundedInput
                label={t("setup.linkUrl")}
                value={songLinkUrl}
                onChange={setSongLinkUrl}
              />
              {songLinkUrl && (
                <a
                  href={songLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline font-label-md mt-2"
                >
                  <ExternalLink className="size-4" />
                  {t("setup.openLink")}
                </a>
              )}
            </SectionCard>

            <SectionCard title={t("setup.socialMedia")} gap="lg">
              {artists.filter((a) => a.trim()).length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {artists
                    .filter((a) => a.trim())
                    .map((artist, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveArtistTab(i)}
                        className={`px-4 py-2 rounded-full font-label-md transition-colors ${
                          activeArtistTab === i
                            ? "bg-primary-container text-on-primary-container"
                            : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high"
                        }`}
                      >
                        {artist}
                      </button>
                    ))}
                </div>
              )}
              {socialEntries.filter((e) => e.artistIndex === activeArtistTab)
                .length === 0 && (
                <p className="text-on-surface-variant font-body-md text-center py-4">
                  {t("setup.noSocialLinks")}
                </p>
              )}
              {socialEntries
                .filter((e) => e.artistIndex === activeArtistTab)
                .map((entry, i) => {
                  const globalIndex = socialEntries.indexOf(entry);
                  const artistOptions = artists
                    .filter((a) => a.trim())
                    .map((a) => a.trim());
                  return (
                    <div
                      key={i}
                      className="flex flex-col gap-sm p-lg bg-surface-container-low rounded-3xl border border-outline-variant/30"
                    >
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-md items-center">
                        <DropdownSelect
                          icon={User}
                          label={t("setup.artist")}
                          value={
                            artistOptions[entry.artistIndex] ??
                            t("setup.selectArtist")
                          }
                          options={
                            artistOptions.length > 0
                              ? artistOptions
                              : [t("setup.noArtists")]
                          }
                          onChange={(v) => {
                            const idx = artistOptions.indexOf(v);
                            if (idx >= 0)
                              updateSocialEntry(
                                globalIndex,
                                "artistIndex",
                                idx,
                              );
                          }}
                          variant="compact"
                        />
                        <DropdownSelect
                          icon={getPlatformIcon(entry.platform)}
                          label={t("setup.platform")}
                          value={entry.platform}
                          options={PLATFORMS}
                          onChange={(v) =>
                            updateSocialEntry(globalIndex, "platform", v)
                          }
                          variant="compact"
                        />
                        <button
                          onClick={() => removeSocialEntry(globalIndex)}
                          className="size-9 rounded-lg bg-error-container/30 hover:bg-error-container text-error hover:text-on-error-container flex items-center justify-center transition-colors"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <RoundedInput
                            label={t("setup.url")}
                            value={entry.url}
                            onChange={(v) =>
                              updateSocialEntry(globalIndex, "url", v)
                            }
                            className="mt-2"
                          />
                        </div>
                        {entry.url.trim() && (
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="size-9 rounded-sm bg-primary-container/30 hover:bg-primary-container text-primary hover:text-on-primary-container flex items-center justify-center transition-colors shrink-0 mt-2"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              <Button
                variant="secondary"
                onClick={addSocialEntry}
                className="bg-primary-container !text-on-primary-container font-label-lg text-label-lg py-3 px-8 rounded-sm flex items-center justify-center gap-2 self-center hover:bg-primary hover:text-on-primary transition-all mt-4 h-auto"
              >
                <Plus className="size-4" />
                {t("setup.addNewLink")}
              </Button>
            </SectionCard>
          </div>
        </div>
      </MasterCard>

      {lookupResult && (
        <ProjectDetailsModal
          project={lookupResult.metadata}
          title={t("setup.lookupFound")}
          lookupExtras={{
            rawLyrics: lookupResult.rawLyrics,
            lrcResult: lookupResult.lrcResult,
            typedArtistCount: artists.filter((a) => a.trim()).length,
          }}
          onApply={applyLookup}
          onDismiss={() => setLookupResult(null)}
          onClose={() => setLookupResult(null)}
        />
      )}

      <ConfirmDialog
        open={deleteOpen}
        title={t("setup.deleteProject")}
        description={t("setup.deleteConfirm")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={async () => {
          if (editId) {
            await deleteProject(Number(editId));
            navigate("/");
          }
        }}
        onCancel={() => setDeleteOpen(false)}
        destructive
      />
    </>
  );
}
