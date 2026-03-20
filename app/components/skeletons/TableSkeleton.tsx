import { cn } from "@/lib/utils";
import { SkeletonPulse } from "./SkeletonPulse";

interface TableSkeletonProps {
  rowCount?: number;
  isMobile?: boolean;
}

function DesktopTableSkeleton({ rowCount = 10 }: { rowCount: number }) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-[var(--shadow-md)]">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3" style={{ minWidth: 220 }}>
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Holding
              </span>
            </th>
            <th className="w-[10rem] text-left px-3 py-3">
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Account
              </span>
            </th>
            <th className="text-left px-3 py-3">
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Type
              </span>
            </th>
            {["Value", "% Total", "Price", "$ Change", "% Change", "52W Range"].map(
              (label) => (
                <th
                  key={label}
                  className={cn(
                    "px-3 py-3",
                    label === "52W Range" ? "text-left min-w-[10.5rem]" : "text-right"
                  )}
                >
                  <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                    {label}
                  </span>
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }, (_, i) => (
            <tr
              key={i}
              className={cn(
                "border-b border-border-subtle",
                i % 2 === 0 ? "bg-transparent" : "bg-surface-hover/30"
              )}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <SkeletonPulse className="h-8 w-8 shrink-0 !rounded-full" />
                  <div className="min-w-0 flex-1">
                    <SkeletonPulse className="h-4 w-14 mb-1" />
                    <SkeletonPulse className="h-3 w-28" />
                  </div>
                </div>
              </td>
              <td className="px-3 py-3">
                <SkeletonPulse className="h-3 w-20" />
              </td>
              <td className="px-3 py-3">
                <SkeletonPulse className="h-5 w-16 rounded-full" />
              </td>
              <td className="px-3 py-3 text-right">
                <SkeletonPulse className="ml-auto h-4 w-20" />
              </td>
              <td className="px-3 py-3 text-right">
                <SkeletonPulse className="ml-auto h-4 w-14" />
              </td>
              <td className="px-3 py-3 text-right">
                <SkeletonPulse className="ml-auto h-4 w-16" />
              </td>
              <td className="px-3 py-3 text-right">
                <SkeletonPulse className="ml-auto h-4 w-16" />
              </td>
              <td className="px-3 py-3 text-right">
                <SkeletonPulse className="ml-auto h-4 w-14" />
              </td>
              <td className="px-3 py-3">
                <SkeletonPulse className="h-2 w-full rounded-full" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileTableSkeleton({ rowCount = 6 }: { rowCount: number }) {
  return (
    <div className="space-y-4">
      {/* Sort control skeleton */}
      <div className="rounded-2xl border border-border/60 bg-surface p-4 shadow-[var(--shadow-md)]">
        <div className="mb-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
            Sort holdings
          </span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SkeletonPulse className="h-10 flex-1 rounded-xl" />
          <SkeletonPulse className="h-11 w-28 rounded-xl" />
        </div>
      </div>

      <div className="space-y-3">
        {Array.from({ length: rowCount }, (_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/60 bg-surface p-4 shadow-[var(--shadow-md)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <SkeletonPulse className="h-8 w-8 shrink-0 !rounded-full" />
                <div>
                  <SkeletonPulse className="h-4 w-14 mb-1" />
                  <SkeletonPulse className="h-3 w-24" />
                </div>
              </div>
            </div>
            <div className="mt-3">
              <SkeletonPulse className="h-5 w-16 rounded-full" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
              {Array.from({ length: 6 }, (_, j) => (
                <div key={j} className={cn(j < 1 ? "col-span-2" : "")}>
                  <SkeletonPulse className="h-3 w-12 mb-1" />
                  <SkeletonPulse className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rowCount = 10, isMobile = false }: TableSkeletonProps) {
  return isMobile ? (
    <MobileTableSkeleton rowCount={Math.min(rowCount, 6)} />
  ) : (
    <DesktopTableSkeleton rowCount={rowCount} />
  );
}
