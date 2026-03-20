import { cn } from "@/lib/utils";

interface SkeletonPulseProps {
  className?: string;
}

export function SkeletonPulse({ className }: SkeletonPulseProps) {
  return <div className={cn("skeleton rounded-lg", className)} />;
}
