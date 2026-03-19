import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SiteFooterInner } from "../SiteFooter";

describe("SiteFooterInner", () => {
  it("shows copyright with given year and creator link", () => {
    render(<SiteFooterInner year={2026} />);

    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeInTheDocument();
    expect(footer.textContent).toMatch(/©\s*2026/);
    expect(screen.getByText("Crafted by")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "Dylan Gattey" });
    expect(link).toHaveAttribute("href", "https://gattey.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
