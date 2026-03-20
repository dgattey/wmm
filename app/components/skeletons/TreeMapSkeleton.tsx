import { cn } from "@/lib/utils";
import { SkeletonPulse } from "./SkeletonPulse";

interface TreeMapSkeletonProps {
  isMobile?: boolean;
}

/**
 * Mimics the treemap tile layout with a grid of skeleton rectangles
 * of varying sizes, simulating the squarified treemap appearance.
 */
export function TreeMapSkeleton({ isMobile = false }: TreeMapSkeletonProps) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-lg",
        isMobile ? "h-[280px]" : "h-[400px]"
      )}
    >
      <div className="grid h-full w-full gap-1" style={{
        gridTemplateColumns: "3fr 2fr 1.5fr",
        gridTemplateRows: "2fr 1fr",
      }}>
        <SkeletonPulse className="h-full rounded-lg" />
        <SkeletonPulse className="h-full rounded-lg" />
        <div className="flex flex-col gap-1">
          <SkeletonPulse className="flex-[2] rounded-lg" />
          <SkeletonPulse className="flex-1 rounded-lg" />
        </div>
        <div className="flex gap-1">
          <SkeletonPulse className="flex-1 rounded-lg" />
          <SkeletonPulse className="flex-1 rounded-lg" />
        </div>
        <SkeletonPulse className="h-full rounded-lg" />
        <SkeletonPulse className="h-full rounded-lg" />
      </div>
    </div>
  );
}
