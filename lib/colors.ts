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

const GOLDEN_ANGLE = 137.508;
const HUE_SLOTS = 720;

export function getColorForSymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return DEFAULT_TREEMAP_COLOR;

  const hash = fnv1a(normalized);

  const hue = ((hash % HUE_SLOTS) * GOLDEN_ANGLE) % 360;
  const saturation = 22 + ((hash >>> 11) % 20); // 22 – 41 %
  const lightness = 44 + ((hash >>> 17) % 14); // 44 – 57 %

  return hslToHex(hue, saturation, lightness);
}

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
