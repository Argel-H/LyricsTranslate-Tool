import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  createProject,
  getProject,
  updateProject,
  deleteProject,
} from "@/db/projectRepository";
import { interfaceLanguageToTranslationLanguage } from "@/lib/languageUtils";
import type { ProjectCreateInput } from "@/types/project";

interface SocialEntry {
  artistIndex: number;
  platform: string;
  url: string;
}

export interface ProjectSetupFormState {
  songName: string;
  albumName: string;
  artists: string[];
  coverUrl: string;
  songLinkUrl: string;
  originLanguage: string;
  translationLanguage: string;
  socialEntries: SocialEntry[];
}

export function useProjectSetupForm() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const isEditing = !!editId;
  const settingsLanguage = useSettingsStore((s) => s.language);

  const [form, setForm] = useState<ProjectSetupFormState>({
    songName: "",
    albumName: "",
    artists: [""],
    coverUrl: "",
    songLinkUrl: "",
    originLanguage: "English",
    translationLanguage: interfaceLanguageToTranslationLanguage(settingsLanguage),
    socialEntries: [],
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!editId) return;
    getProject(Number(editId)).then((project) => {
      if (!project) return;
      setForm({
        songName: project.trackName,
        albumName: project.albumName ?? "",
        artists: project.artistName.length > 0 ? project.artistName : [""],
        coverUrl: project.coverUrl ?? "",
        songLinkUrl: project.songLinkUrl ?? "",
        originLanguage: project.originLanguage ?? "English",
        translationLanguage: project.translationLanguage ?? interfaceLanguageToTranslationLanguage(settingsLanguage),
        socialEntries: [],
      });
    });
  }, [editId, settingsLanguage]);

  const updateFormField = useCallback(
    <K extends keyof ProjectSetupFormState>(field: K, value: ProjectSetupFormState[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const addArtist = useCallback(() => {
    setForm((prev) => ({ ...prev, artists: [...prev.artists, ""] }));
  }, []);

  const updateArtist = useCallback((index: number, value: string) => {
    setForm((prev) => {
      const next = [...prev.artists];
      next[index] = value;
      return { ...prev, artists: next };
    });
  }, []);

  const removeArtist = useCallback((index: number) => {
    setForm((prev) => {
      if (prev.artists.length <= 1) return prev;
      const artists = prev.artists.filter((_, i) => i !== index);
      const socialEntries = prev.socialEntries
        .filter((entry) => entry.artistIndex !== index)
        .map((entry) => ({
          ...entry,
          artistIndex: entry.artistIndex > index ? entry.artistIndex - 1 : entry.artistIndex,
        }));
      return { ...prev, artists, socialEntries };
    });
  }, []);

  const addSocialEntry = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      socialEntries: [...prev.socialEntries, { artistIndex: 0, platform: "Spotify", url: "" }],
    }));
  }, []);

  const updateSocialEntry = useCallback(
    (index: number, field: keyof SocialEntry, value: string | number) => {
      setForm((prev) => {
        const next = [...prev.socialEntries];
        next[index] = { ...next[index]!, [field]: value };
        return { ...prev, socialEntries: next };
      });
    },
    [],
  );

  const removeSocialEntry = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      socialEntries: prev.socialEntries.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    const validArtists = form.artists.filter((a) => a.trim());
    if (!form.songName.trim() || validArtists.length === 0) return;

    const input: ProjectCreateInput = {
      artistName: validArtists,
      trackName: form.songName.trim(),
      lyrics: {},
      coverUrl: form.coverUrl.trim() || undefined,
      originLanguage: form.originLanguage,
      translationLanguage: form.translationLanguage,
      albumName: form.albumName.trim() || undefined,
      songLinkUrl: form.songLinkUrl.trim() || undefined,
    };

    if (isEditing) {
      await updateProject(Number(editId), {
        title: `${validArtists[0]} - ${form.songName.trim()}`,
        artistName: validArtists,
        trackName: form.songName.trim(),
        coverUrl: input.coverUrl,
        originLanguage: form.originLanguage,
        translationLanguage: form.translationLanguage,
        albumName: input.albumName,
        songLinkUrl: input.songLinkUrl,
      });
      navigate(`/editor/${editId}`);
    } else {
      const id = await createProject(input);
      navigate(`/editor/${id}`);
    }
  }, [form, isEditing, editId, navigate]);

  const handleDelete = useCallback(async () => {
    if (!editId) return;
    await deleteProject(Number(editId));
    navigate("/");
  }, [editId, navigate]);

  return {
    form,
    isEditing,
    editId,
    deleteDialogOpen,
    setDeleteDialogOpen,
    updateFormField,
    addArtist,
    updateArtist,
    removeArtist,
    addSocialEntry,
    updateSocialEntry,
    removeSocialEntry,
    handleSubmit,
    handleDelete,
    goBack: () => navigate(-1),
  };
}
