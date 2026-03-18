"use client";

import { useRouter } from "next/navigation";
import { PortfolioLibraryNav } from "./components/PortfolioLibraryNav";
import { UploadView } from "./components/UploadView";
import { usePortfolioLibrary } from "@/hooks/usePortfolioLibrary";

export default function Home() {
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
        <section className="rounded-2xl border border-border/60 bg-surface p-6 shadow-[var(--shadow)]">
          <p className="text-sm font-semibold text-text-primary">Portfolio picker</p>
          <p className="mt-1 text-sm text-text-muted">
            Choose a saved file to visualize, delete one you do not need, or
            import more Fidelity exports.
          </p>
        </section>
        <PortfolioLibraryNav
          portfolios={portfolios}
          onRemovePortfolio={removePortfolioById}
        />
        <UploadView
          onFilesSelect={handleFilesSelect}
          error={error}
          isLoading={isUploading}
        />
      </div>
    </main>
  );
}
