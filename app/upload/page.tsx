"use client";

import { useRouter } from "next/navigation";
import { PortfolioLibraryNav } from "../components/PortfolioLibraryNav";
import { UploadView } from "../components/UploadView";
import { usePortfolioLibrary } from "@/hooks/usePortfolioLibrary";

export default function UploadPage() {
  const router = useRouter();
  const {
    portfolios,
    isUploading,
    error,
    uploadFiles,
    removePortfolioById,
  } = usePortfolioLibrary();

  async function handleFilesSelect(files: File[]) {
    const { uploadedPortfolios } = await uploadFiles(files);
    if (uploadedPortfolios.length > 0) {
      router.push(
        `/portfolio/${uploadedPortfolios[uploadedPortfolios.length - 1].id}`
      );
    }
  }

  return (
    <main className="min-h-screen px-6 py-6">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
        <UploadView
          onFilesSelect={handleFilesSelect}
          error={error}
          isLoading={isUploading}
        />
        <PortfolioLibraryNav
          portfolios={portfolios}
          onRemovePortfolio={removePortfolioById}
        />
      </div>
    </main>
  );
}
