import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MasterCard } from "@/features/shell/MasterCard";
import { HeroSection } from "./HeroSection";
import { ProjectCard } from "./ProjectCard";
import { APP_NAME } from "@/lib/config/appConfig";
import { ArrowRight, Upload } from "lucide-react";
import { countCommentsAndNotes } from "@/lib/commentUtils";
import { parseProjectYaml } from "@/lib/yamlParser";
import { createProject } from "@/db/projectRepository";
import { useModalStore } from "@/stores/modalStore";
import { useProjectStore } from "@/stores/projectStore";
import { useI18n } from "@/hooks/useI18n";
import { usePageShell } from "@/hooks/usePageShell";
import { useProjectList } from "@/hooks/useProjectList";
import { useProjectSearch } from "@/hooks/useProjectSearch";
import { useProjectCreation } from "@/hooks/useProjectCreation";
import { getProjectStatusLabel } from "@/lib/statusUtils";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingOverlay } from "@/components/shared/LoadingOverlay";
import { MessageModal } from "@/components/shared/MessageModal";
import type { ProjectStatus } from "@/lib/config/constants";

export function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const {
    projects,
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
    toggleComplete,
    toggleArchive,
    exportProject,
  } = useProjectList({ includeArchived: false });

  const {
    setSearchQuery,
    debouncedSearch,
    searchResults,
    isSearching,
    isError: isSearchError,
    formattedResults,
  } = useProjectSearch();
  const { isCreating, creationStatus, creationError, clearCreationError, handleSearchSelect } =
    useProjectCreation();

  const [importingProject, setImportingProject] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    useProjectStore.getState().clearProject();
  }, []);

  const handleCreateEmpty = () => {
    navigate("/new-project");
  };

  const handleEditProject = (projectId: number) => {
    navigate(`/edit-project/${projectId}`);
  };

  const handleOpenProject = (projectId: number) => {
    navigate(`/editor/${projectId}`);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingProject(true);
    setImportError(null);

    try {
      const text = await file.text();
      const projectInput = parseProjectYaml(text);
      const projectId = await createProject(projectInput);

      // Reset the file input so the same file can be re-imported
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setImportingProject(false);
      navigate(`/editor/${projectId}`);
    } catch (err) {
      setImportingProject(false);
      setImportError(err instanceof Error ? err.message : t("dashboard.importErrorMessage"));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const shellConfig = useMemo(() => ({
    activePage: "home" as const,
    variant: "dashboard" as const,
    showTopbar: false,
    sidebarBg: "bg-surface-container-lowest",
    bodyBg: "bg-surface-container-lowest",
    onOpenSettings: () => useModalStore.getState().openSettings(),
    onOpenAbout: () => useModalStore.getState().openAbout(),
  }), []);
  usePageShell(shellConfig);

  return (
    <>
      <MasterCard
          bgColor="!bg-surface-container"
          header={
            <div className="px-8 md:px-12 py-8 flex justify-between items-center border-b border-outline-variant/10 bg-surface-container/70 backdrop-blur-sm sticky top-0 z-30 rounded-t-[40px]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-on-primary font-headline-sm font-bold text-xl shadow-md">
                  L
                </div>
                <div>
                  <h1 className="font-headline-sm text-headline-sm font-black text-primary">
                    {APP_NAME}
                  </h1>
                  <p className="font-label-md text-label-md text-on-surface-variant">
                    {t("dashboard.tagline")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".yaml,.yml"
                  className="hidden"
                  onChange={handleFileImport}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 rounded-full font-label-lg text-on-surface transition-colors"
                >
                  <Upload className="size-4" />
                  {t("dashboard.importProject")}
                </button>
              </div>
            </div>
          }
        >
          <div className="max-w-6xl mx-auto space-y-12">
            <HeroSection
              onCreateEmpty={handleCreateEmpty}
              onSearch={setSearchQuery}
              searchResults={formattedResults}
              onSearchSelect={(index) => {
                setSearchQuery("");
                void handleSearchSelect(searchResults, index);
              }}
              isSearching={isSearching}
              isError={isSearchError}
            />

            {projects.length > 0 && (
              <section className="bg-surface-container-low rounded-[32px] p-8 border border-outline-variant/10 shadow-sm z-20">
                <div className="flex items-center justify-between mb-8 px-2">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                    {t("dashboard.recent.title")}
                  </h2>
                  <button
                    onClick={() => navigate("/projects")}
                    className="text-primary hover:bg-primary/10 px-4 py-2 rounded-full transition-colors font-label-lg text-label-lg flex items-center gap-2"
                  >
                    {t("dashboard.recent.viewAll")}
                    <ArrowRight className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                  {projects.slice(0, 8).map((project) => {
                    const status: ProjectStatus = project.status;
                    return (
                      <ProjectCard
                        key={project.id}
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
                    );
                  })}
                </div>
              </section>
            )}

            {projects.length === 0 && !isSearching && !debouncedSearch && (
              <section className="text-center py-12">
                <p className="text-on-surface-variant font-body-lg">
                  {t("dashboard.emptyState")}
                </p>
              </section>
            )}
          </div>
        </MasterCard>

      {isCreating && (
        <LoadingOverlay
          title={t("dashboard.creatingProject")}
          description={creationStatus}
        />
      )}

      {importingProject && (
        <LoadingOverlay
          title={t("dashboard.importing")}
          description={t("dashboard.importingDesc")}
        />
      )}

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

      <MessageModal
        open={importError !== null}
        title={t("dashboard.importError")}
        message={importError ?? ""}
        confirmLabel={t("common.ok")}
        onClose={() => setImportError(null)}
      />

      <MessageModal
        open={creationError !== null}
        title={t("dashboard.createError")}
        message={creationError ?? ""}
        confirmLabel={t("common.ok")}
        onClose={clearCreationError}
      />
    </>
  );
}
