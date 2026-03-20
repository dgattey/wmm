"use client";

import { useCallback, useEffect, useState } from "react";
import { parseCSV } from "@/lib/parseCSV";
import {
  listStoredPortfolios,
  removeStoredPortfolio,
  saveUploadedPortfolio,
  updateStoredPortfolioName,
} from "@/lib/storage";
import type { StoredPortfolioSummary } from "@/lib/types";

export interface UploadPortfoliosResult {
  uploadedPortfolios: StoredPortfolioSummary[];
  failedUploads: Array<{ fileName: string; reason: string }>;
}

export interface UploadFilesOptions {
  /**
   * Runs after each file is parsed and persisted, before the library list refreshes.
   * Return true to skip `refreshLibrary` (e.g. immediate client navigation away from home).
   */
  onPersistedBeforeRefresh?: (
    result: UploadPortfoliosResult
  ) => boolean | void;
}

export function usePortfolioLibrary() {
  const [portfolios, setPortfolios] = useState<StoredPortfolioSummary[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshLibrary = useCallback(async () => {
    setPortfolios(await listStoredPortfolios());
  }, []);

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  const uploadFiles = useCallback(
    async (
      files: File[],
      options?: UploadFilesOptions
    ): Promise<UploadPortfoliosResult> => {
      setIsUploading(true);
      setError(null);

      const uploadedPortfolios: StoredPortfolioSummary[] = [];
      const failedUploads: Array<{ fileName: string; reason: string }> = [];

      try {
        for (const file of files) {
          try {
            const positions = parseCSV(await file.text());
            uploadedPortfolios.push(
              await saveUploadedPortfolio({
                sourceFileName: file.name,
                positions,
              })
            );
          } catch (nextError) {
            failedUploads.push({
              fileName: file.name,
              reason:
                nextError instanceof Error
                  ? nextError.message
                  : "Failed to parse CSV file",
            });
          }
        }

        const result: UploadPortfoliosResult = {
          uploadedPortfolios,
          failedUploads,
        };
        const skipLibraryRefresh =
          options?.onPersistedBeforeRefresh?.(result) === true;

        if (!skipLibraryRefresh) {
          await refreshLibrary();
        }

        if (failedUploads.length > 0) {
          setError(
            failedUploads
              .map(({ fileName, reason }) => `${fileName}: ${reason}`)
              .join(" | ")
          );
        } else if (uploadedPortfolios.length === 0) {
          setError("Select at least one Fidelity positions CSV.");
        }

        return result;
      } finally {
        setIsUploading(false);
      }
    },
    [refreshLibrary]
  );

  const removePortfolioById = useCallback(
    async (portfolioId: string) => {
      const nextPortfolioId = await removeStoredPortfolio(portfolioId);
      await refreshLibrary();
      return nextPortfolioId;
    },
    [refreshLibrary]
  );

  const renamePortfolio = useCallback(
    async (portfolioId: string, name: string) => {
      await updateStoredPortfolioName(portfolioId, name);
      await refreshLibrary();
    },
    [refreshLibrary]
  );

  return {
    portfolios,
    isUploading,
    error,
    setError,
    refreshLibrary,
    uploadFiles,
    removePortfolioById,
    renamePortfolio,
  };
}
