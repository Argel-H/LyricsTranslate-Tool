import { describe, it, expect } from 'vitest';
import { parseArtistTitle } from './artistTitleParser';

describe('parseArtistTitle', () => {
  it('splits "Artist - Title" on the " - " separator', () => {
    expect(parseArtistTitle('Sub Urban - Smoke & Mirrors')).toEqual({
      artistName: 'Sub Urban',
      trackName: 'Smoke & Mirrors',
    });
  });

  it('splits a simple "Artist A - Track" string', () => {
    expect(parseArtistTitle('Artist A - Track')).toEqual({
      artistName: 'Artist A',
      trackName: 'Track',
    });
  });

  it('returns the whole string as trackName when there is no separator', () => {
    expect(parseArtistTitle('No Separator Here')).toEqual({
      artistName: '',
      trackName: 'No Separator Here',
    });
  });

  it('does not split when the separator is at index 0', () => {
    expect(parseArtistTitle(' - LeadingDash')).toEqual({
      artistName: '',
      trackName: '- LeadingDash',
    });
  });

  it('splits on the first separator and preserves " - " in the track name', () => {
    expect(parseArtistTitle('Artist - Track - Remix')).toEqual({
      artistName: 'Artist',
      trackName: 'Track - Remix',
    });
  });
});
