/**
 * Muted, sophisticated color palette for treemap visualization.
 * Desaturated hues that feel refined — not vivid/garish Tailwind defaults.
 */

const PALETTE = [
  { base: "#5B7BA8", light: "#8FA8CB", name: "slate-blue" },
  { base: "#8B74AB", light: "#B0A0C8", name: "dusty-purple" },
  { base: "#4E9999", light: "#80BABA", name: "muted-teal" },
  { base: "#C49A5C", light: "#D9BC8E", name: "warm-sand" },
  { base: "#5E9E74", light: "#8FC0A0", name: "sage" },
  { base: "#B86B6B", light: "#D09999", name: "dusty-rose" },
  { base: "#7A8FB8", light: "#A3B4D0", name: "steel" },
  { base: "#9C7EA0", light: "#BFA6C2", name: "mauve" },
  { base: "#6A9B8F", light: "#96BDB3", name: "seafoam" },
  { base: "#C08B56", light: "#D4AD82", name: "copper" },
  { base: "#7BAA6C", light: "#A3C898", name: "olive-sage" },
  { base: "#A87B8E", light: "#C5A3B2", name: "plum" },
  { base: "#5E8EA8", light: "#8CB3C8", name: "ocean" },
  { base: "#B07878", light: "#CCA5A5", name: "clay" },
  { base: "#A89B5C", light: "#C8BD8A", name: "wheat" },
  { base: "#6BA088", light: "#98C0AD", name: "mint" },
  { base: "#9878A8", light: "#B8A0C5", name: "iris" },
  { base: "#5A95A0", light: "#88B8C0", name: "stone-blue" },
  { base: "#8A7CA0", light: "#AEA3BE", name: "lavender" },
  { base: "#A88070", light: "#C8A89C", name: "terra" },
  { base: "#6A9878", light: "#95BBA0", name: "fern" },
  { base: "#7088A8", light: "#9CB0C8", name: "denim" },
  { base: "#A89060", light: "#C8B48E", name: "camel" },
  { base: "#8E6E8A", light: "#B298AE", name: "berry" },
];

const INDIVIDUAL_STOCK_COLOR = { base: "#7A8694", light: "#9CA8B4" };

export interface ColorAssignment {
  base: string;
  light: string;
}

export function assignColors(
  symbols: string[]
): Record<string, ColorAssignment> {
  const result: Record<string, ColorAssignment> = {};
  let colorIdx = 0;

  for (const symbol of symbols) {
    result[symbol] = PALETTE[colorIdx % PALETTE.length];
    colorIdx++;
  }

  return result;
}

export function getIndividualStockColor(): ColorAssignment {
  return INDIVIDUAL_STOCK_COLOR;
}

/**
 * Generate child colors by blending the parent base toward white/light.
 * Produces softer, layered variants.
 */
export function getChildColor(parentBase: string, index: number): string {
  const opacities = [0.88, 0.75, 0.65, 0.55, 0.48, 0.42, 0.38, 0.34];
  const opacity = opacities[index % opacities.length];
  return hexWithOpacity(parentBase, opacity);
}

function hexWithOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const blend = (c: number) => Math.round(c * opacity + 255 * (1 - opacity));
  return `#${blend(r).toString(16).padStart(2, "0")}${blend(g).toString(16).padStart(2, "0")}${blend(b).toString(16).padStart(2, "0")}`;
}
