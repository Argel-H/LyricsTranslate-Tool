import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/features/shell/AppShell";
import { MasterCard } from "@/features/shell/MasterCard";
import { ProjectCard } from "./ProjectCard";
import { SearchInput } from "./SearchInput";
import { getAllProjects, deleteProject } from "@/db/projectRepository";
import { downloadProjectAsYaml } from "@/lib/exportUtils";
import { useDebounce } from "@/hooks/useDebounce";
import { useModalStore } from "@/stores/modalStore";
import { useProjectStore } from "@/stores/projectStore";
import { useI18n } from "@/hooks/useI18n";

import type { Project } from "@/types/project";
import type { ProjectStatus } from "@/lib/constants";

/**
 * Normalizes a string for search: lowercases and strips diacritics/accents
 * so "VOILÀ" matches "voila" and "Lø Spirit" matches "lo spirit".
 *
 * Steps:
 *  1. NFD-decompose composed characters (e.g. "À" → "A" + combining grave)
 *  2. Strip combining diacritical marks (U+0300–U+036F)
 *  3. Transliterate common non-decomposable letters (ø, æ, œ, ð, þ, ß, etc.)
 *  4. Lowercase the result
 */
function normalizeForSearch(str: string): string {
  const translitMap: Record<string, string> = {
    ø: "o",
    Ø: "o",
    æ: "ae",
    Æ: "ae",
    œ: "oe",
    Œ: "oe",
    ð: "d",
    Ð: "d",
    þ: "th",
    Þ: "th",
    ß: "ss",
    ü: "u",
    Ü: "u",
    ö: "o",
    Ö: "o",
    ä: "a",
    Ä: "a",
    å: "a",
    Å: "a",
    ñ: "n",
    Ñ: "n",
    ç: "c",
    Ç: "c",
  };

  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[øØæÆœŒðÐþÞßüÜöÖäÄåÅñÑçÇ]/g, (ch) => translitMap[ch] ?? ch)
    .toLowerCase();
}

/**
 * AllProjectsPage — shows ALL projects with a client-side search bar
 * filtering by album, artist, or song name.
 *
 * Follows the same DashboardPage architecture (AppShell + MasterCard +
 * ProjectCard grid), but without the API-based HeroSection search.
 */
export function AllProjectsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  // Clear project state on mount (same as DashboardPage)
  useEffect(() => {
    useProjectStore.getState().clearProject();
    getAllProjects().then(setProjects);
  }, []);

  // Client-side filter by trackName, artistName, albumName (diacritic-insensitive)
  const filteredProjects = useMemo(() => {
    if (!debouncedSearch.trim()) return projects;
    const tokens = debouncedSearch
      .trim()
      .split(/\s+/)
      .map((t) => normalizeForSearch(t));
    return projects.filter((p) => {
      const haystack = [
        normalizeForSearch(p.trackName),
        ...p.artistName.map((a) => normalizeForSearch(a)),
      ];
      if (p.albumName != null) {
        haystack.push(normalizeForSearch(p.albumName));
      }
      // Every token must match at least one field
      return tokens.every((token) =>
        haystack.some((field) => field.includes(token)),
      );
    });
  }, [projects, debouncedSearch]);

  // ── Handlers (same pattern as DashboardPage) ──

  const refreshProjects = () => {
    getAllProjects().then(setProjects);
  };

  const handleEditProject = (projectId: number) => {
    navigate(`/edit-project/${projectId}`);
  };

  const handleOpenProject = (projectId: number) => {
    navigate(`/editor/${projectId}`);
  };

  const handleDeleteProject = (project: Project) => {
    setDeleteTarget(project);
  };

  const handleExportProject = (project: Project) => {
    downloadProjectAsYaml(project);
  };

  const confirmDeleteProject = async () => {
    if (!deleteTarget) return;
    await deleteProject(deleteTarget.id);
    setDeleteTarget(null);
    refreshProjects();
  };

  // ── Render ──

  return (
    <>
      <AppShell
        activePage="home"
        title={t("projects.title")}
        onBack={() => navigate("/")}
        topbarBg="bg-surface-container"
        sidebarBg="bg-surface-container"
        showTopbarBorder={false}
        bodyBg="bg-surface-container"
        onOpenSettings={() => useModalStore.getState().openSettings()}
        onOpenAbout={() => useModalStore.getState().openAbout()}
      >
        <MasterCard bgColor="bg-surface-container-lowest">
          <div className="max-w-7xl mx-auto">
            {/* Search bar — centered in body */}
            <div className="px-8 pt-1 flex justify-center">
              <SearchInput
                placeholder={t("projects.searchPlaceholder")}
                value={search}
                onChange={setSearch}
                className="w-full max-w-xl"
              />
            </div>

            {filteredProjects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-3 py-8">
                {filteredProjects.map((project) => {
                  const status: ProjectStatus = project.status;
                  return (
                    <ProjectCard
                      key={project.id}
                      title={project.trackName}
                      artist={project.artistName.join(", ")}
                      coverUrl={project.coverUrl ?? ""}
                      progress={project.progress}
                      status={status}
                      statusLabel={
                        status === "in-progress"
                          ? t("dashboard.status.inProgress")
                          : t("dashboard.status.inReview")
                      }
                      onClick={() => navigate(`/editor/${project.id}`)}
                      onEdit={() => handleEditProject(project.id)}
                      onOpen={() => handleOpenProject(project.id)}
                      onDelete={() => handleDeleteProject(project)}
                      onExport={() => handleExportProject(project)}
                    />
                  );
                })}
              </div>
            ) : (
              <section className="text-center py-20">
                <p className="text-on-surface-variant font-body-lg">
                  {debouncedSearch.trim()
                    ? t("projects.emptySearch")
                    : t("projects.emptyState")}
                </p>
              </section>
            )}
          </div>
        </MasterCard>
      </AppShell>

      {/* Delete Confirmation Modal (same pattern as DashboardPage) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-high rounded-3xl p-6 shadow-2xl border border-outline-variant/20 max-w-sm w-full mx-4">
            <h3 className="font-title-lg text-on-surface mb-2">
              {t("dashboard.deleteProject")}
            </h3>
            <p className="font-body-md text-on-surface-variant mb-6">
              {t("dashboard.deleteConfirm").replace(
                "%s",
                deleteTarget.trackName,
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-5 py-2.5 rounded-full font-label-lg text-on-surface-variant hover:bg-surface-container-highest transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={confirmDeleteProject}
                className="px-5 py-2.5 rounded-full font-label-lg bg-error-container text-on-error-container hover:bg-error hover:text-on-error transition-all"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
