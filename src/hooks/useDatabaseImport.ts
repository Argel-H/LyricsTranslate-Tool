import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { importDatabase } from "@/lib/dbBackup";
import { useI18n } from "@/hooks/useI18n";
import { useInterval } from "@/hooks/useInterval";

export type ImportState =
  | "idle"
  | "confirming"
  | "importing"
  | "success"
  | "error";

export type BackupValidation =
  | { ok: true; count: number }
  | { ok: false };

const COUNTDOWN_TICK_MS = 100;
const COUNTDOWN_STEP = 0.1;
const COUNTDOWN_START = 5;

// Mirrors the structural check in `importDatabase` so we can confirm before touching the DB.
export function validateBackupFile(text: string): BackupValidation {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false };
  }

  if (!data || typeof data !== "object") {
    return { ok: false };
  }

  const parsed = data as Record<string, unknown>;
  if (!Array.isArray(parsed.projects)) {
    return { ok: false };
  }

  return { ok: true, count: parsed.projects.length };
}

export interface UseDatabaseImportOptions {
  onComplete: () => void;
}

export interface UseDatabaseImportResult {
  importState: ImportState;
  pendingCount: number;
  importedCount: number;
  errorMessage: string;
  countdown: number;
  selectFile: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  confirmImport: () => Promise<void>;
  reset: () => void;
}

export function useDatabaseImport(
  options: UseDatabaseImportOptions,
): UseDatabaseImportResult {
  const { t } = useI18n();

  const [importState, setImportState] = useState<ImportState>("idle");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(COUNTDOWN_START);

  // Callers commonly pass an inline arrow, so keep the callback out of deps.
  const onCompleteRef = useRef(options.onComplete);
  useEffect(() => {
    onCompleteRef.current = options.onComplete;
  });

  // Guarantees onComplete fires once per import even if the effect re-runs.
  const hasCompletedRef = useRef(false);

  const selectFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset so the same file can be re-selected later.
      e.target.value = "";

      try {
        const text = await file.text();
        const validation = validateBackupFile(text);

        if (!validation.ok) {
          setImportState("error");
          setErrorMessage(t("settings.importInvalidFile"));
          return;
        }

        setPendingFile(file);
        setPendingCount(validation.count);
        setImportState("confirming");
      } catch {
        setImportState("error");
        setErrorMessage(t("settings.importInvalidFile"));
      }
    },
    [t],
  );

  const confirmImport = useCallback(async () => {
    const file = pendingFile;
    if (!file) return;

    setImportState("importing");
    hasCompletedRef.current = false;

    try {
      const result = await importDatabase(file);
      setImportedCount(result.projectCount);
      setCountdown(COUNTDOWN_START);
      setImportState("success");
      setPendingFile(null);
    } catch (err) {
      console.error("Import failed:", err);
      setImportState("error");
      setErrorMessage(t("settings.importInvalidFile"));
      setPendingFile(null);
    }
  }, [pendingFile, t]);

  const reset = useCallback(() => {
    setImportState("idle");
    setPendingFile(null);
    setErrorMessage("");
    hasCompletedRef.current = false;
  }, []);

  const isCountingDown = importState === "success" && countdown > 0;

  useInterval(
    () => {
      setCountdown((prev) => {
        const next = Math.max(0, prev - COUNTDOWN_STEP);
        return Math.round(next * 10) / 10;
      });
    },
    isCountingDown ? COUNTDOWN_TICK_MS : null,
  );

  useEffect(() => {
    if (importState !== "success" || countdown > 0) return;
    if (hasCompletedRef.current) return;

    hasCompletedRef.current = true;
    onCompleteRef.current();
  }, [importState, countdown]);

  return {
    importState,
    pendingCount,
    importedCount,
    errorMessage,
    countdown,
    selectFile,
    confirmImport,
    reset,
  };
}
