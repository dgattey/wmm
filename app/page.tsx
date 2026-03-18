"use client";

import { usePortfolio } from "@/hooks/usePortfolio";
import { UploadView } from "./components/UploadView";
import { Dashboard } from "./components/Dashboard";

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
    return <LoadingSkeleton />;
  }

  return (
    <Dashboard
      portfolioData={portfolio.portfolioData}
      filteredTreeMapNodes={portfolio.filteredTreeMapNodes}
      filteredRows={portfolio.filteredRows}
      filters={portfolio.filters}
      onFiltersChange={portfolio.setFilters}
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
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen p-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="mb-6">
        <div className="skeleton h-4 w-32 mb-2" />
        <div className="skeleton h-9 w-48" />
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
