import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomeHowItWorksSection } from "../HomeHowItWorksSection";

describe("HomeHowItWorksSection", () => {
  it("shows how-it-works copy and privacy basics", () => {
    render(<HomeHowItWorksSection />);
    expect(screen.getByText("How it works")).toBeInTheDocument();
    expect(
      screen.getByText("Fund holdings, totaled across your book.")
    ).toBeVisible();
    expect(screen.getByText(/published holdings/i)).toBeVisible();
    expect(screen.getByText(/matching tickers/i)).toBeVisible();
    expect(screen.getByText(/Your data stays in the browser/i)).toBeVisible();
    expect(screen.getByText(/public quotes and fund facts/i)).toBeVisible();
  });
});
