"use client";

import { useCallback, useEffect, useState } from "react";
import { parseCSV } from "@/lib/parseCSV";
import {
  listStoredPortfolios,
  removeStoredPortfolio,
  saveUploadedPortfolio,
} from "@/lib/storage";
import type { StoredPortfolioSummary } from "@/lib/types";

export interface UploadPortfoliosResult {
  uploadedPortfolios: StoredPortfolioSummary[];
  failedUploads: Array<{ fileName: string; reason: string }>;
}

export function usePortfolioLibrary() {
  const [portfolios, setPortfolios] = useState<StoredPortfolioSummary[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshLibrary = useCallback(() => {
    setPortfolios(listStoredPortfolios());
  }, []);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  const uploadFiles = useCallback(async (files: File[]): Promise<UploadPortfoliosResult> => {
    setIsUploading(true);
    setError(null);

    const uploadedPortfolios: StoredPortfolioSummary[] = [];
    const failedUploads: Array<{ fileName: string; reason: string }> = [];

    try {
      for (const file of files) {
        try {
          const positions = parseCSV(await file.text());
          uploadedPortfolios.push(
            saveUploadedPortfolio({
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

      refreshLibrary();

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
  }, [refreshLibrary]);

  const removePortfolioById = useCallback(
    (portfolioId: string) => {
      const nextPortfolioId = removeStoredPortfolio(portfolioId);
      refreshLibrary();
      return nextPortfolioId;
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
  };
}
