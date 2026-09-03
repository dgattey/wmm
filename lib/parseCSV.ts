import type { FidelityPosition, InvestmentType } from "./types";

/** Known symbol mappings: Fidelity symbol → Yahoo Finance symbol */
const SYMBOL_MAP: Record<string, string> = {
  BRKB: "BRK-B",
};

const INVESTMENT_TYPES: Record<string, InvestmentType> = {
  stocks: "Stocks",
  etfs: "ETFs",
  "mutual funds": "Mutual Funds",
  cash: "Cash",
  others: "Others",
};

/**
 * Parse a Fidelity portfolio positions CSV export into typed position objects.
 * Handles: BOM, quoted fields, dollar/percent cleaning, money market **, pending rows.
 */
export function parseCSV(raw: string): FidelityPosition[] {
  // Strip BOM if present
  let text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;

  // Normalize line endings
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const lines = text.split("\n");

  // Find the header row
  const headerIdx = lines.findIndex((line) =>
    line.toLowerCase().startsWith("account number,account name,")
  );
  if (headerIdx === -1) {
    throw new Error(
      "Invalid file: could not find Fidelity CSV header row. Make sure you're uploading a Fidelity portfolio positions export."
    );
  }

  const positions: FidelityPosition[] = [];

  // Parse data rows (everything after the header until we hit a blank or disclaimer)
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Stop at the disclaimer section (starts with a quote mark at the beginning of a paragraph)
    if (line.startsWith('"The data and information')) break;
    if (line.startsWith('"Brokerage services')) break;
    if (line.startsWith('"Date downloaded')) break;

    const fields = parseCSVLine(line);
    if (fields.length < 17) continue;

    const [
      accountNumber,
      accountName,
      investmentType,
      symbol,
      description,
      quantity,
      lastPrice,
      lastPriceChange,
      currentValue,
      todayGainLossDollar,
      todayGainLossPercent,
      totalGainLossDollar,
      totalGainLossPercent,
      percentOfAccount,
      costBasisTotal,
      averageCostBasis,
      type,
    ] = fields;

    // Skip rows without an investment type (like "Pending activity")
    if (!investmentType.trim()) continue;

    // Skip pending activity rows
    if (description?.toLowerCase().includes("pending activity")) continue;

    // Clean symbol: strip ** suffix from money market funds
    let cleanSymbol = symbol.replace(/\*+$/, "").trim();
    if (!cleanSymbol) continue;

    // Apply symbol mapping
    cleanSymbol = SYMBOL_MAP[cleanSymbol] || cleanSymbol;

    let cleanType =
      INVESTMENT_TYPES[investmentType.trim().toLowerCase()] ?? "Others";
    if (
      symbol.includes("**") ||
      description?.toLowerCase().includes("money market")
    ) {
      cleanType = "Cash";
    }

    positions.push({
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim(),
      investmentType: cleanType,
      symbol: cleanSymbol,
      description: description.trim(),
      quantity: cleanNumber(quantity),
      lastPrice: cleanNumber(lastPrice),
      lastPriceChange: cleanNumber(lastPriceChange),
      currentValue: cleanNumber(currentValue),
      todayGainLossDollar: cleanNumber(todayGainLossDollar),
      todayGainLossPercent: cleanNumber(todayGainLossPercent),
      totalGainLossDollar: cleanNumber(totalGainLossDollar),
      totalGainLossPercent: cleanNumber(totalGainLossPercent),
      percentOfAccount: cleanNumber(percentOfAccount),
      costBasisTotal: cleanNumber(costBasisTotal),
      averageCostBasis: cleanNumber(averageCostBasis),
      type: type?.trim() || "",
    });
  }

  if (positions.length === 0) {
    throw new Error(
      "No valid positions found in file. Make sure this is a Fidelity portfolio positions CSV export."
    );
  }

  return positions;
}

/**
 * Parse a single CSV line, handling quoted fields that may contain commas.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);

  return fields;
}

/**
 * Clean a numeric string by removing $, +, %, commas, and parsing as float.
 */
function cleanNumber(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[$,%+]/g, "").trim();
  if (!cleaned || cleaned === "--" || cleaned === "n/a") return 0;
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
