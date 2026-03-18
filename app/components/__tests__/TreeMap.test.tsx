import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TreeMap } from "../TreeMap";

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

describe("TreeMap", () => {
  it("shows loading copy when there are no nodes", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

    render(
      <TreeMap
        nodes={[]}
        grouping="fund"
        selectedFunds={[]}
      />
    );

    expect(screen.getByText("Loading treemap...")).toBeInTheDocument();
  });
});
