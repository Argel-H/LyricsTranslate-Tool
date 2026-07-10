import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/features/shell/AppShell";
import { MasterCard } from "@/features/shell/MasterCard";
import { SectionCard } from "./SectionCard";
import { RoundedInput } from "./RoundedInput";
import { DropdownSelect } from "./DropdownSelect";
import { Button } from "@/components/ui/button";
import {
  createProject,
  getProject,
  updateProject,
  deleteProject,
} from "@/db/projectRepository";
import { useSettingsStore } from "@/stores/settingsStore";
import { useModalStore } from "@/stores/modalStore";
import { useI18n } from "@/hooks/useI18n";
import {
  Plus,
  ArrowRight,
  Globe,
  User,
  Link,
  Image,
  X,
  Trash2,
  ExternalLink,
} from "lucide-react";
import type { ProjectCreateInput } from "@/types/project";

const LANGUAGES = [
  "English",
  "Spanish",
  "Portuguese",
  "French",
  "German",
  "Italian",
  "Japanese",
  "Korean",
  "Chinese",
  "Arabic",
  "Russian",
  "Hindi",
];

const PLATFORMS = [
  "Spotify",
  "Apple Music",
  "Deezer",
  "YouTube",
  "SoundCloud",
  "Tidal",
  "Amazon Music",
  "Instagram",
  "Twitter/X",
  "TikTok",
  "Facebook",
  "Website",
];

interface SocialEntry {
  artistIndex: number;
  platform: string;
  url: string;
}

export function ProjectSetupPage() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const isEditing = !!editId;
  const { t } = useI18n();

  const settingsLanguage = useSettingsStore((s) => s.language);

  const defaultTranslationLang =
    settingsLanguage === "es"
      ? "Spanish"
      : settingsLanguage === "pt"
        ? "Portuguese"
        : "Spanish";

  const [songName, setSongName] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [artists, setArtists] = useState<string[]>([""]);
  const [coverUrl, setCoverUrl] = useState("");
  const [songLinkUrl, setSongLinkUrl] = useState("");
  const [originLanguage, setOriginLanguage] = useState("English");
  const [translationLanguage, setTranslationLanguage] = useState(
    defaultTranslationLang,
  );
  const [socialEntries, setSocialEntries] = useState<SocialEntry[]>([]);
  const [activeArtistTab, setActiveArtistTab] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const debouncedCoverUrl = useDebounce(coverUrl, 500);

  useEffect(() => {
    if (editId) {
      getProject(Number(editId)).then((project) => {
        if (project) {
          setSongName(project.trackName);
          setArtists(project.artistName.length > 0 ? project.artistName : [""]);
          setCoverUrl(project.coverUrl ?? "");
          setAlbumName(project.albumName ?? "");
          setSongLinkUrl(project.songLinkUrl ?? "");
          const recommended = (project.recommendedSocialLinks ?? []).map(
            (link) => {
              const artistIndex = link.artistName
                ? Math.max(0, project.artistName.indexOf(link.artistName))
                : 0;
              return {
                artistIndex,
                platform: link.platform,
                url: link.url,
              };
            },
          );
          setSocialEntries(recommended);
          setOriginLanguage(project.originLanguage ?? "English");
          setTranslationLanguage(
            project.translationLanguage ?? defaultTranslationLang,
          );
        }
      });
    }
  }, [editId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addArtist = () => setArtists([...artists, ""]);

  const updateArtist = (index: number, value: string) => {
    const next = [...artists];
    next[index] = value;
    setArtists(next);
  };

  const removeArtist = (index: number) => {
    if (artists.length <= 1) return;
    setArtists(artists.filter((_, i) => i !== index));
    setSocialEntries(
      socialEntries
        .filter((e) => e.artistIndex !== index)
        .map((e) => ({
          ...e,
          artistIndex:
            e.artistIndex > index ? e.artistIndex - 1 : e.artistIndex,
        })),
    );
  };

  const addSocialEntry = () => {
    setSocialEntries([
      ...socialEntries,
      { artistIndex: activeArtistTab, platform: "Spotify", url: "" },
    ]);
  };

  const updateSocialEntry = (
    index: number,
    field: keyof SocialEntry,
    value: string | number,
  ) => {
    const next = [...socialEntries];
    next[index] = { ...next[index]!, [field]: value };
    setSocialEntries(next);
  };

  const removeSocialEntry = (index: number) => {
    setSocialEntries(socialEntries.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const validArtists = artists.filter((a) => a.trim());
    if (!songName.trim() || validArtists.length === 0) return;

    const input: ProjectCreateInput = {
      artistName: validArtists,
      trackName: songName.trim(),
      lyrics: {},
      coverUrl: coverUrl.trim() || undefined,
      originLanguage,
      translationLanguage,
      albumName: albumName.trim() || undefined,
      songLinkUrl: songLinkUrl.trim() || undefined,
    };

    if (isEditing) {
      await updateProject(Number(editId), {
        title: `${validArtists[0]} - ${songName.trim()}`,
        artistName: validArtists,
        trackName: songName.trim(),
        coverUrl: input.coverUrl,
        originLanguage,
        translationLanguage,
        albumName: input.albumName,
        songLinkUrl: input.songLinkUrl,
        recommendedSocialLinks:
          socialEntries.length > 0
            ? socialEntries.map((e) => ({
                platform: e.platform,
                url: e.url,
                artistName: artists[e.artistIndex],
              }))
            : undefined,
      });
      navigate(`/editor/${editId}`);
    } else {
      const id = await createProject(input);
      navigate(`/editor/${id}`);
    }
  };

  return (
    <AppShell
      title={isEditing ? t("setup.editTitle") : t("setup.title")}
      onBack={() => navigate(-1)}
      sidebarBg="bg-surface-container-lowest"
      topbarBg="bg-surface-container-lowest"
      bodyBg="bg-surface-container-lowest"
      showTopbarBorder={false}
      onOpenSettings={() => useModalStore.getState().openSettings()}
      onOpenAbout={() => useModalStore.getState().openAbout()}
      actions={
        <div className="flex items-center gap-3">
          {isEditing && (
            <button
              onClick={() => setDeleteOpen(true)}
              className="p-2 rounded-full hover:bg-surface-container-highest text-on-surface-variant hover:text-error transition-colors"
              title={t("setup.deleteProjectTitle")}
            >
              <Trash2 className="size-5" />
            </button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!songName.trim() || !artists[0]?.trim()}
            className="bg-primary-container !text-on-primary-container font-label-lg text-label-lg px-6 h-12 rounded-full hover:bg-primary hover:text-on-primary transition-all flex items-center gap-2 disabled:opacity-50 shadow-md"
          >
            {isEditing ? t("common.save") : t("setup.next")}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      }
    >
      <MasterCard bgColor="bg-[#141317]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter max-w-7xl mx-auto">
          {/* Left Column */}
          <div className="lg:col-span-4 flex flex-col gap-lg">
            <SectionCard title={t("setup.trackDetails")}>
              <RoundedInput
                label={t("setup.songName")}
                value={songName}
                onChange={setSongName}
              />
              <RoundedInput
                label={t("setup.albumName")}
                value={albumName}
                onChange={setAlbumName}
              />
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
                {/*<Button
                  variant="secondary"
                  className="bg-primary-container !text-on-primary-container font-label-lg text-label-lg py-3 px-6 rounded-full hover:shadow-md transition-all h-[52px]"
                >
                  {t("setup.verify")}
                </Button>*/}
              </div>
              <div className="w-full aspect-square bg-surface-container-highest rounded-3xl flex items-center justify-center mt-2 relative overflow-hidden border border-outline-variant/30">
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
          </div>

          {/* Right Column */}
          <div className="lg:col-span-8 flex flex-col gap-lg">
            <SectionCard title={t("setup.localization")}>
              <div className="flex flex-wrap items-center gap-md">
                <DropdownSelect
                  icon={Globe}
                  label={t("setup.originLanguage")}
                  value={originLanguage}
                  options={LANGUAGES}
                  onChange={setOriginLanguage}
                  className="!rounded-tr-md"
                />
                <span className="font-body-lg text-on-surface-variant mx-2">
                  {t("setup.to")}
                </span>
                <DropdownSelect
                  icon={Globe}
                  label={t("setup.translationLanguage")}
                  value={translationLanguage}
                  options={LANGUAGES}
                  onChange={setTranslationLanguage}
                  className="!rounded-bl-md"
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
                          icon={Link}
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

      {deleteOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-high rounded-3xl p-6 shadow-2xl border border-outline-variant/20 max-w-sm w-full mx-4">
            <h3 className="font-title-lg text-on-surface mb-2">
              {t("setup.deleteProject")}
            </h3>
            <p className="font-body-md text-on-surface-variant mb-6">
              {t("setup.deleteConfirm")}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteOpen(false)}
                className="px-5 py-2.5 rounded-full font-label-lg text-on-surface-variant hover:bg-surface-container-highest transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={async () => {
                  if (editId) {
                    await deleteProject(Number(editId));
                    navigate("/");
                  }
                }}
                className="px-5 py-2.5 rounded-full font-label-lg bg-error-container text-on-error-container hover:bg-error hover:text-on-error transition-all"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
