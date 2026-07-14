import { describe, it, expect } from 'vitest';
import { encodeShareUrl, decodeShareUrl } from '@/lib/share/shareProtocol';
import { getShareBaseUrl } from '@/types/share';
import type { Project, LyricLine } from '@/types/project';
import { makeProject } from '@/test/factories/project';

function makeRichProject(overrides: Partial<Project> = {}): Project {
  const lyrics: Record<string, LyricLine> = {};
  const lines: Array<[number, number, string, string, boolean?]> = [
    [0, 16300, 'Hello world', 'Hola mundo', true],
    [16300, 19790, 'This is a test', 'Esto es una prueba'],
    [20000, 25000, 'Another line', 'Otra línea', true],
    [25000, 30000, 'More lyrics here', 'Más letras aquí'],
    [30000, 35000, 'Final line', 'Línea final'],
  ];
  lines.forEach(([start, end, lyric, trans, locked], i) => {
    const key = `lrc_${String(i).padStart(2, '0')}`;
    lyrics[key] = { time_start: start, time_end: end, lyric, translation: trans, locked };
  });

  return makeProject({
    id: 12345,
    title: 'Test Artist - Test Song',
    trackName: 'Test Song',
    lyrics,
    coverUrl: 'https://example.com/cover.jpg',
    isrcs: 'USAT22503458',
    streamingSites: {
      deezer: 'https://www.deezer.com/track/3410672871',
      spotify: null, appleMusic: null, youtube: null, amazonMusic: null, soundcloud: null, tidal: null,
    },
    originLanguage: 'English',
    translationLanguage: 'Spanish',
    albumName: 'Test Album',
    songLinkUrl: 'https://www.deezer.com/track/3410672871',
    artistLinks: [{ name: 'Test Artist', url: 'https://www.deezer.com/artist/647650' }],
    recommendedSocialLinks: [
      { platform: 'Spotify', url: 'https://open.spotify.com/artist/testid', artistName: 'Test Artist' },
      { platform: 'Instagram', url: 'https://www.instagram.com/testartist/', artistName: 'Test Artist' },
      { platform: 'YouTube', url: 'https://www.youtube.com/channel/testchannel', artistName: 'Test Artist' },
      { platform: 'Website', url: 'https://www.testartist.com/', artistName: 'Test Artist' },
    ],
    audioUrl: 'https://example.com/audio.mp3',
    syncOffsetMs: -500,
    createdAt: 1783661274730,
    updatedAt: 1783698293603,
    ...overrides,
  });
}

describe('shareProtocol', () => {
  it('round-trips all fields including syncOffsetMs and streaming sites', async () => {
    const project = makeRichProject({
      streamingSites: {
        deezer: 'https://www.deezer.com/track/3410672871',
        spotify: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
        appleMusic: 'https://music.apple.com/track/1234567890',
        youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
    });
    const url = await encodeShareUrl(project);
    expect(url).toContain(getShareBaseUrl());
    const decoded = await decodeShareUrl(url);

    expect(decoded.trackName).toBe(project.trackName);
    expect(decoded.artistName).toEqual(project.artistName);
    expect(decoded.albumName).toBe(project.albumName);
    expect(decoded.isrcs).toBe(project.isrcs);
    expect(decoded.coverUrl).toBe(project.coverUrl);
    expect(decoded.songLinkUrl).toBe(project.songLinkUrl);
    expect(decoded.audioUrl).toBe(project.audioUrl);
    expect(decoded.originLanguage).toBe(project.originLanguage);
    expect(decoded.translationLanguage).toBe(project.translationLanguage);
    expect(decoded.syncOffsetMs).toBe(project.syncOffsetMs);
    expect(decoded.streamingSites?.deezer).toBe('https://www.deezer.com/track/3410672871');
    expect(decoded.streamingSites?.spotify).toBe('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT');

    const decodedLyrics = Object.values(decoded.lyrics).sort((a, b) => a.time_start - b.time_start);
    const originalLyrics = Object.values(project.lyrics).sort((a, b) => a.time_start - b.time_start);
    expect(decodedLyrics.length).toBe(originalLyrics.length);
    for (let i = 0; i < originalLyrics.length; i++) {
      expect(decodedLyrics[i].time_start).toBe(originalLyrics[i].time_start);
      expect(decodedLyrics[i].time_end).toBe(originalLyrics[i].time_end);
      expect(decodedLyrics[i].lyric).toBe(originalLyrics[i].lyric);
      expect(decodedLyrics[i].translation).toBe(originalLyrics[i].translation);
      expect(decodedLyrics[i].locked).toBe(originalLyrics[i].locked ?? false);
    }
    expect(decoded.artistLinks?.length).toBeGreaterThanOrEqual(1);
    expect(decoded.recommendedSocialLinks?.length).toBeGreaterThanOrEqual(3);
  });

  it('handles null/optional fields gracefully', async () => {
    const project = makeRichProject({
      coverUrl: undefined, isrcs: undefined, albumName: undefined,
      songLinkUrl: undefined, audioUrl: undefined, syncOffsetMs: undefined,
      originLanguage: '', translationLanguage: '',
      artistLinks: [], recommendedSocialLinks: [], streamingSites: {},
    });
    const url = await encodeShareUrl(project);
    const decoded = await decodeShareUrl(url);
    expect(decoded.trackName).toBe(project.trackName);
    expect(decoded.coverUrl).toBeUndefined();
    expect(decoded.isrcs).toBeUndefined();
    expect(decoded.albumName).toBeUndefined();
    expect(decoded.originLanguage).toBeUndefined();
    expect(decoded.translationLanguage).toBeUndefined();
  });

  it('handles empty lyrics', async () => {
    const project = makeRichProject({ lyrics: {} });
    const url = await encodeShareUrl(project);
    const decoded = await decodeShareUrl(url);
    expect(Object.keys(decoded.lyrics).length).toBe(0);
  });

  it('handles multiple artists with links', async () => {
    const project = makeRichProject({
      artistName: ['Artist One', 'Artist Two'],
      artistLinks: [
        { name: 'Artist One', url: 'https://www.deezer.com/artist/111' },
        { name: 'Artist Two', url: 'https://www.deezer.com/artist/222' },
      ],
      recommendedSocialLinks: [
        { platform: 'Twitter/X', url: 'https://twitter.com/artistone', artistName: 'Artist One' },
        { platform: 'Facebook', url: 'https://www.facebook.com/artisttwo', artistName: 'Artist Two' },
      ],
    });
    const url = await encodeShareUrl(project);
    const decoded = await decodeShareUrl(url);
    expect(decoded.artistName).toEqual(['Artist One', 'Artist Two']);
    expect(decoded.artistLinks?.length).toBeGreaterThanOrEqual(1);
    expect(decoded.recommendedSocialLinks?.length).toBeGreaterThanOrEqual(1);
  });

  it('round-trips arbitrary-length lyric and translation text', async () => {
    const lyric127 = 'A'.repeat(127);
    const lyric128 = 'A'.repeat(128);
    const trans256 = 'B'.repeat(256);
    const lyrics: Record<string, LyricLine> = {
      lrc_00: { time_start: 0, time_end: 1000, lyric: lyric127, translation: 'OK' },
      lrc_01: { time_start: 1000, time_end: 2000, lyric: lyric128, translation: 'OK' },
      lrc_02: { time_start: 2000, time_end: 3000, lyric: 'OK', translation: trans256 },
    };
    const project = makeRichProject({ lyrics });
    const url = await encodeShareUrl(project);
    const decoded = await decodeShareUrl(url);
    const decodedLines = Object.values(decoded.lyrics).sort((a, b) => a.time_start - b.time_start);
    expect(decodedLines[0].lyric).toBe(lyric127);
    expect(decodedLines[1].lyric).toBe(lyric128);
    expect(decodedLines[2].translation).toBe(trans256);
  });

  it('rejects invalid data and malformed base64', async () => {
    await expect(decodeShareUrl('invalid-data!!!')).rejects.toThrow();
    await expect(decodeShareUrl(getShareBaseUrl() + '???')).rejects.toThrow();
  });

  it('round-trips syncOffsetMs (positive, negative large, and zero→undefined)', async () => {
    for (const offset of [250, -32768]) {
      const url = await encodeShareUrl(makeRichProject({ syncOffsetMs: offset }));
      const decoded = await decodeShareUrl(url);
      expect(decoded.syncOffsetMs).toBe(offset);
    }
    const urlZero = await encodeShareUrl(makeRichProject({ syncOffsetMs: 0 }));
    expect((await decodeShareUrl(urlZero)).syncOffsetMs).toBeUndefined();
  });

  it('round-trips instrumental [Chorus] lines and preserves locked count', async () => {
    const lyrics: Record<string, LyricLine> = {
      lrc_00: { time_start: 0, time_end: 15000, lyric: 'Intro verse', translation: 'Verso inicial', locked: true },
      lrc_01: { time_start: 15000, time_end: 30000, lyric: 'Second line here', translation: 'Segunda línea aquí', locked: false },
      lrc_02: { time_start: 30000, time_end: 45000, lyric: '[Chorus]', translation: '', locked: false },
      lrc_03: { time_start: 45000, time_end: 60000, lyric: 'Another lyric', translation: 'Otra letra', locked: true },
    };
    const project = makeRichProject({
      lyrics,
      artistName: ['Artist Alpha', 'Artist Beta'],
      streamingSites: {
        deezer: 'https://www.deezer.com/track/111222333',
        spotify: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
        appleMusic: 'https://music.apple.com/track/999888777',
      },
    });
    const url = await encodeShareUrl(project);
    const decoded = await decodeShareUrl(url);
    const chorusLine = Object.values(decoded.lyrics).find(l => l.lyric === '[Chorus]');
    expect(chorusLine).toBeDefined();
    expect(chorusLine!.time_start).toBe(30000);
    const lockedCount = Object.values(decoded.lyrics).filter(l => l.locked).length;
    expect(lockedCount).toBe(2);
  });
});
