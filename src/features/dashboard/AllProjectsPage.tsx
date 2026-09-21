import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { MasterCard } from "@/features/shell/MasterCard";
import { ProjectCard } from "./ProjectCard";
import { SearchInput } from "./SearchInput";
import { countCommentsAndNotes } from "@/lib/commentUtils";
import { useModalStore } from "@/stores/modalStore";
import { useProjectStore } from "@/stores/projectStore";
import { useI18n } from "@/hooks/useI18n";
import type { I18nKey } from "@/i18n";
import { Filter, Check, Archive, Circle, Play, ClipboardCheck, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getProjectStatusLabel } from "@/lib/statusUtils";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useClickOutside } from "@/hooks/useClickOutside";
import { usePageShell } from "@/hooks/usePageShell";
import { useProjectList } from "@/hooks/useProjectList";
import { useProjectFilters } from "@/hooks/useProjectFilters";

import { PROJECT_STATUS, type ProjectStatus } from "@/lib/config/constants";

export function AllProjectsPage() {
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useI18n();

  const urlStatuses = (searchParams.get("status") ?? "")
    .split(",")
    .filter((s): s is ProjectStatus =>
      Object.values(PROJECT_STATUS).includes(s as ProjectStatus),
    );

  const {
    projects,
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
    toggleComplete,
    toggleArchive,
    exportProject,
  } = useProjectList({ includeArchived: true });

  const {
    search,
    setSearch,
    debouncedSearch,
    statusFilters,
    toggleFilter,
    clearFilters,
    showArchived,
    setShowArchived,
    filterOpen,
    setFilterOpen,
    hasActiveFilters,
    filteredProjects,
  } = useProjectFilters(projects, {
    initialSearch: searchParams.get("q") ?? "",
    initialStatuses: urlStatuses,
    initialShowArchived: searchParams.get("archived") === "1",
  });

  const filterRef = useRef<HTMLDivElement>(null);

  useClickOutside(filterRef, () => setFilterOpen(false), filterOpen);

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

  useEffect(() => {
    useProjectStore.getState().clearProject();
  }, []);

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

  const handleEditProject = (projectId: number) => {
    navigate(`/edit-project/${projectId}`);
  };

  const handleOpenProject = (projectId: number) => {
    navigate(`/editor/${projectId}`);
  };

  const shellConfig = useMemo(() => ({
    title: t("projects.title"),
    onBack: () => smartBack(),
    topbarBg: "bg-surface-container",
    sidebarBg: "bg-surface-container",
    showTopbarBorder: false,
    bodyBg: "bg-surface-container",
    onOpenSettings: () => useModalStore.getState().openSettings(),
    onOpenAbout: () => useModalStore.getState().openAbout(),
  }), [t]);
  usePageShell(shellConfig);

  return (
    <>
      <MasterCard bgColor="bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto">
          <div className="px-8 pt-1 flex justify-center">
            <div className="w-full max-w-3xl flex items-center gap-2">
              <div className="flex-1">
                <SearchInput
                  placeholder={t("projects.searchPlaceholder")}
                  value={search}
                  onChange={setSearch}
                />
              </div>

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
                        statusLabel={getProjectStatusLabel(status, t)}
                        onClick={() => navigate(`/editor/${project.id}`)}
                        onEdit={() => handleEditProject(project.id)}
                        onOpen={() => handleOpenProject(project.id)}
                        onDelete={() => setDeleteTarget(project)}
                        onExport={() => exportProject(project)}
                        onToggleComplete={() => toggleComplete(project)}
                        onToggleArchive={() => toggleArchive(project)}
                        isArchived={!!project.archived}
                        originLanguage={project.originLanguage}
                        translationLanguage={project.translationLanguage}
                        annotationCount={countCommentsAndNotes(project.lyrics, project.notes)}
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

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("dashboard.deleteProject")}
        description={t("dashboard.deleteConfirm").replace("%s", deleteTarget?.trackName ?? "")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />
    </>
  );
}
