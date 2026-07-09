export const AI_PROVIDERS = [
  { value: null, label: "None" },
  { value: "google" as const, label: "Gemini (Google AI Studio)" },
  { value: "deepseek" as const, label: "DeepSeek" },
] as const;

export type AIProvider = (typeof AI_PROVIDERS)[number]["value"];
