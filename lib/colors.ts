/**
 * Deterministic symbol → color mapping for the entire app.
 *
 * Uses FNV-1a (excellent for short ticker strings) to derive a 32-bit
 * hash, then computes H / S / L from independent bit-ranges:
 *
 *   Hue — golden-angle spacing over a 720-slot virtual ring so that
 *         adjacent hash values land ~137.5° apart in hue.
 *   Sat — bits 11-15 → 22–41 %  (muted / earthy tones, not candy)
 *   Lit — bits 17-21 → 44–57 %
 *
 * The effective colour space is ~720 × 26 × 18 ≈ 337 k distinct colours,
 * making collisions virtually impossible for real portfolios.
 *
 * Every component (treemap tiles, table avatars, fund chips) must call
 * `getColorForSymbol` — never maintain a separate colour list.
 */

export const DEFAULT_TREEMAP_COLOR = "#64748b";

/**
 * Pseudo-tickers for the treemap-mark icon (`public/icon.svg`). Each fill is
 * `getColorForSymbol(...)`, same algorithm as portfolio treemap tiles.
 */
export const TREEMAP_MARK_TILE_SYMBOLS = [
  "TILE-A",
  "TILE-B",
  "TILE-C",
  "TILE-D",
] as const;

/** Stroke for icon rects; matches light-theme `--border` (favicons are not theme-aware). */
export const TREEMAP_MARK_STROKE = "#e5e7eb";

const GOLDEN_ANGLE = 137.508;
const HUE_SLOTS = 720;

/** Pretend portfolio ids are tickers under this prefix so bar colors use the treemap pipeline. */
export const PORTFOLIO_BAR_SYMBOL_PREFIX = "wmm.bar|" as const;

function treemapColorFromHash32(hash: number): string {
  const hue = ((hash % HUE_SLOTS) * GOLDEN_ANGLE) % 360;
  const saturation = 22 + ((hash >>> 11) % 20); // 22 – 41 %
  const lightness = 44 + ((hash >>> 17) % 14); // 44 – 57 %
  return hslToHex(hue, saturation, lightness);
}

export function getColorForSymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return DEFAULT_TREEMAP_COLOR;
  return treemapColorFromHash32(fnv1a(normalized));
}

/**
 * Home library top bar: same `getColorForSymbol` path as the treemap. Portfolio ids are
 * hashed as synthetic tickers (`wmm.bar|<id>`) so they never collide with real symbols and
 * the FNV-1a input differs from a bare base36 string (less hue/sat clustering).
 */
export function getColorForPortfolioId(portfolioId: string): string {
  const trimmed = portfolioId.trim();
  if (!trimmed) return DEFAULT_TREEMAP_COLOR;
  return getColorForSymbol(`${PORTFOLIO_BAR_SYMBOL_PREFIX}${trimmed}`);
}

/** FNV-1a output for `symbol` after trim + uppercase; used by treemap colors and tests. */
export function treemapStringHash32(symbol: string): number {
  return fnv1a(symbol.trim().toUpperCase());
}

export const TREEMAP_MARK_TILE_FILLS: readonly [
  string,
  string,
  string,
  string,
] = [
  getColorForSymbol(TREEMAP_MARK_TILE_SYMBOLS[0]),
  getColorForSymbol(TREEMAP_MARK_TILE_SYMBOLS[1]),
  getColorForSymbol(TREEMAP_MARK_TILE_SYMBOLS[2]),
  getColorForSymbol(TREEMAP_MARK_TILE_SYMBOLS[3]),
];

/** FNV-1a 32-bit — strong avalanche for short strings like tickers. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = lNorm - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
