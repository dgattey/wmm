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
      className="shrink-0 border-t border-border/70 bg-[var(--glass-bg-strong)] pt-2.5 shadow-[var(--shadow-md),0_-1px_0_var(--glass-highlight)] backdrop-blur-2xl backdrop-saturate-150 md:pt-3 pb-[max(0.625rem,env(safe-area-inset-bottom,0px))]"
      role="contentinfo"
    >
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 text-center md:gap-x-3 md:px-6">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted/80">
          Crafted by
        </span>
        <Link
          href="https://gattey.com"
          className="inline-flex items-center rounded-full border border-border/60 bg-surface/90 px-3 py-1 text-xs font-semibold text-accent shadow-[var(--shadow)] transition-[color,background-color,box-shadow,border-color] hover:border-accent/35 hover:bg-accent-bg hover:text-text-primary"
          rel="noopener noreferrer"
          target="_blank"
        >
          Dylan Gattey
        </Link>
        <span className="text-border/90" aria-hidden="true">
          ·
        </span>
        <span className="tabular-nums text-sm text-text-muted">© {year}</span>
      </div>
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
