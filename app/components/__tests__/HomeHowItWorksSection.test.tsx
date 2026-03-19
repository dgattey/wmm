import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomeHowItWorksSection } from "../HomeHowItWorksSection";

describe("HomeHowItWorksSection", () => {
  it("shows how-it-works copy and privacy basics", () => {
    render(<HomeHowItWorksSection />);
    expect(screen.getByText("How it works")).toBeInTheDocument();
    expect(screen.getByText("Your holdings, unified.")).toBeVisible();
    expect(screen.getByText(/underlying holdings/i)).toBeVisible();
    expect(screen.getByText(/opaque fund-level positions/i)).toBeVisible();
    expect(screen.getByText("Always live, always local.")).toBeVisible();
    expect(screen.getByText(/Yahoo Finance/i)).toBeVisible();
    expect(screen.getByText(/ticker symbols/i)).toBeVisible();
  });
});
