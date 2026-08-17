import type { LyricLine } from "@/types/project";
import { formatMillisecondsToTimestamp } from "@/lib/timeUtils";
import { getCommentForLine } from "@/lib/commentUtils";
import { Lock, MessageSquare } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { CommentMarkdown } from "@/features/editor/CommentMarkdown";

interface LyricsReadOnlyTableProps {
  lyricsEntries: [string, LyricLine][];
  activeLineKey: string | null;
  /** Precomputed lyric-text → comment map (see buildCommentIndex). */
  commentIndex: Map<string, string>;
}

export function LyricsReadOnlyTable({
  lyricsEntries,
  activeLineKey,
  commentIndex,
}: LyricsReadOnlyTableProps) {
  const { t } = useI18n();

  return (
    <div className="bg-surface-container-low rounded-[32px] overflow-visible flex flex-col shadow-lg border border-outline-variant/10">
      <div className="grid grid-cols-[120px_120px_1fr_1fr] gap-4 p-md bg-surface-container-low rounded-t-[32px] border-b border-outline-variant/20 sticky top-0 z-10 text-on-surface-variant font-label-md text-label-md uppercase tracking-widest px-6">
        <div className="px-2">{t("editor.table.start")}</div>
        <div className="px-2">{t("editor.table.end")}</div>
        <div className="px-2">{t("editor.table.lyric")}</div>
        <div className="px-2">{t("editor.table.translation")}</div>
      </div>
      <div className="flex flex-col p-4 gap-4">
        {lyricsEntries.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant font-body-lg">{t("editor.noLyrics")}</div>
        )}
        {lyricsEntries.map(([key, line]) => {
          const isAudioActive = activeLineKey === key;
          const comment = getCommentForLine(commentIndex, line.lyric);
          return (
            <div key={key} data-row-key={key} className={`grid grid-cols-[120px_120px_1fr_1fr] gap-4 p-md rounded-[24px] transition-all duration-200 relative ${
              isAudioActive
                ? "bg-primary/5"
                : line.locked
                  ? "bg-surface-container-highest/20"
                  : "hover:bg-surface-container-highest/30"
            }`}>
              {isAudioActive && (
                <div className="absolute left-0.5 top-6 bottom-6 w-1 bg-primary rounded-full animate-pulse" />
              )}
              <div className="font-mono text-body-md text-on-surface flex items-center px-2">{formatMillisecondsToTimestamp(line.time_start)}</div>
              <div className="font-mono text-body-md text-on-surface flex items-center px-2">{formatMillisecondsToTimestamp(line.time_end)}</div>
              <div className="flex items-center">
                <div className="w-full text-body-lg text-on-surface leading-relaxed flex flex-col items-start gap-2">
                  <div className="flex items-start gap-2">
                    <span className="whitespace-pre-wrap">{line.lyric}</span>
                    {line.locked && <Lock className="size-3.5 text-tertiary shrink-0 mt-0.5" />}
                  </div>
                  {comment?.trim() && (
                    <div className="flex items-start gap-1.5 text-on-surface-variant">
                      <MessageSquare className="size-3.5 shrink-0 mt-0.5 opacity-70" />
                      <CommentMarkdown
                        className="text-body-md leading-relaxed"
                        markdown={comment ?? ""}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center">
                {line.translation?.trim() ? (
                  <div className="flex-1 bg-surface-container border border-outline-variant rounded-3xl p-4 text-body-lg text-on-surface leading-relaxed min-h-[3rem]">{line.translation}</div>
                ) : !line.lyric?.trim() ? (
                  <div className="w-full text-body-lg text-on-surface leading-relaxed"> </div>
                ) : (
                  <div className="flex-1 bg-surface-container border border-outline-variant rounded-3xl p-4 text-body-lg text-on-surface-variant italic leading-relaxed min-h-[3rem]">{t("editor.translatePlaceholder")}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
