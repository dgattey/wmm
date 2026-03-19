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
              Your holdings, unified.
            </span>{" "}
            We map each Fidelity position to its underlying holdings and roll up
            duplicate symbols across funds — one consolidated view of what you
            actually own, instead of opaque fund-level positions.
          </p>
          <p>
            <span className="font-medium text-text-primary">
              Always live, always local.
            </span>{" "}
            We fetch live prices and fund breakdowns from Yahoo Finance using
            only your ticker symbols — no Fidelity credentials, no server uploads,
            nothing stored.
          </p>
        </div>
      </div>
    </section>
  );
}
