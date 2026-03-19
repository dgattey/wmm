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
              Fund holdings, totaled across your book.
            </span>{" "}
            Read-only work on the Fidelity export you already have: we map each
            fund line to its published holdings, then combine matching tickers so
            overlap isn&apos;t scattered across separate rows the way a flat
            download usually leaves it.
          </p>
          <p>
            <span className="font-medium text-text-primary">
              Your data stays in the browser.
            </span>{" "}
            We only reach out for public quotes and fund facts, keyed to the
            tickers in your file—no brokerage login.
          </p>
        </div>
      </div>
    </section>
  );
}
