import { useEffect, useState } from "react";
import type { ProjectCreateInput } from "@/types/project";
import type { I18nKey } from "@/i18n";
import { decodeShareUrl } from "@/lib/share/shareProtocol";
import { isPasteId } from "@/lib/share/shareRouting";
import { getCachedProject, setCachedProject } from "@/lib/share/shareCache";

export type SharedProjectStatus = "loading" | "ready" | "error";

export interface SharedProjectLoaderResult {
  status: SharedProjectStatus;
  project: ProjectCreateInput | null;
  errorKey: I18nKey | null;
}

/**
 * Encapsulates the shared project loading pipeline used by both
 * SharedProjectPage and ViewOnlyPage:
 *  1. Check the in-memory cache (getCachedProject).
 *  2. If data is a paste ID, fetch from the paste server.
 *  3. Decode the share URL payload.
 *  4. Cache on success.
 */
export function useSharedProjectLoader(data: string | undefined): SharedProjectLoaderResult {
  const [status, setStatus] = useState<SharedProjectStatus>(data ? "loading" : "error");
  const [project, setProject] = useState<ProjectCreateInput | null>(null);
  const [errorKey, setErrorKey] = useState<I18nKey | null>(data ? null : "share.missing");

  useEffect(() => {
    if (!data) {
      setStatus("error");
      setErrorKey("share.missing");
      return;
    }

    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const cached = getCachedProject(data!);
        if (cached) {
          if (!cancelled) {
            setProject(cached);
            setStatus("ready");
          }
          return;
        }

        let shareData = data!;
        if (isPasteId(shareData)) {
          try {
            const { fetchPasteShare } = await import("@/lib/share/shareProtocol");
            shareData = await fetchPasteShare(shareData);
          } catch {
            if (!cancelled) {
              setStatus("error");
              setErrorKey("share.expiredOrNotFound");
            }
            return;
          }
        }

        const input = await decodeShareUrl(shareData);
        if (!cancelled) {
          setCachedProject(data!, input);
          setProject(input);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setErrorKey("share.corrupt");
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [data]);

  return { status, project, errorKey };
}
