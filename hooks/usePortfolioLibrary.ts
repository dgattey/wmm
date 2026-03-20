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

export function usePortfolioLibrary() {
  const [portfolios, setPortfolios] = useState<StoredPortfolioSummary[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLibraryLoading, setIsLibraryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshLibrary = useCallback(async () => {
    setPortfolios(await listStoredPortfolios());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refreshLibrary();
      } finally {
        if (!cancelled) {
          setIsLibraryLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshLibrary]);

  const uploadFiles = useCallback(async (files: File[]) => {
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

      if (failedUploads.length > 0) {
        setError(
          failedUploads
            .map(({ fileName, reason }) => `${fileName}: ${reason}`)
            .join(" | ")
        );
      } else if (uploadedPortfolios.length === 0) {
        setError("Select at least one Fidelity positions CSV.");
      }

      return { uploadedPortfolios, failedUploads };
    } finally {
      setIsUploading(false);
    }
  }, []);

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
    isLibraryLoading,
    error,
    setError,
    refreshLibrary,
    uploadFiles,
    removePortfolioById,
    renamePortfolio,
  };
}
