"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PortfolioLoadingState } from "../components/PortfolioLoadingState";
import { getMostRecentPortfolioId } from "@/lib/storage";

export default function PortfolioIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const mostRecentPortfolioId = getMostRecentPortfolioId();
    router.replace(
      mostRecentPortfolioId
        ? `/portfolio/${mostRecentPortfolioId}`
        : "/upload"
    );
  }, [router]);

  return <PortfolioLoadingState enableIntroAnimation={false} />;
}
