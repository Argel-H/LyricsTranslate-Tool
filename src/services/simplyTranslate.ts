import { API } from "@/lib/apiConfig";
import type { AIProvider } from "@/lib/aiConfig";

interface AIConfig {
  provider: AIProvider;
  apiKey: string | undefined;
}

export interface AutoTranslateInput {
  songTitle: string;
  artistName: string;
  targetLanguage: string;
  /** Lines provided for LLM context — the LLM must NOT translate these */
  contextLines: Array<{ timestamp: string | number; original: string; translated?: string; locked?: boolean }>;
  /** Lines the LLM must translate */
  targetLines: Array<{ timestamp: string | number; original: string }>;
}

// ─── Prompt Building ───────────────────────────────────────────────

interface TranslationPromptContext {
  lrcContent: string;
  songTitle: string;
  artistName: string;
  targetLanguage: string;
}

function buildGenericRules(ctx: TranslationPromptContext): string[] {
  return [
    "You are a professional translator specialized in song localization.",
    `Your task is to translate the provided lyrics from the .lrc file into Neutral ${ctx.targetLanguage}.`,
    "",
    "Context:",
    `- Song Title: ${ctx.songTitle}`,
    `- Artist: ${ctx.artistName}`,
    "",
    "Instructions:",
    "1. Translate using an interpretative/communicative approach that feels poetic and singable. Prioritize natural rhythm and emotional impact over literal accuracy. The translation should read as if it was originally written in the target language.",
    `2. Use Neutral ${ctx.targetLanguage} that is natural and easy to understand for any speaker. Adapt slang and idioms to their closest culturally equivalent expression without forced literalism.`,
    "3. When consecutive lines form a continuous thought or sentence, make them flow seamlessly — do not force each line to stand alone if context connects them.",
    "4. Do NOT invent or insert words, adverbs, or time markers that are not present or clearly implied in the original lyric.",
    "5. When quoted speech or dialogue spans multiple lines, place quotation marks on all continuation lines, not just the first.",
    "6. Use connectors where they add emotional weight — do not strip them out just to save syllables.",
    "7. Vocalizations like 'yeah', 'oh', 'ooh' should be translated contextually depending on tone. Do not leave them in the source language.",
    "8. STRICTLY maintain the original .lrc time tags (e.g., [00:12.34]) exactly as they appear in the input. Do not alter, add, or remove any timestamps.",
    "9. Output ONLY the translated .lrc content. Do not include any introductory text, explanations, notes, or concluding remarks.",
  ];
}

function buildDeepSeekRules(ctx: TranslationPromptContext): string[] {
  return [
    "",
    `CRITICAL: you are translating song lyrics into ${ctx.targetLanguage}, not translating a document. Apply these rules:`,
    "- Use natural, idiomatic expressions appropriate for the target language. Avoid literal translations.",
    "- Match the emotional tone and intensity of the original lyrics. Use culturally appropriate intensifiers.",
    "- Keep lines short and rhythmic. Remove filler words where the original meaning is preserved without them.",
    "- Maintain vocalizations ('Ooh', 'Yeah', 'Ah') unless there is a clear cultural equivalent in the target language.",
    "- When the original uses slang or informal language, use equivalent informal register in the target language.",
    "- Final test: Read the translation out loud. Delete any line that sounds like machine translation.",
  ];
}

function buildTranslationPrompt(
  lrcContent: string,
  songTitle: string,
  artistName: string,
  targetLanguage: string,
  provider: AIProvider,
): string {
  const ctx: TranslationPromptContext = { lrcContent, songTitle, artistName, targetLanguage };
  const parts: string[] = [
    ...buildGenericRules(ctx),
  ];

  if (provider === "deepseek") {
    parts.push(...buildDeepSeekRules(ctx));
  }

  parts.push("", "Input .lrc:", lrcContent);
  return parts.join("\n");
}

// ─── AI Provider Calls ─────────────────────────────────────────────

export async function callGoogleGemini(prompt: string, apiKey: string): Promise<string | null> {
  const targetUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";
  const response = await fetch(`${API.proxy}/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Target-URL": targetUrl,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });
  if (!response.ok || response.status === 204) return null;
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

export async function callDeepSeek(prompt: string, apiKey: string): Promise<string | null> {
  const targetUrl = "https://api.deepseek.com/v1/chat/completions";
  const response = await fetch(`${API.proxy}/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Target-URL": targetUrl,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok || response.status === 204) return null;
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? null;
}

// ─── Auto-Translate Prompt Builder ─────────────────────────────────

/** Formats a timestamp (string or ms number) to LRC format MM:SS.xx */
function formatTimestamp(ts: string | number): string {
  if (typeof ts === "number") {
    const clamped = Math.max(0, ts);
    const minutes = Math.floor(clamped / 60000);
    const seconds = Math.floor((clamped % 60000) / 1000);
    const centiseconds = Math.floor((clamped % 1000) / 10);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
  }
  return ts;
}

export function buildAutoTranslatePrompt(input: AutoTranslateInput, provider: AIProvider): string {
  const ctx: TranslationPromptContext = {
    lrcContent: "", // not used in the new format
    songTitle: input.songTitle,
    artistName: input.artistName,
    targetLanguage: input.targetLanguage,
  };

  const parts: string[] = [...buildGenericRules(ctx)];
  if (provider === "deepseek") {
    parts.push(...buildDeepSeekRules(ctx));
  }

  // Context section
  parts.push("");
  parts.push("Context (DO NOT translate — use for consistency only):");
  if (input.contextLines.length > 0) {
    for (const line of input.contextLines) {
      const ts = formatTimestamp(line.timestamp);
      if (line.translated) {
        parts.push(`[${ts}] ${line.original} → ${line.translated}`);
      } else {
        parts.push(`[${ts}] ${line.original}`);
      }
    }
  } else {
    parts.push("(no context lines)");
  }

  // Target section
  parts.push("");
  parts.push("Lines to translate:");
  if (input.targetLines.length > 0) {
    for (const line of input.targetLines) {
      const ts = formatTimestamp(line.timestamp);
      parts.push(`[${ts}] ${line.original}`);
    }
  } else {
    parts.push("(no lines to translate — return empty)");
  }

  return parts.join("\n");
}

// ─── Public API ────────────────────────────────────────────────────

export async function translateLyrics(
  lrcContent: string,
  songTitle: string,
  artistName: string,
  targetLanguage: string,
  config: AIConfig,
): Promise<string | null> {
  try {
    if (!config.apiKey) return null;
    const prompt = buildTranslationPrompt(lrcContent, songTitle, artistName, targetLanguage, config.provider);
    if (config.provider === "google") {
      return await callGoogleGemini(prompt, config.apiKey);
    }
    return await callDeepSeek(prompt, config.apiKey);
  } catch (err) {
    console.error("translateLyrics error:", err);
    return null;
  }
}
