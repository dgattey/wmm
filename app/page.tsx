"use client";

import { useRouter } from "next/navigation";
import TreemapMarkIcon from "@/public/icon.svg";
import { HomeHowItWorksSection } from "./components/HomeHowItWorksSection";
import { PortfolioLibraryNav } from "./components/PortfolioLibraryNav";
import { UploadView } from "./components/UploadView";
import { usePendingUpload } from "@/app/contexts/PendingUploadContext";
import { usePortfolioLibrary } from "@/hooks/usePortfolioLibrary";

export default function Home() {
  const router = useRouter();
  const { setPendingFiles } = usePendingUpload();
  const {
    portfolios,
    isUploading,
    error,
    removePortfolioById,
    renamePortfolio,
  } = usePortfolioLibrary();

  function handleFilesSelect(files: File[]) {
    setPendingFiles(files);
    router.push("/portfolio/uploading");
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6 md:gap-8">
        <section className="grid grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_auto] items-start gap-x-3 gap-y-2 md:gap-x-5 md:gap-y-2">
          <div className="row-span-2 flex h-full min-h-0 items-start justify-start self-stretch">
            <TreemapMarkIcon
              className="h-full w-auto max-w-[4.75rem] shrink-0 md:max-w-[6.25rem]"
              aria-hidden
            />
          </div>
          <h1 className="col-start-2 row-start-1 min-w-0 text-2xl font-semibold text-text-primary md:text-4xl">
            Where&apos;s my money?
          </h1>
          <p className="col-start-2 row-start-2 min-w-0 max-w-2xl text-sm leading-6 text-text-muted md:text-base">
            Visualize your Fidelity portfolio allocations, live and in detail.
          </p>
        </section>

        {portfolios.length > 0 && (
          <section className="rounded-[30px] border border-border/70 bg-surface px-5 py-5 shadow-[var(--shadow-lg)] md:px-8 md:py-8">
            <PortfolioLibraryNav
              portfolios={portfolios}
              onRemovePortfolio={removePortfolioById}
              onRenamePortfolio={renamePortfolio}
            />
          </section>
        )}

        <section className="rounded-[30px] border border-border/70 bg-surface px-5 py-5 shadow-[var(--shadow-lg)] md:px-8 md:py-8">
          <UploadView
            onFilesSelect={handleFilesSelect}
            error={error}
            isLoading={isUploading}
          />
        </section>

        <HomeHowItWorksSection />
      </div>
    </main>
  );
}
