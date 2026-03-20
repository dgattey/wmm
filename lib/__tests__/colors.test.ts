import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  getColorForPortfolioId,
  getColorForSymbol,
  PORTFOLIO_BAR_SYMBOL_PREFIX,
  TREEMAP_MARK_STROKE,
  TREEMAP_MARK_TILE_FILLS,
  treemapStringHash32,
} from "../colors";

const HUE_SLOTS = 720;
const GOLDEN_ANGLE = 137.508;

function portfolioBarHueDegrees(id: string): number {
  const key = `${PORTFOLIO_BAR_SYMBOL_PREFIX}${id.trim()}`;
  const hash = treemapStringHash32(key);
  return ((hash % HUE_SLOTS) * GOLDEN_ANGLE) % 360;
}

describe("treemap mark icon", () => {
  it("public/icon.svg uses the same fills and stroke as lib/colors.ts", () => {
    // When this fails after a palette change, update icon.svg then run `pnpm generate-favicon`.
    const svgPath = join(process.cwd(), "public", "icon.svg");
    const svg = readFileSync(svgPath, "utf8");
    for (const fill of TREEMAP_MARK_TILE_FILLS) {
      expect(svg.toLowerCase()).toContain(`fill="${fill.toLowerCase()}"`);
    }
    expect(svg.toLowerCase()).toContain(
      `stroke="${TREEMAP_MARK_STROKE.toLowerCase()}"`
    );
  });
});

describe("getColorForPortfolioId", () => {
  it("is getColorForSymbol with a fixed namespace prefix", () => {
    const id = "ab12cd34efgh";
    expect(getColorForPortfolioId(id)).toMatch(/^#[0-9a-f]{6}$/i);
    expect(getColorForPortfolioId(id)).toBe(
      getColorForSymbol(`${PORTFOLIO_BAR_SYMBOL_PREFIX}${id}`)
    );
    expect(getColorForPortfolioId(id)).not.toBe(getColorForSymbol(id));
  });

  it("is stable for the same id", () => {
    expect(getColorForPortfolioId("x7k2m9p1qzab")).toBe(
      getColorForPortfolioId("x7k2m9p1qzab")
    );
  });

  it("spreads synthetic ids across hue octants (~uniform)", () => {
    const octantCounts = new Array(8).fill(0);
    const trials = 24_000;
    for (let i = 0; i < trials; i++) {
      const id = `pf${i.toString(36)}${((i * 2654435761) >>> 0).toString(36)}`;
      const hue = portfolioBarHueDegrees(id);
      const octant = Math.min(7, Math.floor(hue / 45));
      octantCounts[octant]++;
    }
    const expected = trials / 8;
    for (const count of octantCounts) {
      expect(count).toBeGreaterThan(expected * 0.82);
      expect(count).toBeLessThan(expected * 1.18);
    }
  });

  it("spreads portfolio-bar hash mod 8 (~uniform) for the same synthetic ids", () => {
    const mod8 = new Array(8).fill(0);
    const trials = 24_000;
    for (let i = 0; i < trials; i++) {
      const id = `pf${i.toString(36)}${((i * 2654435761) >>> 0).toString(36)}`;
      mod8[
        treemapStringHash32(`${PORTFOLIO_BAR_SYMBOL_PREFIX}${id}`) % 8
      ]++;
    }
    const expected = trials / 8;
    for (const count of mod8) {
      expect(count).toBeGreaterThan(expected * 0.82);
      expect(count).toBeLessThan(expected * 1.18);
    }
  });
});
