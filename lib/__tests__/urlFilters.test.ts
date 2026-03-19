import { describe, expect, it } from "vitest";
import {
  arePortfolioUrlStatesEqual,
  buildPortfolioSearchParams,
  parsePortfolioUrlState,
} from "../urlFilters";

describe("urlFilters", () => {
  it("parses the full dashboard state from query params", () => {
    const state = parsePortfolioUrlState(
      new URLSearchParams(
        "q=apple&accounts=Brokerage,Roth%20IRA&types=Stocks,ETFs&funds=FXAIX,VTI&sort=currentPrice&dir=asc&view=positions&group=holding"
      )
    );

    expect(state).toEqual({
      filters: {
        accounts: ["Brokerage", "Roth IRA"],
        investmentTypes: ["ETFs", "Stocks"],
        searchQuery: "apple",
      },
      selectedFunds: ["FXAIX", "VTI"],
      sortConfig: {
        key: "currentPrice",
        direction: "asc",
      },
      viewMode: "positions",
      treeMapGrouping: "holding",
    });
  });

  it("falls back to defaults for invalid query params", () => {
    const state = parsePortfolioUrlState(
      new URLSearchParams("sort=not-a-column&dir=sideways&view=grid&group=sector")
    );

    expect(state).toEqual({
      filters: {
        accounts: [],
        investmentTypes: [],
        searchQuery: "",
      },
      selectedFunds: [],
      sortConfig: {
        key: "totalValue",
        direction: "desc",
      },
      viewMode: "holdings",
      treeMapGrouping: "fund",
    });
  });

  it("builds query params while preserving unrelated keys and omitting defaults", () => {
    const searchParams = new URLSearchParams(
      buildPortfolioSearchParams(
        {
          filters: {
            accounts: ["Roth IRA", "Brokerage"],
            investmentTypes: ["Stocks"],
            searchQuery: "nvda",
          },
          selectedFunds: ["QQQ"],
          sortConfig: {
            key: "currentPrice",
            direction: "asc",
          },
          viewMode: "positions",
          treeMapGrouping: "holding",
        },
        new URLSearchParams("portfolio=abc123")
      )
    );

    expect(searchParams.get("portfolio")).toBe("abc123");
    expect(searchParams.get("q")).toBe("nvda");
    expect(searchParams.get("accounts")).toBe("Brokerage,Roth IRA");
    expect(searchParams.get("types")).toBe("Stocks");
    expect(searchParams.get("funds")).toBe("QQQ");
    expect(searchParams.get("sort")).toBe("currentPrice");
    expect(searchParams.get("dir")).toBe("asc");
    expect(searchParams.get("view")).toBe("positions");
    expect(searchParams.get("group")).toBe("holding");

    const defaultsOnly = new URLSearchParams(
      buildPortfolioSearchParams(
        {
          filters: {
            accounts: [],
            investmentTypes: [],
            searchQuery: "",
          },
          selectedFunds: [],
          sortConfig: {
            key: "totalValue",
            direction: "desc",
          },
          viewMode: "holdings",
          treeMapGrouping: "fund",
        },
        new URLSearchParams("portfolio=abc123")
      )
    );

    expect(defaultsOnly.toString()).toBe("portfolio=abc123");
  });

  it("treats semantically equivalent states as equal", () => {
    expect(
      arePortfolioUrlStatesEqual(
        {
          filters: {
            accounts: ["Roth IRA", "Brokerage"],
            investmentTypes: ["Stocks", "ETFs"],
            searchQuery: " msft ",
          },
          selectedFunds: ["VTI", "FXAIX"],
          sortConfig: {
            key: "currentPrice",
            direction: "asc",
          },
          viewMode: "positions",
          treeMapGrouping: "holding",
        },
        {
          filters: {
            accounts: ["Brokerage", "Roth IRA"],
            investmentTypes: ["ETFs", "Stocks"],
            searchQuery: "msft",
          },
          selectedFunds: ["FXAIX", "VTI"],
          sortConfig: {
            key: "currentPrice",
            direction: "asc",
          },
          viewMode: "positions",
          treeMapGrouping: "holding",
        }
      )
    ).toBe(true);
  });
});
