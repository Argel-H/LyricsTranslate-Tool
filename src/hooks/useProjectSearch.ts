import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { searchLrcLib } from "@/services/lrclib";
import { DEBOUNCE_SEARCH_MS } from "@/lib/constants";
import type { LRCLibResult } from "@/types/music";

export interface UseProjectSearchReturn {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchResults: LRCLibResult[] | undefined;
  isSearching: boolean;
  formattedResults:
    | Array<{
        id: number;
        trackName: string;
        artistName: string;
        albumName?: string;
      }>
    | undefined;
}

/**
 * Manages search state, debounced query, and TanStack Query
 * integration for LRCLIB search results.
 */
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

  const formattedResults = searchResults?.map((r) => ({
    id: r.id,
    trackName: r.trackName,
    artistName: r.artistName,
    albumName: r.albumName,
  }));

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    formattedResults,
  };
}
