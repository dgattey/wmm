import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardSkeleton } from "@/app/components/skeletons";
import { PortfolioDetailClient } from "./PortfolioDetailClient";

interface PageProps {
  params: Promise<{ portfolioId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ portfolioId: string }>;
}): Promise<Metadata> {
  await params;
  return { title: "Portfolio" };
}

function flattenSearchParams(
  record: Record<string, string | string[] | undefined>
): string {
  const u = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) u.append(key, v);
    } else {
      u.set(key, value);
    }
  }
  return u.toString();
}

async function PortfolioDetailPageContent({
  params,
  searchParams,
}: PageProps) {
  const { portfolioId } = await params;
  const spRecord = await searchParams;
  const initialSearchParamsString = flattenSearchParams(spRecord);

  if (!portfolioId) {
    return <DashboardSkeleton enableIntroAnimation={false} />;
  }

  return (
    <PortfolioDetailClient
      portfolioId={portfolioId}
      initialSearchParamsString={initialSearchParamsString}
    />
  );
}

export default function PortfolioDetailPage(props: PageProps) {
  return (
    <Suspense fallback={<DashboardSkeleton enableIntroAnimation={false} />}>
      <PortfolioDetailPageContent {...props} />
    </Suspense>
  );
}
