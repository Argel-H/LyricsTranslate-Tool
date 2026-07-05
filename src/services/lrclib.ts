import axios from "axios";
import type { LRCLibResult } from "@/types/music";
import { API } from "@/lib/apiConfig";

const LRCLIB_ENDPOINT = `${API.lrclib}/api/search?q=`;

export async function fetchLyrics(
  query: string,
  options?: { signal?: AbortSignal },
): Promise<LRCLibResult[]> {
  if (!query.trim()) return [];
  const response = await axios.get<LRCLibResult[]>(
    `${LRCLIB_ENDPOINT}${encodeURIComponent(query)}`,
    { signal: options?.signal },
  );
  return response.data;
}
