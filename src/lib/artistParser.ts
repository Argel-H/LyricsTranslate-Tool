export function getArtistName(artistName: string): string[] {
  const joinPhrases: RegExp[] = [
    /\sfeat\.\s/i,
    /\sft\.\s/i,
    /\s&\s/,
    /,\s*/,
  ];

  let matchedPhrase: RegExp | null = null;
  for (const pattern of joinPhrases) {
    if (pattern.test(artistName)) {
      matchedPhrase = pattern;
      break;
    }
  }

  const parts = matchedPhrase
    ? artistName.split(matchedPhrase).map((part) => part.trim())
    : [artistName.trim()];

  const finalParts: string[] = [];
  for (const part of parts) {
    if (/\s&\s/.test(part)) {
      finalParts.push(...part.split(/\s&\s/).map((p) => p.trim()));
    } else {
      finalParts.push(part);
    }
  }

  return finalParts.filter((part) => part.length > 0);
}
