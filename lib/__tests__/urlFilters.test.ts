import { describe, expect, it } from "vitest";
import {
  arePortfolioUrlStatesEqual,
  buildPortfolioSearchParams,
  parsePortfolioUrlState,
} from "../urlFilters";

describe("urlFilters", () => {
  it("parses the full dashboard state from query params (table, chart, pipe lists)", () => {
    const state = parsePortfolioUrlState(
      new URLSearchParams(
        "q=apple&accounts=Brokerage|Roth%20IRA&types=Stocks|ETFs&funds=FXAIX|VTI&sort=currentPrice&dir=asc&table=positions&chart=aggregated"
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

  it("still parses legacy view, group, and comma-separated lists", () => {
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

  it("parses investment types with commas inside labels when using pipe delimiter", () => {
    const state = parsePortfolioUrlState(
      new URLSearchParams("types=ETFs|Mutual%20Funds|Stocks")
    );

    expect(state.filters.investmentTypes).toEqual(["ETFs", "Mutual Funds", "Stocks"]);
  });

  it("falls back to defaults for invalid query params", () => {
    const state = parsePortfolioUrlState(
      new URLSearchParams("sort=not-a-column&dir=sideways&table=grid&chart=sector")
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
    expect(searchParams.get("accounts")).toBe("Brokerage|Roth IRA");
    expect(searchParams.get("types")).toBe("Stocks");
    expect(searchParams.get("funds")).toBe("QQQ");
    expect(searchParams.get("sort")).toBe("currentPrice");
    expect(searchParams.get("dir")).toBe("asc");
    expect(searchParams.get("table")).toBe("positions");
    expect(searchParams.get("chart")).toBe("aggregated");
    expect(searchParams.get("view")).toBeNull();
    expect(searchParams.get("group")).toBeNull();

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
