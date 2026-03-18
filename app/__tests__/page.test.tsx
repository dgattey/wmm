import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import Home from "../page";

describe("Home page", () => {
  it("redirects to the portfolio route", () => {
    Home();
    expect(redirectMock).toHaveBeenCalledWith("/portfolio");
  });
});
