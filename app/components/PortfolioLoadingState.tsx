"use client";

import { DashboardSkeleton } from "./skeletons";

interface PortfolioLoadingStateProps {
  portfolioName?: string;
  isMobile?: boolean;
  enableIntroAnimation?: boolean;
  error?: string | null;
}

export function PortfolioLoadingState({
  portfolioName,
  isMobile,
  enableIntroAnimation = true,
  error,
}: PortfolioLoadingStateProps) {
  return (
    <DashboardSkeleton
      portfolioName={portfolioName}
      isMobile={isMobile}
      enableIntroAnimation={enableIntroAnimation}
      error={error}
    />
  );
}
