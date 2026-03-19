import Link from "next/link";
import { cacheLife } from "next/cache";

const FOOTER_CACHE_STALE_SECONDS = 24 * 60 * 60;
const FOOTER_CACHE_REVALIDATE_SECONDS = 7 * 24 * 60 * 60;
const FOOTER_CACHE_EXPIRE_SECONDS = 14 * 24 * 60 * 60;

export interface SiteFooterInnerProps {
  year: number;
}

export function SiteFooterInner({ year }: SiteFooterInnerProps) {
  return (
    <footer
      className="shrink-0 border-t border-border bg-surface/80 px-4 py-4 text-center text-sm text-text-muted backdrop-blur-sm md:px-6"
      role="contentinfo"
    >
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <span>© {year} Dylan Gattey.</span>
        <span className="text-border" aria-hidden="true">
          ·
        </span>
        <Link
          href="https://gattey.com"
          className="text-accent underline decoration-border underline-offset-2 transition-colors hover:text-text-primary"
          rel="noopener noreferrer"
          target="_blank"
        >
          gattey.com
        </Link>
      </p>
    </footer>
  );
}

export async function SiteFooter() {
  "use cache";
  cacheLife({
    stale: FOOTER_CACHE_STALE_SECONDS,
    revalidate: FOOTER_CACHE_REVALIDATE_SECONDS,
    expire: FOOTER_CACHE_EXPIRE_SECONDS,
  });
  const year = new Date().getFullYear();
  return <SiteFooterInner year={year} />;
}
