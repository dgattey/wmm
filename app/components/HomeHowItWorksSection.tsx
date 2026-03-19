export function HomeHowItWorksSection() {
  return (
    <section
      className="border-t border-border/60 pt-6 md:pt-8"
      aria-labelledby="how-it-works-label"
    >
      <div className="max-w-2xl">
        <p
          id="how-it-works-label"
          className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted"
        >
          How it works
        </p>
        <div className="mt-3 space-y-2 text-sm leading-6 text-text-muted">
          <p>
            <span className="font-medium text-text-primary">
              Holdings aggregated across your portfolio.
            </span>{" "}
            Read-only work on the Fidelity positions export you already have: we
            map each fund position to its published holdings, then roll up rows
            that share the same symbol—like the aggregated holdings view in the
            app, instead of scattered fund-by-fund lines in a flat download.
          </p>
          <p>
            <span className="font-medium text-text-primary">
              Your data stays in the browser.
            </span>{" "}
            For live prices and fund breakdowns we call third-party public
            market-data APIs—regular API requests that only use symbols from your
            positions, not your Fidelity login.
          </p>
        </div>
      </div>
    </section>
  );
}
