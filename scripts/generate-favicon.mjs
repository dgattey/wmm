/**
 * Generates favicon files per Evil Martians guide:
 * https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs
 *
 * Outputs: favicon.ico, apple-touch-icon.png
 * (icon.svg is maintained separately in public/)
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

const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0ea5e9"/>
      <stop offset="100%" style="stop-color:#0284c7"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="6" fill="url(#bg)"/>
  <text x="16" y="24" font-family="system-ui,Arial,sans-serif" font-size="20" font-weight="700" fill="white" text-anchor="middle">$</text>
</svg>
`;

async function generate() {
  const svgBuffer = Buffer.from(SVG);

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
