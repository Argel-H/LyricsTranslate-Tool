import type { Project, ProjectCreateInput, LyricLine } from "@/types/project";
import {
  SHARE_VERSION,
  LANGUAGE_NAME_TO_ID,
  LANGUAGE_DICT,
  PLATFORM_NAME_TO_DEF,
  PLATFORM_BY_ID,
  STREAMING_KEY_TO_PLATFORM_ID,
  PLATFORM_ID_TO_STREAMING_KEY,
  getShareBaseUrl,
} from "@/types/share";
import type { PlatformDef } from "@/types/share";
import { BinaryWriter } from "@/lib/share/binary/BinaryWriter";
import { BinaryReader } from "@/lib/share/binary/BinaryReader";
import { brotliCompress, brotliDecompress, inflateDecompress } from "@/lib/share/compressionUtils";
import { arrayBufferToBase64URL, base64URLToArrayBuffer } from "@/lib/share/base64Utils";
import { stripShareBase } from "@/lib/share/shareRouting";
import { stripUrlPrefix, reconstructUrl } from "@/lib/share/urlTemplateUtils";
import { buildLyricsBuffer, parseLyricsBuffer } from "@/lib/share/transcoder/lyrics";
import { API } from "@/lib/config/apiConfig";

// ═══════════════════════════════════════════════════════════════════════
// Encode — private helpers
// ═══════════════════════════════════════════════════════════════════════

function writeHeader(writer: BinaryWriter, project: Project): void {
  writer.writeU8(SHARE_VERSION);

  const origId = LANGUAGE_NAME_TO_ID[project.originLanguage ?? ""] ?? 0;
  const transId = LANGUAGE_NAME_TO_ID[project.translationLanguage ?? ""] ?? 0;
  writer.writeU8(((origId & 0x0f) << 4) | (transId & 0x0f));

  writer.writeStr1B(project.trackName);
  writer.writeStr1B(project.albumName);
  writer.writeStr1B(project.isrcs);
  writer.writeStr2B(project.songLinkUrl);
  writer.writeStr2B(project.audioUrl);
  writer.writeStr2B(project.coverUrl);
  writer.writeI16LE(project.syncOffsetMs ?? 0);
}

function writeArtistSection(writer: BinaryWriter, project: Project, artistName: string): void {
  const sizeOffset = writer.position;
  writer.writeU24LE(0xffffff);

  writer.writeStr1B(artistName);

  const links: Array<{ platformDef: PlatformDef; url: string }> = [];

  if (project.artistLinks) {
    for (const al of project.artistLinks) {
      if (al.name === artistName) {
        const pd = PLATFORM_NAME_TO_DEF["Deezer"];
        if (pd) links.push({ platformDef: pd, url: al.url });
      }
    }
  }

  if (project.recommendedSocialLinks) {
    for (const sl of project.recommendedSocialLinks) {
      if (!sl.artistName || sl.artistName === artistName) {
        let pd = PLATFORM_NAME_TO_DEF[sl.platform];
        if (!pd) pd = PLATFORM_NAME_TO_DEF[sl.platform.toLowerCase()];
        if (pd) links.push({ platformDef: pd, url: sl.url });
      }
    }
  }

  const validLinks = links.filter(({ platformDef, url }) => {
    if (platformDef.isFullUrl) return true;
    return stripUrlPrefix(platformDef, url, "artist") !== null;
  });

  writer.writeU8(((validLinks.length & 0x0f) << 4) | 0);

  for (const { platformDef, url } of validLinks) {
    if (platformDef.isFullUrl) {
      writer.writeU8(((platformDef.id & 0x0f) << 4) | 0x08);
      writer.writeStr1B(url);
    } else {
      const stripped = stripUrlPrefix(platformDef, url, "artist")!;
      writer.writeU8(((platformDef.id & 0x0f) << 4) | 0x00);
      writer.writeStr1B(stripped);
    }
  }

  const sectionSize = writer.position - sizeOffset - 3;
  writer.patchU24LE(sizeOffset, sectionSize);
}

function writeStreamingSites(writer: BinaryWriter, project: Project): void {
  const streamEntries: Array<{ platformId: number; url: string }> = [];
  if (project.streamingSites) {
    for (const [key, url] of Object.entries(project.streamingSites)) {
      if (url === null || url === undefined) continue;
      const pid = STREAMING_KEY_TO_PLATFORM_ID[key];
      if (pid === undefined) continue;
      streamEntries.push({ platformId: pid, url });
    }
  }

  writer.writeU8(streamEntries.length);

  for (const { platformId, url } of streamEntries) {
    writer.writeU8(((platformId & 0x0f) << 4) | 0x00);

    let storedId = url;
    const pd = PLATFORM_BY_ID[platformId];
    if (pd && !pd.isFullUrl) {
      const stripped = stripUrlPrefix(pd, url, "track");
      if (stripped !== null) storedId = stripped;
    }

    writer.writeStr1B(storedId);
  }
}

function writeTimestamps(writer: BinaryWriter, project: Project): void {
  writer.writeStr1B(project.createdAt.toString());
  writer.writeStr1B(project.updatedAt.toString());
  writer.writeStr1B(Date.now().toString());
}

function writeLyrics(writer: BinaryWriter, project: Project): void {
  const sortedLyrics = Object.values(project.lyrics).sort((a, b) => a.time_start - b.time_start);
  writer.writeU16LE(sortedLyrics.length);
  if (sortedLyrics.length > 0) {
    writer.writeBytes(new Uint8Array(buildLyricsBuffer(sortedLyrics)));
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Decode — private helpers
// ═══════════════════════════════════════════════════════════════════════

function readHeader(reader: BinaryReader): {
  version: number;
  useNewFormat: boolean;
  originLanguage: string;
  translationLanguage: string;
  trackName: string;
  albumName: string | undefined;
  isrcs: string | undefined;
  songLinkUrl: string | undefined;
  audioUrl: string | undefined;
  coverUrl: string | undefined;
  syncOffsetMs: number | undefined;
} {
  const version = reader.readU8();
  const useNewFormat = version === SHARE_VERSION;
  if (version !== 0x02 && !useNewFormat) {
    throw new Error(`Unsupported share version: ${version}. Expected 0x02 or ${SHARE_VERSION}.`);
  }

  const langByte = reader.readU8();
  const originLanguage = LANGUAGE_DICT[(langByte >> 4) & 0xf] ?? "";
  const translationLanguage = LANGUAGE_DICT[langByte & 0xf] ?? "";

  const trackName = reader.readStr1B();
  const albumName = reader.readStr1B() || undefined;
  const isrcs = reader.readStr1B() || undefined;
  const songLinkUrl = reader.readStr2B() || undefined;
  const audioUrl = reader.readStr2B() || undefined;
  const coverUrl = reader.readStr2B() || undefined;

  const syncOffsetMsRaw = reader.readI16LE();
  const syncOffsetMs = syncOffsetMsRaw !== 0 ? syncOffsetMsRaw : undefined;

  return { version, useNewFormat, originLanguage, translationLanguage, trackName, albumName, isrcs, songLinkUrl, audioUrl, coverUrl, syncOffsetMs };
}

function readArtistSection(
  reader: BinaryReader,
): { artistNameList: string[]; artistLinks: Array<{ name: string; url: string }>; recommendedSocialLinks: Array<{ platform: string; url: string; artistName?: string }> } {
  const artistNameList: string[] = [];
  const artistLinks: Array<{ name: string; url: string }> = [];
  const recommendedSocialLinks: Array<{ platform: string; url: string; artistName?: string }> = [];

  const artistCountByte = reader.readU8();
  const artistCount = (artistCountByte >> 4) & 0xf;

  for (let i = 0; i < artistCount; i++) {
    const sectionSize = reader.readU24LE();
    const sectionEnd = reader.position + sectionSize;
    const name = reader.readStr1B();
    artistNameList.push(name);

    const linkCount = (reader.readU8() >> 4) & 0xf;

    for (let j = 0; j < linkCount; j++) {
      const typeByte = reader.readU8();
      const platformId = (typeByte >> 4) & 0xf;
      const isFullUrl = (typeByte & 0x8) !== 0;
      const linkData = reader.readStr1B();

      const pd = PLATFORM_BY_ID[platformId];
      if (!pd) continue;

      let fullUrl: string;
      if (isFullUrl) {
        fullUrl = linkData;
      } else {
        const reconstructed = reconstructUrl(pd, linkData, "artist");
        if (reconstructed === null) continue;
        fullUrl = reconstructed;
      }

      if (pd.name === "Deezer") {
        artistLinks.push({ name, url: fullUrl });
      } else {
        recommendedSocialLinks.push({ platform: pd.name, url: fullUrl, artistName: name });
      }
    }

    reader.seek(sectionEnd);
  }

  return { artistNameList, artistLinks, recommendedSocialLinks };
}

function readStreamingSites(reader: BinaryReader): Record<string, string | null> {
  const streamingSites: Record<string, string | null> = {};
  const streamCount = reader.readU8();

  for (let i = 0; i < streamCount; i++) {
    const typeByte = reader.readU8();
    const platformId = (typeByte >> 4) & 0xf;
    const linkData = reader.readStr1B();

    const pd = PLATFORM_BY_ID[platformId];
    if (!pd) continue;

    const fullUrl = pd.isFullUrl ? linkData : (reconstructUrl(pd, linkData, "track") ?? linkData);

    const streamingKey = PLATFORM_ID_TO_STREAMING_KEY[platformId];
    streamingSites[streamingKey ?? pd.name.toLowerCase()] = fullUrl;
  }

  return streamingSites;
}

function readLyrics(reader: BinaryReader, rowCount: number, useNewFormat: boolean): Record<string, LyricLine> {
  const lyrics: Record<string, LyricLine> = {};
  const decoder = new TextDecoder();

  if (useNewFormat) {
    if (rowCount > 0) {
      const lyricsData = reader.readBytes(reader.remaining);
      const parsed = parseLyricsBuffer(rowCount, lyricsData);
      for (let i = 0; i < parsed.length; i++) {
        lyrics[`lrc_${String(i).padStart(2, "0")}`] = parsed[i];
      }
    }
  } else {
    let prevTimeStart = 0;
    for (let i = 0; i < rowCount; i++) {
      let time_start: number;
      if (i === 0) time_start = reader.readU32LE();
      else { const delta = reader.readU16LE(); time_start = prevTimeStart + delta; }
      prevTimeStart = time_start;
      const duration = reader.readU16LE();
      const time_end = time_start + duration;

      const lyricLenByte = reader.readU8();
      const locked = (lyricLenByte & 0x80) !== 0;
      const lyricLen = lyricLenByte & 0x7f;
      const transLen = reader.readU8();
      const lyric = decoder.decode(reader.readBytes(lyricLen));
      const translation = decoder.decode(reader.readBytes(transLen));

      lyrics[`lrc_${String(i).padStart(2, "0")}`] = { time_start, time_end, lyric, translation, locked };
    }
  }

  return lyrics;
}

// ═══════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════

export async function encodeShareUrl(project: Project): Promise<string> {
  const writer = new BinaryWriter();

  writeHeader(writer, project);

  const artists = project.artistName ?? [];
  writer.writeU8(((artists.length & 0x0f) << 4) | 0);

  for (const artistName of artists) {
    writeArtistSection(writer, project, artistName);
  }

  writeStreamingSites(writer, project);
  writeTimestamps(writer, project);
  writeLyrics(writer, project);

  const finalBuffer = writer.toArrayBuffer();
  const compressed = await brotliCompress(finalBuffer);
  const base64 = arrayBufferToBase64URL(compressed);

  return getShareBaseUrl() + base64;
}

export async function decodeShareUrl(urlOrData: string): Promise<ProjectCreateInput> {
  const data = stripShareBase(urlOrData);
  const compressed = base64URLToArrayBuffer(data);

  let decompressed: ArrayBuffer;
  try {
    decompressed = await brotliDecompress(compressed);
  } catch {
    decompressed = await inflateDecompress(compressed);
  }

  const reader = new BinaryReader(decompressed);

  const header = readHeader(reader);

  const { artistNameList, artistLinks, recommendedSocialLinks } = readArtistSection(reader);

  const streamingSites = readStreamingSites(reader);

  // Advance cursor past createdAt, updatedAt, and encodedAt strings
  reader.readStr1B();
  reader.readStr1B();
  reader.readStr1B();

  const rowCount = reader.readU16LE();
  const lyrics = readLyrics(reader, rowCount, header.useNewFormat);

  return {
    artistName: artistNameList,
    trackName: header.trackName,
    lyrics,
    coverUrl: header.coverUrl,
    isrcs: header.isrcs,
    streamingSites,
    originLanguage: header.originLanguage || undefined,
    translationLanguage: header.translationLanguage || undefined,
    albumName: header.albumName,
    songLinkUrl: header.songLinkUrl,
    artistLinks: artistLinks.length > 0 ? artistLinks : undefined,
    recommendedSocialLinks: recommendedSocialLinks.length > 0 ? recommendedSocialLinks : undefined,
    audioUrl: header.audioUrl,
    syncOffsetMs: header.syncOffsetMs,
  };
}

/**
 * Encodes a project, creates a short share on the KV worker, and returns
 * the short ID (the final path segment after the share base URL).
 */
export async function createShortShareUrl(project: Project): Promise<string> {
  const fullUrl = await encodeShareUrl(project);
  const rawData = stripShareBase(fullUrl);
  const shareResult = await createShare(rawData);
  return shareResult.split("/").pop() || shareResult;
}

// ═══════════════════════════════════════════════════════════════════════
// KV worker share helpers
// ═══════════════════════════════════════════════════════════════════════

/** Creates a share on the KV worker and returns a short URL. */
export async function createShare(rawData: string): Promise<string> {
  const res = await fetch(API.share, {
    method: "POST",
    body: rawData,
    headers: { "Content-Type": "text/plain" },
  });
  if (!res.ok) throw new Error(`Share creation failed: ${res.status}`);
  const shareUrl = (await res.text()).trim();
  return `${getShareBaseUrl()}${shareUrl.split("/").pop() || shareUrl}`;
}

/** Fetches raw share data from the KV worker by its ID. */
export async function fetchShare(id: string): Promise<string> {
  const encodedId = encodeURIComponent(id);
  const res = await fetch(`${API.proxy}/share/${encodedId}`);
  if (!res.ok) throw new Error("Share not found or expired");
  return (await res.text()).trim();
}
