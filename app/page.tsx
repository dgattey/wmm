"use client";

import Image from "next/image";
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
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-8">
        <section className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface shadow-[var(--shadow)]">
            <Image
              src="/icon.svg"
              alt=""
              width={32}
              height={32}
              aria-hidden="true"
              priority
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold text-text-primary md:text-4xl">
              Portfolio allocation
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-text-muted md:text-base">
              Pick a saved Fidelity export to visualize, remove one you no
              longer need, or import more files. File management happens here;
              the portfolio route stays focused on visualization.
            </p>
          </div>
        </section>

        <section className="rounded-[30px] border border-border/70 bg-surface px-6 py-6 shadow-[var(--shadow-lg)] md:px-8 md:py-8">
          <PortfolioLibraryNav
            portfolios={portfolios}
            onRemovePortfolio={removePortfolioById}
          />
        </section>

        <section className="rounded-[30px] border border-border/70 bg-surface px-6 py-6 shadow-[var(--shadow-lg)] md:px-8 md:py-8">
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
