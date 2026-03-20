"use client";

import { useRouter } from "next/navigation";
import TreemapMarkIcon from "@/public/icon.svg";
import { HomeHowItWorksSection } from "./components/HomeHowItWorksSection";
import { PortfolioLibraryNav } from "./components/PortfolioLibraryNav";
import { DashboardSkeleton } from "./components/skeletons";
import { UploadView } from "./components/UploadView";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePortfolioLibrary } from "@/hooks/usePortfolioLibrary";

export default function Home() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const {
    portfolios,
    isUploading,
    error,
    uploadFiles,
    removePortfolioById,
    renamePortfolio,
  } = usePortfolioLibrary();

  async function handleFilesSelect(files: File[]) {
    await uploadFiles(files, {
      onPersistedBeforeRefresh: (result) => {
        const id = result.uploadedPortfolios.at(-1)?.id;
        if (!id) return false;
        router.push(`/portfolio/${id}`);
        return true;
      },
    });
  }

  if (isUploading) {
    return (
      <main className="flex min-h-0 flex-1 flex-col">
        <DashboardSkeleton isMobile={isMobile} enableIntroAnimation={false} />
      </main>
    );
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6 md:gap-8">
        <section className="grid grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_auto] items-start gap-x-3 gap-y-2 md:gap-x-5 md:gap-y-2">
          <div className="row-span-2 flex h-full min-h-0 items-start justify-start self-stretch">
            <TreemapMarkIcon
              className="h-full w-auto max-w-[4.75rem] shrink-0 md:max-w-[6.25rem]"
              aria-hidden
            />
          </div>
          <h1 className="col-start-2 row-start-1 min-w-0 text-2xl font-semibold text-text-primary md:text-4xl">
            <abbr title="Where's my money?" className="no-underline">WMM</abbr>
          </h1>
          <p className="col-start-2 row-start-2 min-w-0 max-w-2xl text-sm leading-6 text-text-muted md:text-base">
            Where&apos;s my money? Visualize your Fidelity portfolio allocations, live and in detail.
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
            isLoading={false}
          />
        </section>

        <HomeHowItWorksSection />
      </div>
    </main>
  );
}
