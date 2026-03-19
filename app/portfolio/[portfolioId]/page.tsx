"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { PortfolioLoadingState } from "@/app/components/PortfolioLoadingState";
import { PortfolioDetailClient } from "./PortfolioDetailClient";

export default function PortfolioDetailPage() {
  return (
    <Suspense fallback={<PortfolioLoadingState enableIntroAnimation={false} />}>
      <PortfolioDetailRoute />
    </Suspense>
  );
}

function PortfolioDetailRoute() {
  const params = useParams<{ portfolioId: string }>();
  const portfolioId = params.portfolioId;

  return <PortfolioDetailClient key={portfolioId} portfolioId={portfolioId} />;
}
