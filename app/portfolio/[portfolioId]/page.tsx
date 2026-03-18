import { PortfolioDetailClient } from "./PortfolioDetailClient";

export default async function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ portfolioId: string }>;
}) {
  const { portfolioId } = await params;
  return <PortfolioDetailClient portfolioId={portfolioId} />;
}
