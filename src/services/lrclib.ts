import axios from "axios";
import type { LRCLibResult } from "@/types/music";

const LRCLIB_ENDPOINT = "/api-lrclib/api/search?q=";

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
