"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PortfolioLoadingState } from "@/app/components/PortfolioLoadingState";
import { usePendingUpload } from "@/app/contexts/PendingUploadContext";
import { usePortfolioLibrary } from "@/hooks/usePortfolioLibrary";

export default function UploadingPage() {
  const router = useRouter();
  const { takePendingFiles } = usePendingUpload();
  const { uploadFiles, setError } = usePortfolioLibrary();

  useEffect(() => {
    const files = takePendingFiles();

    if (!files || files.length === 0) {
      router.replace("/");
      return;
    }

    let cancelled = false;

    uploadFiles(files).then(({ uploadedPortfolios, failedUploads }) => {
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
    });

    return () => {
      cancelled = true;
    };
  }, [takePendingFiles, uploadFiles, setError, router]);

  return <PortfolioLoadingState enableIntroAnimation={false} />;
}
