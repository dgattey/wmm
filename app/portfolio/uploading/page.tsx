"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardSkeleton } from "@/app/components/skeletons";
import { usePendingUpload } from "@/app/contexts/PendingUploadContext";
import { usePortfolioLibrary } from "@/hooks/usePortfolioLibrary";

export default function UploadingPage() {
  const router = useRouter();
  const { takePendingFiles, isProcessing, setProcessing } = usePendingUpload();
  const { uploadFiles, setError } = usePortfolioLibrary();

  useEffect(() => {
    const files = takePendingFiles();

    if (!files || files.length === 0) {
      // Don't navigate home if another run is processing (e.g. React Strict Mode)
      if (!isProcessing) {
        router.replace("/");
      }
      return;
    }

    let cancelled = false;

    uploadFiles(files)
      .then(({ uploadedPortfolios, failedUploads }) => {
        if (cancelled) return;

        if (failedUploads.length > 0) {
          setError(
            failedUploads
              .map(({ fileName, reason }) => `${fileName}: ${reason}`)
              .join(" | ")
          );
        } else if (uploadedPortfolios.length === 0) {
          setError("Select at least one Fidelity positions CSV.");
        }

        if (uploadedPortfolios.length > 0) {
          router.replace(
            `/portfolio/${uploadedPortfolios[uploadedPortfolios.length - 1].id}`
          );
        } else {
          router.replace("/");
        }
      })
      .catch(() => {
        if (!cancelled) router.replace("/");
      })
      .finally(() => {
        setProcessing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [takePendingFiles, isProcessing, setProcessing, uploadFiles, setError, router]);

  return <DashboardSkeleton enableIntroAnimation={false} />;
}
