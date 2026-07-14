import { describe, it, expect } from 'vitest';
import { stripUrlPrefix, reconstructUrl } from '@/lib/share/urlTemplateUtils';
import { PLATFORM_BY_ID } from '@/types/share';

describe('urlTemplateUtils', () => {
  const deezer = PLATFORM_BY_ID[1];
  const website = PLATFORM_BY_ID[0];

  describe('stripUrlPrefix', () => {
    it('strips known artist URL prefix', () => {
      expect(stripUrlPrefix(deezer, 'https://www.deezer.com/artist/647650', 'artist')).toBe('647650');
    });

    it('returns null for non-matching URL', () => {
      expect(stripUrlPrefix(deezer, 'https://open.spotify.com/artist/123', 'artist')).toBeNull();
    });

    it('returns full URL for Website platform', () => {
      expect(stripUrlPrefix(website, 'https://example.com', 'artist')).toBe('https://example.com');
    });
  });

  describe('reconstructUrl', () => {
    it('reconstructs artist URL from ID', () => {
      expect(reconstructUrl(deezer, '647650', 'artist')).toBe('https://www.deezer.com/artist/647650');
    });

    it('round-trips: strip then reconstruct', () => {
      const url = 'https://www.deezer.com/artist/647650';
      const id = stripUrlPrefix(deezer, url, 'artist');
      expect(reconstructUrl(deezer, id!, 'artist')).toBe(url);
    });
  });
});
