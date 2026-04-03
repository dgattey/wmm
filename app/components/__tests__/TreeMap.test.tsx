import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TreeMap } from "../TreeMap";

describe("TreeMap", () => {
  it("shows an empty-state tile when there are no nodes", () => {
    render(
      <TreeMap
        nodes={[]}
        grouping="fund"
        selectedFunds={[]}
      />
    );

    expect(screen.getByText("No results found")).toBeInTheDocument();
  });
});
