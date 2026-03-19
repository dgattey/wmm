import { SiteFooter } from "./SiteFooter";

/**
 * Shared page chrome: full-viewport column so the footer stays in normal flow
 * at the bottom of the viewport when content is short (no position: fixed).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
