import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/features/shell/AppShell";
import { MasterCard } from "@/features/shell/MasterCard";
import { HeroSection } from "./HeroSection";
import { ProjectCard } from "./ProjectCard";
import { APP_NAME } from "@/lib/appConfig";
import { ArrowRight, Upload } from "lucide-react";
import { downloadProjectAsYaml } from "@/lib/exportUtils";
import { parseProjectYaml } from "@/lib/yamlParser";
import { M3LoadingIndicator } from "@alerix/m3-loading-indicator/react";
import { searchLrcLib } from "@/services/lrclib";
import { getFullMetadata } from "@/services/metadataAggregator";
import {
  createProject,
  getAllProjects,
  deleteProject,
} from "@/db/projectRepository";
import { useDebounce } from "@/hooks/useDebounce";
import { useModalStore } from "@/stores/modalStore";
import { useProjectStore } from "@/stores/projectStore";
import { useI18n } from "@/hooks/useI18n";
import type { Project } from "@/types/project";
import type { ProjectStatus } from "@/lib/constants";
import type { LRCLibResult } from "@/types/music";

export function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [projects, setProjects] = useState<Project[]>([]);
  const [creatingProject, setCreatingProject] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [importingProject, setImportingProject] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Clear any lingering project/audio state when entering dashboard
  useEffect(() => {
    useProjectStore.getState().clearProject();
  }, []);

  // Fetch recent projects from Dexie
  useEffect(() => {
    getAllProjects().then(setProjects);
  }, []);

  // Search LRCLIB with debounce via TanStack Query
  const { data: searchResults, isLoading: isSearching } = useQuery<
    LRCLibResult[]
  >({
    queryKey: ["lrclib-search", debouncedSearch],
    queryFn: () => searchLrcLib(debouncedSearch),
    enabled: debouncedSearch.trim().length > 1,
    staleTime: 60_000,
  });

  // Handle clicking a search result → auto-fill + skip ProjectSetup
  const handleSearchSelect = async (index: number) => {
    if (!searchResults || !searchResults[index]) return;
    setCreatingProject(true);
    setLoadingStatus(t("dashboard.fetchingLyrics"));
    try {
      const result = searchResults[index]!;
      setLoadingStatus(t("dashboard.lookingUp"));
      const metadata = await getFullMetadata(
        result.artistName,
        result.trackName,
        result,
      );
      setLoadingStatus(t("dashboard.creatingProjectDesc"));
      const projectId = await createProject(metadata);
      navigate(`/editor/${projectId}`);
    } catch (err) {
      console.error("Failed to create project:", err);
      setCreatingProject(false);
    }
  };

  // Handle empty project
  const handleCreateEmpty = () => {
    navigate("/new-project");
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
    // Refresh the projects list
    getAllProjects().then(setProjects);
  };

  // Handle YAML file import
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
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const formatResults = Array.isArray(searchResults)
    ? searchResults
        .map((r) => ({
          id: r.id,
          trackName: r.trackName,
          artistName: r.artistName,
          albumName: r.albumName,
          isSynced: r.syncedLyrics !== null,
        }))
        .sort((a, b) => {
          // Synced results first
          if (a.isSynced && !b.isSynced) return -1;
          if (!a.isSynced && b.isSynced) return 1;
          return 0;
        })
    : undefined;

  return (
    <>
      <AppShell
        activePage="home"
        showTopbar={false}
        sidebarBg="bg-surface-container-lowest"
        bodyBg="bg-surface-container-lowest"
        onOpenSettings={() => useModalStore.getState().openSettings()}
        onOpenAbout={() => useModalStore.getState().openAbout()}
      >
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
              onSearch={setSearch}
              searchResults={formatResults}
              onSearchSelect={handleSearchSelect}
              isSearching={isSearching}
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
              </section>
            )}

            {/* Show empty state when no projects exist and not searching */}
            {projects.length === 0 && !isSearching && !debouncedSearch && (
              <section className="text-center py-12">
                <p className="text-on-surface-variant font-body-lg">
                  {t("dashboard.emptyState")}
                </p>
              </section>
            )}
          </div>
        </MasterCard>
      </AppShell>

      {/* Loading Modal Overlay — creating project */}
      {creatingProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-high rounded-3xl p-8 shadow-2xl border border-outline-variant/20 max-w-sm w-full mx-4 flex flex-col items-center gap-4">
            <M3LoadingIndicator size={40} style={{ color: "rgb(208, 188, 255)" }} />
            <p className="font-title-lg text-title-lg text-on-surface text-center">
              {t("dashboard.creatingProject")}
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant text-center">
              {loadingStatus}
            </p>
            <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden mt-2">
              <div className="h-full bg-primary rounded-full animate-m3-loading-bar" />
            </div>
          </div>
        </div>
      )}

      {/* Loading Modal Overlay — importing project */}
      {importingProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-high rounded-3xl p-8 shadow-2xl border border-outline-variant/20 max-w-sm w-full mx-4 flex flex-col items-center gap-4">
            <M3LoadingIndicator size={40} style={{ color: "rgb(208, 188, 255)" }} />
            <p className="font-title-lg text-title-lg text-on-surface text-center">
              {t("dashboard.importing")}
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant text-center">
              {t("dashboard.importingDesc")}
            </p>
            <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden mt-2">
              <div className="h-full bg-primary rounded-full animate-m3-loading-bar" />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
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

      {/* Import Error Modal */}
      {importError && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-high rounded-3xl p-6 shadow-2xl border border-outline-variant/20 max-w-sm w-full mx-4">
            <h3 className="font-title-lg text-on-surface mb-2">{t("dashboard.importError")}</h3>
            <p className="font-body-md text-on-surface-variant mb-6">{importError}</p>
            <button
              onClick={() => setImportError(null)}
              className="w-full py-2.5 rounded-full font-label-lg bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-all"
            >
              {t("common.ok")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
