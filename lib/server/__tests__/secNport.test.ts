import { describe, expect, it } from "vitest";

import { __private__ } from "../secNport";

describe("secNport helpers", () => {
  it("keeps the latest filing for a series and resolves mapped tickers", () => {
    const submissions = new Map([
      [
        "0000000001-25-000001",
        { filingDate: "01-JAN-2025", reportDate: "31-DEC-2024" },
      ],
      [
        "0000000001-25-000002",
        { filingDate: "15-FEB-2025", reportDate: "31-JAN-2025" },
      ],
    ]);
    const registrants = new Map([
      [
        "0000000001-25-000001",
        { cik: "0000000001", registrantName: "Vanguard Index Funds" },
      ],
      [
        "0000000001-25-000002",
        { cik: "0000000001", registrantName: "Vanguard Index Funds" },
      ],
    ]);
    const fundRows = [
      {
        ACCESSION_NUMBER: "0000000001-25-000001",
        SERIES_ID: "S000002848",
        SERIES_NAME: "VANGUARD TOTAL STOCK MARKET INDEX FUND",
      },
      {
        ACCESSION_NUMBER: "0000000001-25-000002",
        SERIES_ID: "S000002848",
        SERIES_NAME: "VANGUARD TOTAL STOCK MARKET INDEX FUND",
      },
    ];

    const metadata = __private__.buildMetadataIndex(submissions, registrants, fundRows);

    expect(metadata.bySeriesId.S000002848).toMatchObject({
      accessionNumber: "0000000001-25-000002",
      seriesName: "VANGUARD TOTAL STOCK MARKET INDEX FUND",
    });

    const resolved = __private__.findResolvedFund(
      {
        symbol: "VTI",
        description: "VANGUARD INDEX FDS VANGUARD TOTAL STK MKT ETF",
      },
      {
        archive: { archiveId: "2025q4", archiveUrl: "https://example.test/2025q4_nport.zip" },
        bySeriesId: metadata.bySeriesId,
        candidates: metadata.candidates,
      },
      {
        VTI: {
          cik: "0000036405",
          classId: "C000007808",
          seriesId: "S000002848",
          symbol: "VTI",
        },
      }
    );

    expect(resolved).toMatchObject({
      accessionNumber: "0000000001-25-000002",
      seriesId: "S000002848",
    });
  });

  it("uses conservative description matching for non-standard symbols", () => {
    const submissions = new Map([
      [
        "0000000002-25-000001",
        { filingDate: "15-FEB-2025", reportDate: "31-JAN-2025" },
      ],
      [
        "0000000003-25-000001",
        { filingDate: "15-FEB-2025", reportDate: "31-JAN-2025" },
      ],
    ]);
    const registrants = new Map([
      [
        "0000000002-25-000001",
        { cik: "0000000002", registrantName: "Fidelity Concord Street Trust" },
      ],
      [
        "0000000003-25-000001",
        { cik: "0000000003", registrantName: "Fidelity Salem Street Trust" },
      ],
    ]);
    const fundRows = [
      {
        ACCESSION_NUMBER: "0000000002-25-000001",
        SERIES_ID: "S000006027",
        SERIES_NAME: "FIDELITY 500 INDEX FUND",
      },
      {
        ACCESSION_NUMBER: "0000000003-25-000001",
        SERIES_ID: "S000006028",
        SERIES_NAME: "FIDELITY SAI SMALL-MID CAP 500 INDEX FUND",
      },
    ];

    const metadata = __private__.buildMetadataIndex(submissions, registrants, fundRows);

    const resolved = __private__.findResolvedFund(
      {
        symbol: "900000001",
        description: "FIDELITY 500 INDEX FUND",
      },
      {
        archive: { archiveId: "2025q4", archiveUrl: "https://example.test/2025q4_nport.zip" },
        bySeriesId: metadata.bySeriesId,
        candidates: metadata.candidates,
      },
      {}
    );

    expect(resolved).toMatchObject({
      accessionNumber: "0000000002-25-000001",
      seriesId: "S000006027",
    });
  });

  it("builds stable holding identifiers for non-ticker rows", () => {
    expect(
      __private__.chooseSyntheticHoldingSymbol({
        assetCategory: "EC",
        accessionNumber: "A",
        holdingId: "1",
        issuerCusip: "",
        issuerName: "Cash Sleeve",
        issuerTitle: "CASH",
        percentage: "0.1",
      })
    ).toBe("CASH");

    expect(
      __private__.chooseSyntheticHoldingSymbol({
        assetCategory: "DBT",
        accessionNumber: "A",
        holdingId: "1",
        issuerCusip: "91282CNN7",
        issuerName: "United States Treasury",
        issuerTitle: "US Treasury Note",
        percentage: "0.1",
      })
    ).toBe("91282CNN7");
  });

  it("converts SEC percentage points into decimal holding weights", () => {
    expect(__private__.parseSecHoldingPercent("6.25")).toBeCloseTo(0.0625);
    expect(__private__.parseSecHoldingPercent(".5")).toBeCloseTo(0.005);
  });
});
