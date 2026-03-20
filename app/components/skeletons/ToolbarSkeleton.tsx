import { cn } from "@/lib/utils";
import { SkeletonPulse } from "./SkeletonPulse";

interface ToolbarSkeletonProps {
  isMobile?: boolean;
}

export function ToolbarSkeleton({ isMobile = false }: ToolbarSkeletonProps) {
  const segmentPair = (
    <div className="flex gap-1">
      <SkeletonPulse className="h-7 w-16 rounded-lg" />
      <SkeletonPulse className="h-7 w-20 rounded-lg" />
    </div>
  );

  if (isMobile) {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border border-white/[0.06] px-4 py-3",
          "bg-[#1a1d28]/92 backdrop-blur-2xl saturate-150"
        )}
      >
        <div className="grid gap-3">
          <div>
            <SkeletonPulse className="h-3 w-10 mb-1.5" />
            {segmentPair}
          </div>
          <div>
            <SkeletonPulse className="h-3 w-10 mb-1.5" />
            {segmentPair}
          </div>
          <SkeletonPulse className="h-9 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="sticky bottom-4 z-40 mt-6 flex w-full justify-center px-4 md:px-6">
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] px-4 py-3",
          "bg-[#1a1d28]/92 backdrop-blur-2xl saturate-150",
          "w-[92vw] max-w-[44rem] lg:w-[72vw] lg:max-w-[1080px]",
          "shadow-[0_8px_40px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.2)]"
        )}
      >
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-2">
            <SkeletonPulse className="h-3 w-10" />
            {segmentPair}
          </div>
          <div className="flex items-center gap-2">
            <SkeletonPulse className="h-3 w-10" />
            {segmentPair}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <SkeletonPulse className="h-8 w-20 rounded-lg" />
          <SkeletonPulse className="h-4 w-36" />
        </div>
      </div>
    </div>
  );
}
