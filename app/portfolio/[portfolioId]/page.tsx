import type { Metadata } from "next";
import { Suspense } from "react";
import { PortfolioLoadingState } from "@/app/components/PortfolioLoadingState";
import { PortfolioDetailClient } from "./PortfolioDetailClient";

interface PageProps {
  params: Promise<{ portfolioId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Server-side tab title (see root `metadata.title.template`). The saved display
 * name only exists in localStorage, so the client still refines `document.title`
 * once `useStoredPortfolioRecord` has loaded.
 */
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
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const v of value) {
        u.append(key, v);
      }
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
    return <PortfolioLoadingState enableIntroAnimation={false} />;
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
    <Suspense fallback={<PortfolioLoadingState enableIntroAnimation={false} />}>
      <PortfolioDetailPageContent {...props} />
    </Suspense>
  );
}
