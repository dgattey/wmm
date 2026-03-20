"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardSkeleton } from "@/app/components/skeletons";
import { usePendingUpload } from "@/app/contexts/PendingUploadContext";
import { usePortfolioLibrary } from "@/hooks/usePortfolioLibrary";

/**
 * Survives React Strict Mode’s effect cleanup + remount and avoids re-running
 * the effect when `setProcessing(false)` fires (which must not be in the
 * effect dependency array, or a follow-up run sees no pending files and sends
 * the user home instead of to the new portfolio).
 */
let uploadRouteSessionActive = false;

export default function UploadingPage() {
  const router = useRouter();
  const { takePendingFiles, setProcessing } = usePendingUpload();
  const { uploadFiles, setError } = usePortfolioLibrary();

  useEffect(() => {
    const files = takePendingFiles();

    if (!files || files.length === 0) {
      if (!uploadRouteSessionActive) {
        router.replace("/");
      }
      return;
    }

    uploadRouteSessionActive = true;

    uploadFiles(files)
      .then(({ uploadedPortfolios, failedUploads }) => {
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
        router.replace("/");
      })
      .finally(() => {
        uploadRouteSessionActive = false;
        setProcessing(false);
      });
  }, [takePendingFiles, setProcessing, uploadFiles, setError, router]);

  return <DashboardSkeleton enableIntroAnimation={false} />;
}
