import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import anyAscii from "any-ascii";
import { useDebounce } from "@/hooks/useDebounce";
import type { Project } from "@/types/project";
import type { ProjectStatus } from "@/lib/config/constants";

// Intentionally different from the LRCLIB search debounce (DEBOUNCE_SEARCH_MS, 350ms).
const FILTER_DEBOUNCE_MS = 300;

export function normalizeForSearch(str: string): string {
  return anyAscii(str).toLowerCase();
}

export interface ProjectFilterCriteria {
  query: string;
  statuses: Set<ProjectStatus>;
  showArchived: boolean;
}

// Archived/status interaction is subtle:
//   showArchived && statuses empty → only archived
//   !showArchived                  → archived always hidden
//   showArchived && statuses set   → status matches, archived included
export function filterProjects(
  projects: Project[],
  { query, statuses, showArchived }: ProjectFilterCriteria,
): Project[] {
  let result = projects;

  if (statuses.size > 0) {
    result = result.filter((p) => statuses.has(p.status));
  }

  if (showArchived && statuses.size === 0) {
    result = result.filter((p) => p.archived);
  } else if (!showArchived) {
    result = result.filter((p) => !p.archived);
  }

  if (!query.trim()) return result;

  const tokens = query
    .trim()
    .split(/\s+/)
    .map((token) => normalizeForSearch(token));

  return result.filter((p) => {
    const haystack = [
      normalizeForSearch(p.trackName),
      ...p.artistName.map((artist) => normalizeForSearch(artist)),
    ];
    if (p.albumName != null) {
      haystack.push(normalizeForSearch(p.albumName));
    }
    return tokens.every((token) =>
      haystack.some((field) => field.includes(token)),
    );
  });
}

export interface UseProjectFiltersOptions {
  initialSearch?: string;
  initialStatuses?: ProjectStatus[];
  initialShowArchived?: boolean;
}

export interface UseProjectFiltersReturn {
  search: string;
  setSearch: (value: string) => void;
  debouncedSearch: string;
  statusFilters: Set<ProjectStatus>;
  toggleFilter: (key: ProjectStatus) => void;
  clearFilters: () => void;
  showArchived: boolean;
  setShowArchived: Dispatch<SetStateAction<boolean>>;
  filterOpen: boolean;
  setFilterOpen: Dispatch<SetStateAction<boolean>>;
  hasActiveFilters: boolean;
  filteredProjects: Project[];
}

// Router/URL concerns stay in the page; the page passes URL-derived initial
// values and writes this state back to the query string.
export function useProjectFilters(
  projects: Project[],
  options: UseProjectFiltersOptions = {},
): UseProjectFiltersReturn {
  const [search, setSearch] = useState(options.initialSearch ?? "");
  const debouncedSearch = useDebounce(search, FILTER_DEBOUNCE_MS);
  const [statusFilters, setStatusFilters] = useState<Set<ProjectStatus>>(
    () => new Set(options.initialStatuses ?? []),
  );
  const [showArchived, setShowArchived] = useState(
    options.initialShowArchived ?? false,
  );
  const [filterOpen, setFilterOpen] = useState(false);

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

  const filteredProjects = useMemo(
    () =>
      filterProjects(projects, {
        query: debouncedSearch,
        statuses: statusFilters,
        showArchived,
      }),
    [projects, debouncedSearch, statusFilters, showArchived],
  );

  return {
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
  };
}
