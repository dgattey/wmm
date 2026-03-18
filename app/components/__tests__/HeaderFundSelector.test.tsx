import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HeaderFundSelector } from "../HeaderFundSelector";

function makeProps() {
  return {
    funds: [
      {
        symbol: "VTI",
        name: "Vanguard Total Stock Market",
        color: "#4E9999",
        value: 1000,
        hasChildren: true,
      },
      {
        symbol: "SPY",
        name: "SPDR S&P 500",
        color: "#8B74AB",
        value: 800,
        hasChildren: true,
      },
      {
        symbol: "FXAIX",
        name: "Fidelity 500 Index Fund",
        color: "#C49A5C",
        value: 600,
        hasChildren: true,
      },
    ],
    selectedFunds: [] as string[],
    onToggleFund: vi.fn(),
    onClearFunds: vi.fn(),
  };
}

describe("HeaderFundSelector", () => {
  it("opens the add-funds menu and toggles fund options", () => {
    const props = makeProps();
    render(<HeaderFundSelector {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
    fireEvent.click(
      screen.getByRole("button", { name: /VTI\s+Vanguard Total Stock Market/i })
    );

    expect(props.onToggleFund).toHaveBeenCalledWith("VTI");
  });

  it("shows selected funds inline and clears back to all funds", () => {
    const props = makeProps();
    props.selectedFunds = ["VTI", "SPY"];

    render(<HeaderFundSelector {...props} />);

    expect(screen.getByRole("button", { name: "All funds" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove VTI" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove SPY" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All funds" }));
    expect(props.onClearFunds).toHaveBeenCalledTimes(1);
  });

  it("shows all-funds reset inside the menu when funds are selected", () => {
    const props = makeProps();
    props.selectedFunds = ["FXAIX"];

    render(<HeaderFundSelector {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
    fireEvent.click(screen.getAllByRole("button", { name: "All funds" })[1]);

    expect(props.onClearFunds).toHaveBeenCalledTimes(1);
  });
});
