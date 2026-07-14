import axios from "axios";
import type { PlatformLinks } from "@/types/music";
import { API } from "@/lib/config/apiConfig";

const ODESLI_ENDPOINT = `${API.odesli}/v1-alpha.1/links`;

export interface OdesliResult {
  platforms: PlatformLinks;
  pageUrl?: string;
}

export async function fetchOdesliUrls(url: string): Promise<OdesliResult | null> {
  if (!url) return null;
  try {
    const response = await axios.get<{
      pageUrl?: string;
      linksByPlatform?: Record<string, { url?: string }>;
    }>(ODESLI_ENDPOINT, { params: { url } });
    const platforms = response.data?.linksByPlatform;
    return {
      pageUrl: response.data?.pageUrl,
      platforms: {
        deezer: platforms?.deezer?.url ?? null,
        appleMusic: platforms?.appleMusic?.url ?? null,
        spotify: platforms?.spotify?.url ?? null,
        youtube: platforms?.youtube?.url ?? null,
        amazonMusic: platforms?.amazonMusic?.url ?? null,
        soundcloud: platforms?.soundcloud?.url ?? null,
        tidal: platforms?.tidal?.url ?? null,
      },
    };
  } catch {
    return null;
  }
}
