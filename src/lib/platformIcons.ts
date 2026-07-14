import type { IconType } from "react-icons";
import {
  SiApplemusic,
  SiDeezer,
  SiFacebook,
  SiInstagram,
  SiSoundcloud,
  SiSpotify,
  SiTidal,
  SiTiktok,
  SiX,
  SiYoutube,
} from "react-icons/si";
import { FaGlobe, FaAmazon } from "react-icons/fa";

/** Resolves a platform name to its icon component. */
export function getPlatformIcon(platform: string): IconType {
  const lower = platform.toLowerCase();

  if (lower.includes("apple")) return SiApplemusic;
  if (lower.includes("deezer")) return SiDeezer;
  if (lower.includes("facebook")) return SiFacebook;
  if (lower.includes("instagram")) return SiInstagram;
  if (lower.includes("soundcloud")) return SiSoundcloud;
  if (lower.includes("spotify")) return SiSpotify;
  if (lower.includes("tidal")) return SiTidal;
  if (lower.includes("tiktok")) return SiTiktok;
  if (lower.includes("twitter") || lower.includes("x")) return SiX;
  if (lower.includes("youtube")) return SiYoutube;
  if (lower.includes("amazon")) return FaAmazon;
  if (lower.includes("website")) return FaGlobe;

  return FaGlobe;
}

export const PLATFORMS = [
  { label: "Spotify", icon: SiSpotify },
  { label: "Apple Music", icon: SiApplemusic },
  { label: "Deezer", icon: SiDeezer },
  { label: "YouTube", icon: SiYoutube },
  { label: "SoundCloud", icon: SiSoundcloud },
  { label: "Tidal", icon: SiTidal },
  { label: "Amazon Music", icon: FaAmazon },
  { label: "Instagram", icon: SiInstagram },
  { label: "Twitter/X", icon: SiX },
  { label: "TikTok", icon: SiTiktok },
  { label: "Facebook", icon: SiFacebook },
  { label: "Website", icon: FaGlobe },
];
