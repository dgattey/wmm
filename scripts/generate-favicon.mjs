/**
 * Generates favicon files per Evil Martians guide:
 * https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs
 *
 * Outputs: favicon.ico, apple-touch-icon.png
 * (public/icon.svg — treemap tile fills from lib/colors.ts TREEMAP_MARK_*)
 *
 * Run: node scripts/generate-favicon.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import toIco from "to-ico";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

async function generate() {
  // Single source of truth: read from icon.svg
  const svgBuffer = fs.readFileSync(path.join(publicDir, "icon.svg"));

  // favicon.ico (32x32, with 16x16 for legacy)
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const ico = await toIco([png32], { sizes: [16, 32] });
  fs.writeFileSync(path.join(publicDir, "favicon.ico"), ico);
  console.log("Generated favicon.ico");

  // apple-touch-icon.png (180×180 for iOS home screen)
  const appleTouch = await sharp(svgBuffer).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), appleTouch);
  console.log("Generated apple-touch-icon.png");
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
