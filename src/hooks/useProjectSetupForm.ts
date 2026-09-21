import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import {
  createProject,
  getProject,
  updateProject,
} from "@/db/projectRepository";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  validateAndParseLyrics,
  type ValidationResult,
} from "@/lib/lyricsUploadValidator";
import { toLyricLineMap } from "@/lib/lyricsParser";
import { parseArtistTitle } from "@/lib/artistTitleParser";
import { searchLrcLib, pickBestLrcResult } from "@/services/lrclib";
import { getFullMetadata } from "@/services/metadataAggregator";
import type { LRCLibResult } from "@/types/music";
import type { ProjectCreateInput } from "@/types/project";

export interface SocialEntry {
  artistIndex: number;
  platform: string;
  url: string;
}

// Held in a ref so it is folded into the created project without appearing in
// the editable form.
export interface DiscoveredMeta {
  isrcs?: string;
  streamingSites?: Record<string, string | null>;
  artistLinks?: Array<{ name: string; url: string }>;
}

// Plain object so the mapping can be unit-tested without React.
export interface ProjectFormState {
  songName: string;
  artists: string[];
  coverUrl: string;
  originLanguage: string;
  translationLanguage: string;
  albumName: string;
  songLinkUrl: string;
  wallpaperArtistName: string;
  wallpaperSource: string;
  wallpaperUrl: string;
  lyricsValidation: ValidationResult | null;
  socialEntries: SocialEntry[];
}

export function buildProjectInput(
  state: ProjectFormState,
  discovered: DiscoveredMeta,
): ProjectCreateInput {
  const validArtists = state.artists.filter((a) => a.trim());

  return {
    artistName: validArtists,
    trackName: state.songName.trim(),
    lyrics:
      state.lyricsValidation?.valid && state.lyricsValidation?.lines
        ? Object.fromEntries(toLyricLineMap(state.lyricsValidation.lines))
        : {},
    coverUrl: state.coverUrl.trim() || undefined,
    originLanguage: state.originLanguage,
    translationLanguage: state.translationLanguage,
    albumName: state.albumName.trim() || undefined,
    songLinkUrl: state.songLinkUrl.trim() || undefined,
    wallpaperArtistName: state.wallpaperArtistName.trim() || undefined,
    wallpaperSource: state.wallpaperSource.trim() || undefined,
    wallpaperUrl: state.wallpaperUrl.trim() || undefined,
    isrcs: discovered.isrcs,
    streamingSites: discovered.streamingSites,
    artistLinks: discovered.artistLinks,
    recommendedSocialLinks:
      state.socialEntries.length > 0
        ? state.socialEntries.map((e) => ({
            platform: e.platform,
            url: e.url,
            artistName: state.artists[e.artistIndex],
          }))
        : undefined,
  };
}

interface LookupResult {
  metadata: ProjectCreateInput;
  rawLyrics: string;
  lrcResult: LRCLibResult | undefined;
}

export interface UseProjectSetupFormArgs {
  editId?: string;
}

export function useProjectSetupForm({ editId }: UseProjectSetupFormArgs) {
  const navigate = useNavigate();
  const isEditing = !!editId;

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
  const [wallpaperArtistName, setWallpaperArtistName] = useState("");
  const [wallpaperSource, setWallpaperSource] = useState("");
  const [wallpaperUrl, setWallpaperUrl] = useState("");
  const [activeArtistTab, setActiveArtistTab] = useState(0);
  const debouncedCoverUrl = useDebounce(coverUrl, 500);
  const [lyricsText, setLyricsText] = useState("");
  const [lyricsValidation, setLyricsValidation] = useState<ValidationResult | null>(null);
  const [lyricsFileName, setLyricsFileName] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const discoveredMetaRef = useRef<DiscoveredMeta>({});

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
          setWallpaperArtistName(project.wallpaperArtistName ?? "");
          setWallpaperSource(project.wallpaperSource ?? "");
          setWallpaperUrl(project.wallpaperUrl ?? "");
        }
      });
    }
  }, [editId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (lyricsText.trim()) {
      setLyricsValidation(validateAndParseLyrics(lyricsText));
    } else {
      setLyricsValidation(null);
    }
  }, [lyricsText]);

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

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLyricsFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        setLyricsText(content);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleLookup = async () => {
    const rawSong = songName.trim();
    if (!rawSong) return;

    let mainArtist = artists[0]?.trim();
    let trackName = rawSong;

    // If no artist was typed, derive it from an "Artist - Title" string.
    if (!mainArtist) {
      const parsed = parseArtistTitle(rawSong);
      if (parsed.artistName) {
        mainArtist = parsed.artistName;
        trackName = parsed.trackName;
      }
    }

    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const query = mainArtist ? `${mainArtist} ${trackName}` : trackName;
      const lrcResults = await searchLrcLib(query);
      const lrcResult = pickBestLrcResult(lrcResults, trackName);
      const rawLyrics = lrcResult?.syncedLyrics || lrcResult?.plainLyrics || "";

      // Prefer LRCLIB's casing for the track name, falling back to user input.
      const resolvedTrackName = lrcResult?.trackName || trackName;
      const artistForPipeline = lrcResult?.artistName || mainArtist || "";
      const metadata = await getFullMetadata(artistForPipeline, resolvedTrackName, lrcResult);

      setLookupResult({ metadata, rawLyrics, lrcResult });
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  };

  const applyLookup = () => {
    if (!lookupResult) return;
    const { metadata, rawLyrics } = lookupResult;

    setSongName(metadata.trackName);
    setArtists(metadata.artistName.length > 0 ? metadata.artistName : artists);
    setAlbumName(metadata.albumName ?? "");
    setCoverUrl(metadata.coverUrl ?? "");
    setSongLinkUrl(metadata.songLinkUrl ?? "");

    if (rawLyrics) {
      setLyricsText(rawLyrics);
    }

    if (metadata.recommendedSocialLinks && metadata.recommendedSocialLinks.length > 0) {
      setSocialEntries(
        metadata.recommendedSocialLinks.map((link) => ({
          artistIndex: Math.max(
            0,
            (metadata.artistName ?? artists).indexOf(link.artistName ?? ""),
          ),
          platform: link.platform,
          url: link.url,
        })),
      );
    }

    setActiveArtistTab(0);

    discoveredMetaRef.current = {
      isrcs: metadata.isrcs,
      streamingSites: metadata.streamingSites,
      artistLinks: metadata.artistLinks,
    };

    setLookupResult(null);
  };

  const submit = async () => {
    const validArtists = artists.filter((a) => a.trim());
    if (!songName.trim() || validArtists.length === 0) return;

    const input = buildProjectInput(
      {
        songName,
        artists,
        coverUrl,
        originLanguage,
        translationLanguage,
        albumName,
        songLinkUrl,
        wallpaperArtistName,
        wallpaperSource,
        wallpaperUrl,
        lyricsValidation,
        socialEntries,
      },
      discoveredMetaRef.current,
    );

    if (isEditing) {
      await updateProject(Number(editId), {
        artistName: input.artistName,
        trackName: input.trackName,
        coverUrl: input.coverUrl,
        originLanguage: input.originLanguage,
        translationLanguage: input.translationLanguage,
        albumName: input.albumName,
        songLinkUrl: input.songLinkUrl,
        wallpaperArtistName: input.wallpaperArtistName,
        wallpaperSource: input.wallpaperSource,
        wallpaperUrl: input.wallpaperUrl,
        recommendedSocialLinks: input.recommendedSocialLinks,
      });
      navigate(`/editor/${editId}`);
    } else {
      const id = await createProject(input);
      navigate(`/editor/${id}`, { replace: true });
    }
  };

  return {
    songName,
    setSongName,
    albumName,
    setAlbumName,
    artists,
    setArtists,
    coverUrl,
    setCoverUrl,
    songLinkUrl,
    setSongLinkUrl,
    originLanguage,
    setOriginLanguage,
    translationLanguage,
    setTranslationLanguage,
    socialEntries,
    setSocialEntries,
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
    addArtist,
    updateArtist,
    removeArtist,
    addSocialEntry,
    updateSocialEntry,
    removeSocialEntry,
    handleFileUpload,
    lookupLoading,
    lookupResult,
    lookupError,
    setLookupError,
    setLookupResult,
    handleLookup,
    applyLookup,
    submit,
  };
}
