import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FiftyTwoWeekRange } from "../FiftyTwoWeekRange";

describe("FiftyTwoWeekRange", () => {
  it("renders nothing when low >= high", () => {
    const { container } = render(
      <FiftyTwoWeekRange low={100} high={100} current={100} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders when low is 0 but the range is otherwise valid", () => {
    render(<FiftyTwoWeekRange low={0} high={100} current={50} />);
    expect(screen.getByText("$0.00")).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
  });

  it("renders labels in md size", () => {
    render(
      <FiftyTwoWeekRange low={100} high={200} current={150} size="md" />
    );
    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByText("$200.00")).toBeInTheDocument();
  });

  it("does not render labels in sm size", () => {
    render(
      <FiftyTwoWeekRange low={100} high={200} current={150} size="sm" />
    );
    expect(screen.queryByText("$100.00")).not.toBeInTheDocument();
    expect(screen.queryByText("$200.00")).not.toBeInTheDocument();
  });

  it("positions diamond at 50% when current is midpoint", () => {
    const { container } = render(
      <FiftyTwoWeekRange low={100} high={200} current={150} />
    );
    const diamond = container.querySelector(
      "[style*='left']"
    ) as HTMLElement;
    expect(diamond).toBeTruthy();
    expect(diamond.style.left).toBe("50%");
  });

  it("clamps diamond to 0% when current < low", () => {
    const { container } = render(
      <FiftyTwoWeekRange low={100} high={200} current={50} />
    );
    const diamond = container.querySelector(
      "[style*='left']"
    ) as HTMLElement;
    expect(diamond.style.left).toBe("0%");
  });

  it("clamps diamond to 100% when current > high", () => {
    const { container } = render(
      <FiftyTwoWeekRange low={100} high={200} current={250} />
    );
    const diamond = container.querySelector(
      "[style*='left']"
    ) as HTMLElement;
    expect(diamond.style.left).toBe("100%");
  });
});
