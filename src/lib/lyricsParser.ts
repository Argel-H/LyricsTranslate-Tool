import type { LyricLine } from "@/types/project";

const HEX_TIMECODES: RegExp[] = [
  /\[(\d{2}:\d{2}\.\d{2,3})\]/,
  /\[(\d{2}:\d{2}:\d{2}\.\d{2,3})\]/,
];

interface LineItem {
  line: string;
  code: RegExp;
  timecode: string;
}

export function processLyricsMap(lyricsString: string): Map<string, LyricLine> | null {
  const lines = lyricsString.replaceAll("\n\n", "\n \n").split("\n");
  const lrcMap = new Map<string, LyricLine>();
  let timeStampFound = false;
  let noResultCount = 0;
  let loopNumber = 1;
  const hexLen = HEX_TIMECODES.length;
  let count = 0;

  const saveLineItem = ({ line, code, timecode }: LineItem) => {
    const newLine = line.replace(code, "");
    const lyric = newLine === " " ? newLine : newLine.trim();
    const key = `lrc_${String(count).padStart(2, "0")}`;
    lrcMap.set(key, {
      time_start: timecode,
      time_end: timecode,
      lyric,
      translation: "",
      comment: "",
    });
    count++;
  };

  for (const code of HEX_TIMECODES) {
    noResultCount = 0;
    if (timeStampFound) break;
    for (const line of lines) {
      const match = line.match(code);
      if (!match) {
        if (noResultCount >= 2 && hexLen !== loopNumber) break;
        if (hexLen === loopNumber) {
          saveLineItem({ line, code, timecode: "00:00.00" });
        } else {
          noResultCount++;
        }
      } else {
        saveLineItem({ line, code, timecode: match[1]! });
        timeStampFound = true;
      }
    }
    loopNumber++;
  }

  if (lrcMap.size === 0) return null;
  return lrcMap;
}
