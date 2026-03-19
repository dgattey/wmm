import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  TREEMAP_MARK_STROKE,
  TREEMAP_MARK_TILE_FILLS,
} from "../colors";

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
