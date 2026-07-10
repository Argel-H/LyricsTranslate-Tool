import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MasterCard } from "@/features/shell/MasterCard";
import { ProjectCard } from "./ProjectCard";
import { SearchInput } from "./SearchInput";
import {
  getAllProjects,
  deleteProject,
  updateProjectProgress,
  updateProjectArchived,
} from "@/db/projectRepository";
import { downloadProjectAsYaml } from "@/lib/exportUtils";
import { useDebounce } from "@/hooks/useDebounce";
import { useModalStore } from "@/stores/modalStore";
import { useShellStore } from "@/stores/shellStore";
import { useProjectStore } from "@/stores/projectStore";
import { useI18n } from "@/hooks/useI18n";
import type { I18nKey } from "@/i18n";
import { Filter, Check, Archive, Circle, Play, ClipboardCheck, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import type { Project } from "@/types/project";
import { PROJECT_STATUS, type ProjectStatus } from "@/lib/constants";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useI18n();

  // Initialize state from URL params
  const urlStatuses = (searchParams.get("status") ?? "")
    .split(",")
    .filter((s): s is ProjectStatus =>
      Object.values(PROJECT_STATUS).includes(s as ProjectStatus),
    );

  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const debouncedSearch = useDebounce(search, 300);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [statusFilters, setStatusFilters] = useState<Set<ProjectStatus>>(
    new Set(urlStatuses),
  );
  const [showArchived, setShowArchived] = useState(
    searchParams.get("archived") === "1",
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Click-outside to close filter popup
  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterOpen]);

  // Sync search + filters to URL
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);

        if (debouncedSearch.trim()) {
          next.set("q", debouncedSearch.trim());
        } else {
          next.delete("q");
        }

        if (statusFilters.size > 0) {
          next.set("status", [...statusFilters].join(","));
        } else {
          next.delete("status");
        }

        if (showArchived) {
          next.set("archived", "1");
        } else {
          next.delete("archived");
        }

        return next;
      },
      { replace: true },
    );
  }, [debouncedSearch, statusFilters, showArchived, setSearchParams]);

  // Clear project state on mount (same as DashboardPage)
  useEffect(() => {
    useProjectStore.getState().clearProject();
    getAllProjects(true).then(setProjects);
  }, []);

  // Client-side filter by status, archived, AND text search
  const filteredProjects = useMemo(() => {
    let result = projects;

    // Status filter (multi-select — empty set = show all)
    if (statusFilters.size > 0) {
      result = result.filter((p) => statusFilters.has(p.status));
    }

    // Archived filter
    if (showArchived && statusFilters.size === 0) {
      // Only archived — no status filter active
      result = result.filter((p) => p.archived);
    } else if (!showArchived) {
      // Hide archived
      result = result.filter((p) => !p.archived);
    }
    // else: showArchived && statusFilters.size > 0 → show matching status incl. archived

    // Text search
    if (!debouncedSearch.trim()) return result;
    const tokens = debouncedSearch
      .trim()
      .split(/\s+/)
      .map((t) => normalizeForSearch(t));
    return result.filter((p) => {
      const haystack = [
        normalizeForSearch(p.trackName),
        ...p.artistName.map((a) => normalizeForSearch(a)),
      ];
      if (p.albumName != null) {
        haystack.push(normalizeForSearch(p.albumName));
      }
      return tokens.every((token) =>
        haystack.some((field) => field.includes(token)),
      );
    });
  }, [projects, debouncedSearch, statusFilters, showArchived]);

  // Status filter options with icons
  const FILTER_OPTIONS: Array<{
    key: ProjectStatus;
    labelKey: I18nKey;
    icon: typeof Circle;
  }> = [
    {
      key: PROJECT_STATUS.NOT_STARTED,
      labelKey: "dashboard.status.notStarted",
      icon: Circle,
    },
    {
      key: PROJECT_STATUS.IN_PROGRESS,
      labelKey: "dashboard.status.inProgress",
      icon: Play,
    },
    {
      key: PROJECT_STATUS.IN_REVIEW,
      labelKey: "dashboard.status.inReview",
      icon: ClipboardCheck,
    },
    {
      key: PROJECT_STATUS.COMPLETED,
      labelKey: "dashboard.status.completed",
      icon: CheckCircle,
    },
  ];

  const toggleFilter = (key: ProjectStatus) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clearFilters = () => {
    setStatusFilters(new Set());
    setShowArchived(false);
  };

  const hasActiveFilters = statusFilters.size > 0 || showArchived;

  // ── Handlers (same pattern as DashboardPage) ──

  const refreshProjects = () => {
    getAllProjects(true).then(setProjects);
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

  const handleToggleComplete = async (project: Project) => {
    const newStatus =
      project.status === PROJECT_STATUS.COMPLETED
        ? PROJECT_STATUS.IN_REVIEW
        : project.status === PROJECT_STATUS.IN_REVIEW
          ? PROJECT_STATUS.COMPLETED
          : project.status;
    if (newStatus === project.status) return;
    await updateProjectProgress(project.id, project.progress, newStatus);
    refreshProjects();
  };

  const handleToggleArchive = async (project: Project) => {
    await updateProjectArchived(project.id, !project.archived);
    refreshProjects();
  };

  // Push shell config on mount
  useEffect(() => {
    useShellStore.getState().reset();
    useShellStore.getState().setConfig({
      title: t("projects.title"),
      onBack: () => navigate(-1),
      topbarBg: "bg-surface-container",
      sidebarBg: "bg-surface-container",
      showTopbarBorder: false,
      bodyBg: "bg-surface-container",
      onOpenSettings: () => useModalStore.getState().openSettings(),
      onOpenAbout: () => useModalStore.getState().openAbout(),
    });
    return () => {
      useShellStore.getState().reset();
    };
  }, [t, navigate]);

  // ── Render ──

  return (
    <>
      <MasterCard bgColor="bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto">
          {/* Search bar + filter */}
          <div className="px-8 pt-1 flex justify-center">
            <div className="w-full max-w-3xl flex items-center gap-2">
              <div className="flex-1">
                <SearchInput
                  placeholder={t("projects.searchPlaceholder")}
                  value={search}
                  onChange={setSearch}
                />
              </div>

              {/* Filter button + popup */}
              <div className="relative self-stretch" ref={filterRef}>
                <button
                onClick={() => setFilterOpen((prev) => !prev)}
                className={`h-full aspect-square flex items-center justify-center transition-all duration-200 active:scale-95 ${
                filterOpen ? "rounded-md bg-primary text-on-primary" : "rounded-xl"
                } ${
                !filterOpen && hasActiveFilters
                ? "bg-primary-container text-on-primary-container"
                : !filterOpen
                      ? "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                        : ""
                  }`}
                >
                  <Filter className="size-5" />
                </button>

                <AnimatePresence>
                  {filterOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-0 top-[calc(100%+8px)] bg-surface-container-high/95 backdrop-blur-xl border border-outline-variant/20 rounded-3xl shadow-2xl z-50 p-4 w-[280px]"
                    >
                      {/* Arrow pointing up to the filter button */}
                      <div className="absolute -top-1.5 right-4 w-3 h-3 bg-surface-container-high border-l border-t border-outline-variant/20 rotate-45" />

                      <div className="flex items-center justify-between mb-3">
                        <span className="font-label-lg text-on-surface">
                          {t("projects.filterByStatus")}
                        </span>
                        {hasActiveFilters && (
                          <button
                            onClick={clearFilters}
                            className="text-sm text-primary hover:underline font-label-md"
                          >
                            {t("projects.clearFilters")}
                          </button>
                        )}
                      </div>

                      {/* Status filter grid */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {FILTER_OPTIONS.map((opt) => {
                          const active = statusFilters.has(opt.key);
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.key}
                              onClick={() => toggleFilter(opt.key)}
                              className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl transition-all duration-150 aspect-square ${
                                active
                                  ? "bg-primary-container text-on-primary-container shadow-sm scale-[1.02]"
                                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface hover:scale-[1.01]"
                              }`}
                            >
                              <Icon className="size-6" />
                              <span className="font-label-sm text-center leading-tight">
                                {t(opt.labelKey)}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="h-px bg-outline-variant/20 my-2" />

                      {/* Archive toggle */}
                      <button
                        onClick={() => setShowArchived((prev) => !prev)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-150 ${
                          showArchived
                            ? "bg-tertiary-container text-on-tertiary-container shadow-sm"
                            : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                        }`}
                      >
                        <Archive className="size-5" />
                        <span className="font-label-md">{t("projects.filterArchived")}</span>
                        {showArchived && <Check className="size-4 ml-auto" />}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-3 py-8">
              <AnimatePresence>
                {filteredProjects.map((project) => {
                  const status: ProjectStatus = project.status;
                  const statusLabels: Record<ProjectStatus, string> = {
                    "not-started": t("dashboard.status.notStarted"),
                    "in-progress": t("dashboard.status.inProgress"),
                    "in-review": t("dashboard.status.inReview"),
                    completed: t("dashboard.status.completed"),
                  };
                  return (
                    <motion.div
                      key={project.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <ProjectCard
                        title={project.trackName}
                        artist={project.artistName.join(", ")}
                        coverUrl={project.coverUrl ?? ""}
                        progress={project.progress}
                        status={status}
                        statusLabel={statusLabels[status]}
                        onClick={() => navigate(`/editor/${project.id}`)}
                        onEdit={() => handleEditProject(project.id)}
                        onOpen={() => handleOpenProject(project.id)}
                        onDelete={() => handleDeleteProject(project)}
                        onExport={() => handleExportProject(project)}
                        onToggleComplete={() => handleToggleComplete(project)}
                        onToggleArchive={() => handleToggleArchive(project)}
                        isArchived={!!project.archived}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
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
