import { describe, it, expect } from "vitest";
import { parseCSV } from "../parseCSV";

const VALID_HEADER =
  "Account Number,Account Name,Investment Type,Symbol,Description,Quantity,Last Price,Last Price Change,Current Value,Today's Gain/Loss Dollar,Today's Gain/Loss Percent,Total Gain/Loss Dollar,Total Gain/Loss Percent,Percent Of Account,Cost Basis Total,Average Cost Basis,Type";

function makeCSV(rows: string[]): string {
  return [VALID_HEADER, ...rows].join("\n");
}

const STOCK_ROW =
  'TEST-0001,Account A,Stocks,TSTA,SYNTHETIC ALPHA CORP,24,$50.00,+$0.50,$1200.00,+$12.00,+1.01%,+$240.00,+25.00%,12.00%,$960.00,$40.00,Cash,';
const ETF_ROW =
  'TEST-0001,Account A,ETFs,FUNDX,SYNTHETIC MARKET FUND,40,$75.00,-$0.25,$3000.00,-$10.00,-0.33%,+$300.00,+11.11%,30.00%,$2700.00,$67.50,Cash,';
const MONEY_MARKET_ROW =
  "TEST-0001,Account A,Cash,FZFXX**,HELD IN MONEY MARKET,,,,$450.00,,,,,4.50%,,,Cash,";
const PENDING_ROW =
  "TEST-0001,Account A,,Pending activity,,,,,-$25.00,,,,,,";
const BRKB_ROW =
  'TEST-0001,Account A,Stocks,BRKB,SYNTHETIC VALUE HOLDING,5,$80.00,-$0.50,$400.00,-$2.50,-0.63%,+$40.00,+11.11%,4.00%,$360.00,$72.00,Cash,';

describe("parseCSV", () => {
  it("parses a valid row with correct fields", () => {
    const result = parseCSV(makeCSV([STOCK_ROW]));
    expect(result).toHaveLength(1);
    const pos = result[0];
    expect(pos.symbol).toBe("TSTA");
    expect(pos.accountName).toBe("Account A");
    expect(pos.investmentType).toBe("Stocks");
    expect(pos.quantity).toBe(24);
    expect(pos.lastPrice).toBe(50);
    expect(pos.currentValue).toBe(1200);
    expect(pos.totalGainLossDollar).toBe(240);
    expect(pos.totalGainLossPercent).toBe(25);
    expect(pos.costBasisTotal).toBe(960);
  });

  it("parses multiple rows", () => {
    const result = parseCSV(makeCSV([STOCK_ROW, ETF_ROW]));
    expect(result).toHaveLength(2);
    expect(result[0].symbol).toBe("TSTA");
    expect(result[1].symbol).toBe("FUNDX");
    expect(result[1].investmentType).toBe("ETFs");
  });

  it("maps BRKB → BRK-B", () => {
    const result = parseCSV(makeCSV([BRKB_ROW]));
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("BRK-B");
  });

  it("strips ** from money market symbols and types as Cash", () => {
    const result = parseCSV(makeCSV([MONEY_MARKET_ROW]));
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("FZFXX");
    expect(result[0].investmentType).toBe("Cash");
  });

  it("skips pending activity rows", () => {
    const result = parseCSV(makeCSV([STOCK_ROW, PENDING_ROW]));
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("TSTA");
  });

  it("stops at disclaimer text", () => {
    const csv = makeCSV([
      STOCK_ROW,
      "",
      '"The data and information in this spreadsheet is provided..."',
    ]);
    const result = parseCSV(csv);
    expect(result).toHaveLength(1);
  });

  it("throws on file without Fidelity header", () => {
    expect(() => parseCSV("some,random,data\n1,2,3")).toThrow(
      "Invalid file"
    );
  });

  it("throws on file with header but no valid rows", () => {
    expect(() => parseCSV(makeCSV([PENDING_ROW]))).toThrow(
      "No valid positions"
    );
  });

  it("handles BOM character", () => {
    const csv = "\uFEFF" + makeCSV([STOCK_ROW]);
    const result = parseCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("TSTA");
  });

  it("handles Windows line endings", () => {
    const csv = makeCSV([STOCK_ROW]).replace(/\n/g, "\r\n");
    const result = parseCSV(csv);
    expect(result).toHaveLength(1);
  });

  it("cleans dollar signs, plus, percent from numeric values", () => {
    const result = parseCSV(makeCSV([STOCK_ROW]));
    expect(result[0].lastPriceChange).toBe(0.5);
    expect(result[0].todayGainLossDollar).toBe(12);
    expect(result[0].todayGainLossPercent).toBe(1.01);
  });

  it("handles quoted fields with commas (ETF descriptions)", () => {
    const row =
      'TEST-0001,Account A,ETFs,QTESX,"SYNTHETIC SERIES TRUST, SAMPLE EQUITY ETF",250,$20.00,-$0.10,$5000.00,-$25.00,-0.50%,+$500.00,+11.11%,50.00%,$4500.00,$18.00,Cash,';
    const result = parseCSV(makeCSV([row]));
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("QTESX");
    expect(result[0].description).toContain("SYNTHETIC SERIES TRUST");
  });
});
