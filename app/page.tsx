"use client";

import { usePortfolio } from "@/hooks/usePortfolio";
import { UploadView } from "./components/UploadView";
import { Dashboard } from "./components/Dashboard";
import { FetchStatusBadge } from "./components/primitives/FetchStatusBadge";

export default function Home() {
  const portfolio = usePortfolio();

  if (!portfolio.hasData) {
    return (
      <UploadView
        onFileSelect={portfolio.uploadFile}
        error={portfolio.error}
        isLoading={portfolio.isLoading}
      />
    );
  }

  if (!portfolio.portfolioData) {
    return (
      <LoadingSkeleton
        enableIntroAnimation={!portfolio.restoredFromStorage}
        error={portfolio.error}
      />
    );
  }

  return (
    <Dashboard
      portfolioData={portfolio.portfolioData}
      filteredTreeMapNodes={portfolio.filteredTreeMapNodes}
      filteredRows={portfolio.filteredRows}
      isMobile={portfolio.isMobile}
      filters={portfolio.filters}
      onFiltersChange={portfolio.setFilters}
      onResetFilters={portfolio.resetFilters}
      sortConfig={portfolio.sortConfig}
      onSort={portfolio.handleSort}
      expandedRows={portfolio.expandedRows}
      onToggleExpand={portfolio.toggleExpand}
      onClearData={portfolio.clearData}
      isLoading={portfolio.isLoading}
      viewMode={portfolio.viewMode}
      onViewModeChange={portfolio.setViewMode}
      treeMapGrouping={portfolio.treeMapGrouping}
      onTreeMapGroupingChange={portfolio.setTreeMapGrouping}
      selectedFunds={portfolio.selectedFunds}
      onToggleFund={portfolio.toggleFundSelection}
      onClearFunds={portfolio.clearSelectedFunds}
      fundOptions={portfolio.fundOptions}
      activeSummary={portfolio.activeSummary}
      treeMapWidth={portfolio.treeMapWidth}
      treeMapHeight={portfolio.treeMapHeight}
      enableIntroAnimation={!portfolio.restoredFromStorage}
      enableValueAnimations={!portfolio.restoredFromStorage}
      fetchError={portfolio.error}
    />
  );
}

function LoadingSkeleton({
  enableIntroAnimation = true,
  error,
}: {
  enableIntroAnimation?: boolean;
  error?: string | null;
}) {
  return (
    <div
      className={[
        "min-h-screen p-6 max-w-[1400px] mx-auto",
        enableIntroAnimation ? "animate-fade-in" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm font-medium text-text-muted">Your portfolio</div>
          <div className="mt-2 skeleton h-9 w-48" />
        </div>
        {error && <FetchStatusBadge error={error} hasData={false} />}
      </div>
      <div className="skeleton h-[400px] rounded-xl mb-6" />
      <div className="space-y-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="skeleton h-12 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
