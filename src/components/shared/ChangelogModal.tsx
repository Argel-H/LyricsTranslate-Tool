import { useEffect, useState } from "react";
import { Modal } from "@/features/shell/Modal";

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

interface ChangelogModalProps {
  open: boolean;
  onClose: () => void;
}

const CHANGELOG_URL =
  "https://raw.githubusercontent.com/Argel-H/LyricsTranslate-Tool/refs/heads/main/public/changelog.json";

export function ChangelogModal({ open, onClose }: ChangelogModalProps) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const fetchChangelog = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(CHANGELOG_URL);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data: ChangelogEntry[] = await res.json();

        if (!cancelled) {
          // Sort newest first by date descending
          const sorted = [...data].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );
          setEntries(sorted);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load changelog");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchChangelog();

    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Changelog">
      <div className="space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="ml-3 font-body-md text-on-surface-variant">
              Loading...
            </span>
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-error-container/20 border border-error/20 p-4">
            <p className="font-body-md text-error">{error}</p>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <p className="font-body-md text-on-surface-variant text-center py-8">
            No changelog entries available.
          </p>
        )}

        {!loading &&
          !error &&
          entries.map((entry) => (
            <div
              key={entry.version}
              className="bg-surface-container-highest rounded-2xl p-5 border border-outline-variant/10"
            >
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  v{entry.version}
                </h3>
                <span className="font-label-md text-on-surface-variant">
                  {entry.date}
                </span>
              </div>
              <ul className="space-y-1.5">
                {entry.changes.map((change, idx) => (
                  <li
                    key={idx}
                    className="font-body-md text-on-surface-variant flex items-start gap-2"
                  >
                    <span className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0" />
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>
    </Modal>
  );
}
