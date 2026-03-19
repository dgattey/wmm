"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
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
  } = usePortfolioLibrary();

  function handleFilesSelect(files: File[]) {
    setPendingFiles(files);
    router.push("/portfolio/uploading");
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6 md:gap-8">
        <section className="flex items-start gap-3 md:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface shadow-[var(--shadow)] md:h-14 md:w-14">
            <Image
              src="/icon.svg"
              alt=""
              width={28}
              height={28}
              aria-hidden="true"
              priority
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-text-primary md:text-4xl">
              Portfolio allocation
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted md:text-base">
              Visualize your Fidelity portfolio allocations, live and in detail.
            </p>
          </div>
        </section>

        {portfolios.length > 0 && (
          <section className="rounded-[30px] border border-border/70 bg-surface px-5 py-5 shadow-[var(--shadow-lg)] md:px-8 md:py-8">
            <PortfolioLibraryNav
              portfolios={portfolios}
              onRemovePortfolio={removePortfolioById}
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
      </div>
    </main>
  );
}
