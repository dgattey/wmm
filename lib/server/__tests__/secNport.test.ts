import { beforeEach, describe, expect, it } from "vitest";

import { __testing, fetchSecNportHoldings } from "../holdings/secNport";

const sampleMapping = {
  cik: "0001100663",
  organizationType: "30",
  seriesId: "S000004310",
  seriesName: "iShares Core S&P 500 ETF",
  classId: "C000012040",
  className: "iShares Core S&P 500 ETF",
  classTicker: "IVV",
  normalizedSeriesName: "ISHARES CORE S P 500 ETF",
  normalizedClassName: "ISHARES CORE S P 500 ETF",
};

describe("SEC N-PORT holdings provider", () => {
  beforeEach(() => {
    __testing.reset();
  });

  it("returns normalized holdings from a fresh SEC filing", async () => {
    const fetchCalls: string[] = [];
    await __testing.setSeriesClassMappings([sampleMapping]);
    __testing.setNowImplementation(() => Date.parse("2026-03-18T00:00:00Z"));
    await __testing.setFetchTextImplementation(async (url) => {
      fetchCalls.push(url);

      if (url.includes("browse-edgar")) {
        return `
          <feed>
            <entry>
              <content>
                <filing-href>https://www.sec.gov/Archives/edgar/data/1100663/000207169126004238/0002071691-26-004238-index.htm</filing-href>
              </content>
            </entry>
          </feed>
        `;
      }

      if (url.endsWith("index.json")) {
        return JSON.stringify({
          directory: {
            item: [{ name: "primary_doc.xml" }],
          },
        });
      }

      if (url.endsWith("primary_doc.xml")) {
        return `
          <edgarSubmission>
            <formData>
              <genInfo>
                <repPdDate>2026-01-31</repPdDate>
              </genInfo>
              <invstOrSec>
                <title>Apple Inc.</title>
                <cusip>037833100</cusip>
                <pctVal>6.5</pctVal>
              </invstOrSec>
              <invstOrSec>
                <title>Apple Inc.</title>
                <cusip>037833100</cusip>
                <pctVal>0.5</pctVal>
              </invstOrSec>
              <invstOrSec>
                <title>Microsoft Corp.</title>
                <cusip>594918104</cusip>
                <pctVal>5</pctVal>
              </invstOrSec>
            </formData>
          </edgarSubmission>
        `;
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    const holdings = await fetchSecNportHoldings("IVV");
    const repeatedHoldings = await fetchSecNportHoldings("IVV");

    expect(holdings).toEqual([
      {
        symbol: "037833100",
        holdingName: "Apple Inc.",
        holdingPercent: 0.07,
      },
      {
        symbol: "594918104",
        holdingName: "Microsoft Corp.",
        holdingPercent: 0.05,
      },
    ]);
    expect(repeatedHoldings).toEqual(holdings);
    expect(fetchCalls).toHaveLength(6);
  });

  it("treats stale SEC filings as unsupported so callers can fall back", async () => {
    await __testing.setSeriesClassMappings([sampleMapping]);
    __testing.setNowImplementation(() => Date.parse("2026-10-18T00:00:00Z"));
    await __testing.setFetchTextImplementation(async (url) => {
      if (url.includes("browse-edgar")) {
        return `
          <feed>
            <entry>
              <content>
                <filing-href>https://www.sec.gov/Archives/edgar/data/1100663/000207169126004238/0002071691-26-004238-index.htm</filing-href>
              </content>
            </entry>
          </feed>
        `;
      }

      if (url.endsWith("index.json")) {
        return JSON.stringify({
          directory: {
            item: [{ name: "primary_doc.xml" }],
          },
        });
      }

      if (url.endsWith("primary_doc.xml")) {
        return `
          <edgarSubmission>
            <formData>
              <genInfo>
                <repPdDate>2026-01-31</repPdDate>
              </genInfo>
              <invstOrSec>
                <title>Apple Inc.</title>
                <cusip>037833100</cusip>
                <pctVal>6.5</pctVal>
              </invstOrSec>
            </formData>
          </edgarSubmission>
        `;
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    await expect(fetchSecNportHoldings("IVV")).resolves.toBeNull();
  });

  it("can match a proxy-resolved retirement-plan fund by description", async () => {
    await __testing.setSeriesClassMappings([
      {
        cik: "0000893818",
        organizationType: "30",
        seriesId: "S000032783",
        seriesName: "BLACKROCK LIFEPATH INDEX 2055 FUND",
        classId: "C000101160",
        className: "Class K Shares",
        normalizedSeriesName: "BLACKROCK LIFEPATH INDEX 2055 FUND",
        normalizedClassName: "CLASS K SHARES",
      },
    ]);
    __testing.setNowImplementation(() => Date.parse("2026-03-18T00:00:00Z"));
    await __testing.setFetchTextImplementation(async (url) => {
      if (url.includes("browse-edgar")) {
        return `
          <feed>
            <entry>
              <content>
                <filing-href>https://www.sec.gov/Archives/edgar/data/893818/000207169126004200/0002071691-26-004200-index.htm</filing-href>
              </content>
            </entry>
          </feed>
        `;
      }

      if (url.endsWith("index.json")) {
        return JSON.stringify({
          directory: {
            item: [{ name: "primary_doc.xml" }],
          },
        });
      }

      if (url.endsWith("primary_doc.xml")) {
        return `
          <edgarSubmission>
            <formData>
              <genInfo>
                <repPdDate>2026-01-31</repPdDate>
              </genInfo>
              <invstOrSec>
                <title>iShares Core MSCI Total Intl Stk ETF</title>
                <cusip>46434V373</cusip>
                <pctVal>37.5</pctVal>
              </invstOrSec>
            </formData>
          </edgarSubmission>
        `;
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    await expect(
      fetchSecNportHoldings("LIVKX", "BTC LPATH IDX 2055 M")
    ).resolves.toEqual([
      {
        symbol: "46434V373",
        holdingName: "iShares Core MSCI Total Intl Stk ETF",
        holdingPercent: 0.375,
      },
    ]);
  });
});
