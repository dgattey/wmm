"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dashboard } from "@/app/components/Dashboard";
import { PortfolioEmptyState } from "@/app/components/PortfolioEmptyState";
import { PortfolioLibraryNav } from "@/app/components/PortfolioLibraryNav";
import { PortfolioLoadingState } from "@/app/components/PortfolioLoadingState";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePortfolioLibrary } from "@/hooks/usePortfolioLibrary";
import { usePortfolioViewState } from "@/hooks/usePortfolioViewState";
import { useStoredPortfolioRecord } from "@/hooks/useStoredPortfolioRecord";
import {
  DESKTOP_TREE_MAP_LAYOUT,
  MOBILE_TREE_MAP_LAYOUT,
} from "@/lib/portfolioLayout";

interface PortfolioDetailClientProps {
  portfolioId: string;
}

export function PortfolioDetailClient({
  portfolioId,
}: PortfolioDetailClientProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const treeMapLayout = isMobile
    ? MOBILE_TREE_MAP_LAYOUT
    : DESKTOP_TREE_MAP_LAYOUT;
  const layoutMode = isMobile ? "mobile" : "desktop";
  const record = useStoredPortfolioRecord({
    portfolioId,
    width: treeMapLayout.width,
    height: treeMapLayout.height,
    layoutMode,
  });
  const {
    portfolios,
    refreshLibrary,
    removePortfolioById,
  } = usePortfolioLibrary();
  const viewState = usePortfolioViewState({
    positions: record.positions,
    portfolioData: record.portfolioData,
    isMobile,
    resetKey: portfolioId,
  });

  useEffect(() => {
    refreshLibrary();
  }, [portfolioId, record.portfolioData?.lastUpdated, refreshLibrary]);

  function handleLibraryRemove(portfolioToRemoveId: string) {
    const nextPortfolioId = removePortfolioById(portfolioToRemoveId);

    if (portfolioToRemoveId === portfolioId) {
      router.push(nextPortfolioId ? `/portfolio/${nextPortfolioId}` : "/upload");
    }
  }

  if (record.isMissing) {
    return (
      <PortfolioEmptyState
        title="Portfolio not found"
        description="That saved portfolio is no longer available on this device."
      />
    );
  }

  if (!record.positions) {
    return <PortfolioLoadingState error={record.error} />;
  }

  if (!record.portfolioData) {
    return (
      <PortfolioLoadingState
        enableIntroAnimation={!record.restoredFromStorage}
        error={record.error}
      />
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[1400px] px-4 pt-4 md:px-6 md:pt-6">
        <PortfolioLibraryNav
          portfolios={portfolios}
          activePortfolioId={portfolioId}
          onRemovePortfolio={handleLibraryRemove}
        />
      </div>
      <Dashboard
        portfolioData={record.portfolioData}
        filteredTreeMapNodes={viewState.filteredTreeMapNodes}
        filteredRows={viewState.filteredRows}
        isMobile={isMobile}
        filters={viewState.filters}
        onFiltersChange={viewState.setFilters}
        onResetFilters={viewState.resetFilters}
        sortConfig={viewState.sortConfig}
        onSort={viewState.handleSort}
        expandedRows={viewState.expandedRows}
        onToggleExpand={viewState.toggleExpand}
        onRemovePortfolio={() => handleLibraryRemove(portfolioId)}
        isLoading={record.isLoading}
        viewMode={viewState.viewMode}
        onViewModeChange={viewState.setViewMode}
        treeMapGrouping={viewState.treeMapGrouping}
        onTreeMapGroupingChange={viewState.setTreeMapGrouping}
        selectedFunds={viewState.selectedFunds}
        onToggleFund={viewState.toggleFundSelection}
        onClearFunds={viewState.clearSelectedFunds}
        fundOptions={viewState.fundOptions}
        activeSummary={viewState.activeSummary}
        treeMapWidth={viewState.treeMapWidth}
        treeMapHeight={viewState.treeMapHeight}
        enableIntroAnimation={!record.restoredFromStorage}
        enableValueAnimations={!record.restoredFromStorage}
        fetchError={record.error}
      />
    </main>
  );
}
