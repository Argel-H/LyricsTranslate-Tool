// ---------------------------------------------------------------------------
// URL Template Utilities
//
// Two functions for stripping and reconstructing platform URLs.
// Used by the share encoder/decoder to minimize payload size by storing
// only the variable ID portion of known URL patterns.
// ---------------------------------------------------------------------------

import type { PlatformDef } from "@/types/share";

/**
 * Strip the known URL prefix from a platform URL, returning only the
 * variable ID portion.
 *
 * - If `platformDef.isFullUrl` is true (e.g. Website), the URL cannot be
 *   reconstructed from an ID so the full URL is returned unchanged.
 * - Otherwise picks `artistUrlPrefix` or `trackUrlPrefix` based on `context`.
 * - If no prefix is defined for this context, returns `null`.
 * - If `fullUrl` starts with the prefix, returns the substring after it.
 * - If `fullUrl` does not start with the prefix, returns `null`.
 *
 * @param platformDef - The platform definition (from PLATFORM_DICT).
 * @param fullUrl     - The complete URL to strip.
 * @param context     - "artist" or "track" — chooses which prefix to use.
 * @returns The ID portion, the full URL (for isFullUrl), or null on failure.
 */
export function stripUrlPrefix(
  platformDef: PlatformDef,
  fullUrl: string,
  context: "artist" | "track",
): string | null {
  // Full URLs are stored as-is (e.g. personal website)
  if (platformDef.isFullUrl) {
    return fullUrl;
  }

  const prefix =
    context === "artist"
      ? platformDef.artistUrlPrefix
      : platformDef.trackUrlPrefix;

  // No prefix defined for this context (e.g. Genius has no track prefix)
  if (!prefix) {
    return null;
  }

  if (fullUrl.startsWith(prefix)) {
    return fullUrl.substring(prefix.length);
  }

  // URL doesn't match the expected prefix pattern
  return null;
}

/**
 * Reconstruct a full platform URL from a stored ID by prepending the
 * known URL prefix.
 *
 * - If `platformDef.isFullUrl` is true, `id` is treated as a complete URL
 *   and returned unchanged.
 * - Otherwise picks `artistUrlPrefix` or `trackUrlPrefix` based on `context`.
 * - If no prefix is defined for this context, returns `null`.
 *
 * @param platformDef - The platform definition (from PLATFORM_DICT).
 * @param id          - The ID portion (or full URL for isFullUrl).
 * @param context     - "artist" or "track" — chooses which prefix to use.
 * @returns The reconstructed full URL, or null if no prefix is available.
 */
export function reconstructUrl(
  platformDef: PlatformDef,
  id: string,
  context: "artist" | "track",
): string | null {
  // Full URLs are stored as-is
  if (platformDef.isFullUrl) {
    return id;
  }

  const prefix =
    context === "artist"
      ? platformDef.artistUrlPrefix
      : platformDef.trackUrlPrefix;

  // No prefix defined for this context
  if (!prefix) {
    return null;
  }

  return prefix + id;
}
