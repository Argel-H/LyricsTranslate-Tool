import { LRC_LINE_KEY_PREFIX, LRC_LINE_KEY_PADDING } from "@/lib/constants";

export function generateNextLyricLineKey(existingKeys: string[]): string {
  return LRC_LINE_KEY_PREFIX + String(existingKeys.length).padStart(LRC_LINE_KEY_PADDING, "0");
}
