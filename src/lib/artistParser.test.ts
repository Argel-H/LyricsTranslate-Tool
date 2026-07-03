import { describe, it, expect } from 'vitest';
import { getArtistName } from './artistParser';

describe('getArtistName', () => {
  it('splits on " feat. "', () => {
    expect(getArtistName('Artist A feat. Artist B')).toEqual(['Artist A', 'Artist B']);
  });

  it('splits on " ft. "', () => {
    expect(getArtistName('Artist A ft. Artist B')).toEqual(['Artist A', 'Artist B']);
  });

  it('splits on " & "', () => {
    expect(getArtistName('Artist A & Artist B')).toEqual(['Artist A', 'Artist B']);
  });

  it('splits on " , " with surrounding spaces', () => {
    expect(getArtistName('Artist A , Artist B')).toEqual(['Artist A', 'Artist B']);
  });

  it('returns single artist when no separator is found', () => {
    expect(getArtistName('Solo Artist')).toEqual(['Solo Artist']);
  });

  it('filters empty strings from result', () => {
    expect(getArtistName('Artist A feat. ')).toEqual(['Artist A']);
  });

  it('handles multiple separators with recursive & splitting', () => {
    expect(getArtistName('Artist A feat. Artist B & Artist C')).toEqual(['Artist A', 'Artist B', 'Artist C']);
  });

  it('trims whitespace around names', () => {
    expect(getArtistName('  Artist A  feat.  Artist B  ')).toEqual(['Artist A', 'Artist B']);
  });
});
