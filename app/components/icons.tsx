import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function defaultProps(defaultSize: number, props: IconProps): SVGProps<SVGSVGElement> {
  const { size, className, ...rest } = props;
  return {
    width: size ?? defaultSize,
    height: size ?? defaultSize,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: cn("shrink-0", className),
    ...rest,
  };
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...defaultProps(14, props)}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...defaultProps(12, props)}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <svg {...defaultProps(12, props)}>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...defaultProps(16, props)}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/** Magnifying glass with strike — “nothing matched this search.” */
export function SearchOffIcon(props: IconProps) {
  return (
    <svg {...defaultProps(18, props)}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <path d="M4 20 20 4" strokeWidth={2.25} />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg {...defaultProps(12, props)} strokeWidth={2.5}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
