import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brandDir = join(root, "public", "brand");
const appDir = join(root, "src", "app");
const svgPath = join(brandDir, "logo-mark.svg");
const svg = readFileSync(svgPath);

mkdirSync(brandDir, { recursive: true });

function exportPng(filename, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    background: "#faf8f5",
  });
  const png = resvg.render().asPng();
  const out = join(brandDir, filename);
  writeFileSync(out, png);
  console.log(`  ${filename} (${size}x${size}, ${png.length} bytes)`);
  return out;
}

console.log("Exporting brand PNGs from logo-mark.svg…");
exportPng("logo-google-120.png", 120);
exportPng("favicon-32.png", 32);
exportPng("favicon-16.png", 16);
exportPng("apple-touch-icon.png", 180);
exportPng("icon-512.png", 512);

const icon32 = join(brandDir, "favicon-32.png");
copyFileSync(icon32, join(appDir, "icon.png"));
copyFileSync(join(brandDir, "apple-touch-icon.png"), join(appDir, "apple-icon.png"));
console.log("  → copied to src/app/icon.png and src/app/apple-icon.png");

console.log("Done.");
