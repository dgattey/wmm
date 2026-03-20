import { cn } from "@/lib/utils";
import { SearchIcon } from "../icons";
import { SkeletonPulse } from "./SkeletonPulse";

interface SearchBarSkeletonProps {
  isMobile?: boolean;
}

export function SearchBarSkeleton({ isMobile = false }: SearchBarSkeletonProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        isMobile ? "px-4" : "px-6",
        "max-w-[1400px] mx-auto"
      )}
    >
      <div className={cn("relative min-w-0 flex-1", !isMobile && "max-w-xl lg:max-w-2xl")}>
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10 text-text-muted"
        />
        <div
          className={cn(
            "w-full rounded-xl border border-border py-2.5 pl-10 pr-3 text-sm",
            "bg-surface/95 text-text-muted"
          )}
        >
          Search by name or symbol
        </div>
      </div>
      <SkeletonPulse className="h-5 w-24 shrink-0" />
    </div>
  );
}
