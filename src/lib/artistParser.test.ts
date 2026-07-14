import { describe, it, expect } from 'vitest';
import { getArtistName } from './artistParser';

describe('getArtistName', () => {
  it('splits on feat. and ft.', () => {
    expect(getArtistName('Artist A feat. Artist B')).toEqual(['Artist A', 'Artist B']);
    expect(getArtistName('Artist A ft. Artist B')).toEqual(['Artist A', 'Artist B']);
  });

  it('splits on & with trimmed whitespace', () => {
    expect(getArtistName('Artist A & Artist B')).toEqual(['Artist A', 'Artist B']);
    expect(getArtistName('  Artist A  feat.  Artist B  ')).toEqual(['Artist A', 'Artist B']);
  });

  it('handles multiple separators recursively', () => {
    expect(getArtistName('Artist A feat. Artist B & Artist C')).toEqual(['Artist A', 'Artist B', 'Artist C']);
  });
});
