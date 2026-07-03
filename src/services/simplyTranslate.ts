import axios from "axios";
import type { SimplyTranslateResponse } from "@/types/music";

const TRANSLATE_ENDPOINT = "/api-translate/translate";

export async function translateText(
  text: string,
  from: string,
  to: string,
): Promise<string> {
  const response = await axios.post<SimplyTranslateResponse>(
    TRANSLATE_ENDPOINT,
    { text, from, to },
    { headers: { "Content-Type": "application/json" } },
  );
  return response.data.result;
}

export async function batchTranslate(
  lines: Array<{ lyric: string; key: string }>,
  from: string,
  to: string,
  onProgress?: (current: number, total: number) => void,
): Promise<Record<string, string>> {
  const translations: Record<string, string> = {};
  for (let i = 0; i < lines.length; i++) {
    const { lyric, key } = lines[i]!;
    if (!lyric.trim() || (lyric.includes("[") && lyric.includes("]"))) {
      continue;
    }
    try {
      translations[key] = await translateText(lyric, from, to);
      onProgress?.(i + 1, lines.length);
      if (i < lines.length - 1) {
        await new Promise((r) => setTimeout(r, 700));
      }
    } catch {
      // skip failed translations
    }
  }
  return translations;
}
