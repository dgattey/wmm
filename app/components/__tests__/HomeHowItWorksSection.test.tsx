import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomeHowItWorksSection } from "../HomeHowItWorksSection";

describe("HomeHowItWorksSection", () => {
  it("shows how-it-works copy and privacy basics", () => {
    render(<HomeHowItWorksSection />);
    expect(screen.getByText("How it works")).toBeInTheDocument();
    expect(
      screen.getByText("Holdings aggregated across your portfolio.")
    ).toBeVisible();
    expect(screen.getByText(/published holdings/i)).toBeVisible();
    expect(screen.getByText(/same symbol/i)).toBeVisible();
    expect(screen.getByText(/Your data stays in the browser/i)).toBeVisible();
    expect(screen.getByText(/third-party public/i)).toBeVisible();
    expect(screen.getByText(/market-data APIs/i)).toBeVisible();
  });
});
