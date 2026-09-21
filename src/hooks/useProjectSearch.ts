import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { searchLrcLib } from "@/services/lrclib";
import { DEBOUNCE_SEARCH_MS } from "@/lib/config/constants";
import type { LRCLibResult } from "@/types/music";

export interface FormattedSearchResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  isSynced: boolean;
}

export function formatSearchResults(
  results: LRCLibResult[] | undefined,
): FormattedSearchResult[] | undefined {
  if (!Array.isArray(results)) return undefined;

  return results
    .map((r) => ({
      id: r.id,
      trackName: r.trackName,
      artistName: r.artistName,
      albumName: r.albumName,
      isSynced: r.syncedLyrics !== null,
    }))
    .sort((a, b) => {
      if (a.isSynced && !b.isSynced) return -1;
      if (!a.isSynced && b.isSynced) return 1;
      return 0;
    });
}

export interface UseProjectSearchReturn {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  /** Debounced query; the dropdown empty-state depends on it. */
  debouncedSearch: string;
  searchResults: LRCLibResult[] | undefined;
  isSearching: boolean;
  formattedResults: FormattedSearchResult[] | undefined;
}

export function useProjectSearch(): UseProjectSearchReturn {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, DEBOUNCE_SEARCH_MS);

  const { data: searchResults, isLoading: isSearching } = useQuery<
    LRCLibResult[]
  >({
    queryKey: ["lrclib-search", debouncedSearch],
    queryFn: () => searchLrcLib(debouncedSearch),
    enabled: debouncedSearch.trim().length > 1,
    staleTime: 60_000,
  });

  const formattedResults = formatSearchResults(searchResults);

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    searchResults,
    isSearching,
    formattedResults,
  };
}
