import fs from "fs";
import path from "path";
import { createCanvas, loadImage } from "canvas";

const ROOT = process.cwd();
const INPUT = path.join(ROOT, "exports", "knit-sort-layered", "generated_yarn_rolls_sheet.png");
const OUT = path.join(ROOT, "exports", "knit-sort-layered", "generated_yarn_rolls");
const names = ["yellow", "red", "blue", "navy", "sage", "teal", "forest", "pink"];
const key = { r: 255, g: 0, b: 255 };

function dist(r: number, g: number, b: number): number {
  return Math.abs(r - key.r) + Math.abs(g - key.g) + Math.abs(b - key.b);
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT, { recursive: true });
  const img = await loadImage(INPUT);
  const sheet = createCanvas(img.width, img.height);
  const sctx = sheet.getContext("2d");
  sctx.drawImage(img, 0, 0);

  const cellW = Math.floor(img.width / names.length);
  const pad = Math.floor(cellW * 0.06);

  for (let i = 0; i < names.length; i++) {
    const sx = i * cellW;
    const cropW = i === names.length - 1 ? img.width - sx : cellW;
    const raw = sctx.getImageData(sx, 0, cropW, img.height);
    let minX = cropW, minY = img.height, maxX = 0, maxY = 0;

    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < cropW; x++) {
        const idx = (y * cropW + x) * 4;
        if (dist(raw.data[idx], raw.data[idx + 1], raw.data[idx + 2]) > 85) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(cropW - 1, maxX + pad);
    maxY = Math.min(img.height - 1, maxY + pad);

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const out = createCanvas(w, h);
    const octx = out.getContext("2d");
    octx.drawImage(sheet, sx + minX, minY, w, h, 0, 0, w, h);
    const data = octx.getImageData(0, 0, w, h);

    for (let p = 0; p < data.data.length; p += 4) {
      const d = dist(data.data[p], data.data[p + 1], data.data[p + 2]);
      if (d < 58) {
        data.data[p + 3] = 0;
      } else if (d < 190) {
        data.data[p + 3] = Math.min(data.data[p + 3], Math.round(((d - 58) / 132) * 255));
        data.data[p] = Math.max(0, data.data[p] - 16);
        data.data[p + 2] = Math.max(0, data.data[p + 2] - 16);
      }
    }

    octx.putImageData(data, 0, 0);
    fs.writeFileSync(path.join(OUT, `yarn_roll_${names[i]}.png`), out.toBuffer("image/png"));
  }

  console.log(`Wrote ${names.length} yarn rolls to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
