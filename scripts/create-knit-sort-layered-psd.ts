import fs from "fs";
import path from "path";
import { createCanvas, loadImage, type Canvas, type CanvasRenderingContext2D } from "canvas";
import { writePsd } from "ag-psd";

const DOC_W = 852;
const DOC_H = 1846;
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "exports", "knit-sort-layered");
const ASSET_DIR = path.join(OUT_DIR, "assets");
const PSD_PATH = path.join(OUT_DIR, "Knit_Sort_Gameplay_Layered.psd");
const PNG_PATH = path.join(OUT_DIR, "Knit_Sort_Gameplay_Layered_preview.png");
const DESIGN_JSON_PATH = path.join(OUT_DIR, "Knit_Sort_Gameplay_design.json");
const REFERENCE_PATH = process.env.KNIT_SORT_REFERENCE_IMAGE ?? path.join(ROOT, "examples", "knit-sort-reference.png");
const GENERATED_YARN_DIR = path.join(OUT_DIR, "generated_yarn_balls");
const GENERATED_YARN_ROLL_DIR = path.join(OUT_DIR, "generated_yarn_rolls");

type LayerNode = {
  name: string;
  canvas?: Canvas;
  opacity?: number;
  hidden?: boolean;
  children?: LayerNode[];
};

type RenderLayer = { name: string; canvas: Canvas; opacity?: number; hidden?: boolean; group: string };

const flatLayers: RenderLayer[] = [];

function canvasLayer(name: string, group: string, draw: (ctx: CanvasRenderingContext2D) => void, opacity?: number): LayerNode {
  const canvas = createCanvas(DOC_W, DOC_H);
  const ctx = canvas.getContext("2d");
  draw(ctx);
  flatLayers.push({ name, canvas, opacity, group });
  return { name, canvas, opacity };
}

function rgba(hex: string, a = 1): string {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function capsule(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  roundedRect(ctx, x, y, w, h, Math.min(w, h) / 2);
}

function fillNoise(ctx: CanvasRenderingContext2D, color: string, density = 2400, alpha = 0.06): void {
  for (let i = 0; i < density; i++) {
    ctx.fillStyle = rgba(color, Math.random() * alpha);
    ctx.fillRect(Math.random() * DOC_W, Math.random() * DOC_H, Math.random() * 2 + 0.5, Math.random() * 2 + 0.5);
  }
}

function knitPattern(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, dark: string, scale = 1): void {
  ctx.save();
  roundedRect(ctx, x, y, w, h, Math.min(w, h) * 0.18);
  ctx.clip();

  const grd = ctx.createLinearGradient(x, y, x + w, y);
  grd.addColorStop(0, rgba(dark, 0.9));
  grd.addColorStop(0.18, rgba(color, 1));
  grd.addColorStop(0.55, rgba(color, 0.92));
  grd.addColorStop(1, rgba("#10081F", 0.85));
  ctx.fillStyle = grd;
  ctx.fillRect(x, y, w, h);

  const stepX = 18 * scale;
  const stepY = 22 * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let yy = y - stepY; yy < y + h + stepY; yy += stepY) {
    for (let xx = x - stepX; xx < x + w + stepX; xx += stepX) {
      ctx.strokeStyle = rgba("#FFFFFF", 0.12);
      ctx.lineWidth = 2.2 * scale;
      ctx.beginPath();
      ctx.moveTo(xx, yy + 2 * scale);
      ctx.bezierCurveTo(xx + 7 * scale, yy + 9 * scale, xx + 8 * scale, yy + 17 * scale, xx + 1 * scale, yy + 24 * scale);
      ctx.moveTo(xx + stepX, yy + 2 * scale);
      ctx.bezierCurveTo(xx + 11 * scale, yy + 9 * scale, xx + 10 * scale, yy + 17 * scale, xx + 17 * scale, yy + 24 * scale);
      ctx.stroke();

      ctx.strokeStyle = rgba("#05020B", 0.18);
      ctx.lineWidth = 1.5 * scale;
      ctx.beginPath();
      ctx.moveTo(xx + 2 * scale, yy + 6 * scale);
      ctx.bezierCurveTo(xx + 8 * scale, yy + 12 * scale, xx + 8 * scale, yy + 18 * scale, xx + 3 * scale, yy + 25 * scale);
      ctx.moveTo(xx + stepX - 2 * scale, yy + 6 * scale);
      ctx.bezierCurveTo(xx + 10 * scale, yy + 12 * scale, xx + 10 * scale, yy + 18 * scale, xx + stepX - 3 * scale, yy + 25 * scale);
      ctx.stroke();
    }
  }

  for (let i = 0; i < 110; i++) {
    ctx.strokeStyle = rgba("#FFFFFF", Math.random() * 0.09);
    ctx.lineWidth = Math.random() * 1.4 + 0.25;
    const yy = y + Math.random() * h;
    const xx = x + Math.random() * w;
    ctx.beginPath();
    ctx.moveTo(xx, yy);
    ctx.quadraticCurveTo(xx + Math.random() * 26 - 13, yy + Math.random() * 8 - 4, xx + Math.random() * 46 - 23, yy + Math.random() * 10 - 5);
    ctx.stroke();
  }

  ctx.restore();
}

function drawWoodBand(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rot = 0): void {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rot);
  ctx.translate(-w / 2, -h / 2);
  capsule(ctx, 0, 0, w, h);
  ctx.fillStyle = "#8B5732";
  ctx.fill();
  ctx.strokeStyle = "#D2A36E";
  ctx.lineWidth = 3;
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = i % 2 ? "rgba(47,24,12,.35)" : "rgba(241,186,117,.35)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(8, 5 + i * (h - 10) / 7);
    ctx.bezierCurveTo(w * 0.32, 1 + i * 2, w * 0.62, h - i * 2, w - 8, 5 + i * (h - 10) / 7);
    ctx.stroke();
  }
  ctx.restore();
}

function drawUTube(ctx: CanvasRenderingContext2D, cx: number, top: number, bottom: number, rx: number, lineWidth: number, color: string): void {
  ctx.beginPath();
  ctx.moveTo(cx - rx, top);
  ctx.lineTo(cx - rx, bottom - rx);
  ctx.quadraticCurveTo(cx - rx, bottom, cx, bottom);
  ctx.quadraticCurveTo(cx + rx, bottom, cx + rx, bottom - rx);
  ctx.lineTo(cx + rx, top);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function railLayer(name: string, group: string, cx: number, top: number, bottom: number, rx: number, width: number): LayerNode {
  return canvasLayer(name, group, (ctx) => {
    ctx.shadowColor = "rgba(0,0,0,.65)";
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 14;
    drawUTube(ctx, cx, top, bottom, rx, width + 42, "#12072B");
    ctx.shadowBlur = 0;
    drawUTube(ctx, cx, top, bottom, rx, width + 28, "#31205F");
    drawUTube(ctx, cx, top, bottom, rx, width + 10, "#694C91");
    drawUTube(ctx, cx, top, bottom, rx, width - 8, "#35235E");
    drawUTube(ctx, cx, top, bottom, rx, 4, "#C89758");
    drawUTube(ctx, cx, top + 4, bottom - 3, rx - 18, 3, "rgba(252,205,126,.65)");
    drawUTube(ctx, cx, top - 2, bottom + 1, rx + 20, 3, "rgba(22,10,44,.9)");
  });
}

function bulbLayer(name: string, group: string, points: Array<[number, number]>): LayerNode {
  return canvasLayer(name, group, (ctx) => {
    for (const [x, y] of points) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 18);
      g.addColorStop(0, "rgba(255,231,145,.95)");
      g.addColorStop(0.25, "rgba(255,170,74,.75)");
      g.addColorStop(1, "rgba(255,126,48,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFE198";
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function yarnSegment(name: string, group: string, x: number, y: number, w: number, h: number, color: string, dark: string, rot = 0): LayerNode {
  return canvasLayer(name, group, (ctx) => {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rot);
    ctx.translate(-x - w / 2, -y - h / 2);
    ctx.shadowColor = "rgba(0,0,0,.55)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    knitPattern(ctx, x, y, w, h, color, dark, 0.8);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,.12)";
    ctx.lineWidth = 2;
    roundedRect(ctx, x + 4, y + 4, w - 8, h - 8, 28);
    ctx.stroke();
    ctx.restore();
  });
}

async function generatedYarnRoll(
  name: string,
  group: string,
  fileName: string,
  x: number,
  y: number,
  w: number,
  h: number,
  rot = 0
): Promise<LayerNode> {
  const source = path.join(GENERATED_YARN_ROLL_DIR, fileName);
  if (!fs.existsSync(source)) {
    return yarnSegment(name, group, x, y, w, h, "#6F42A7", "#2D1750", rot);
  }

  const img = await loadImage(source);
  return canvasLayer(name, group, (ctx) => {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rot);
    ctx.translate(-x - w / 2, -y - h / 2);
    ctx.shadowColor = "rgba(0,0,0,.58)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 9;
    ctx.drawImage(img, x, y, w, h);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,.10)";
    ctx.lineWidth = 1.5;
    roundedRect(ctx, x + 5, y + 5, w - 10, h - 10, Math.min(w, h) * 0.2);
    ctx.stroke();
    ctx.restore();
  });
}

function yarnBall(name: string, group: string, x: number, y: number, r: number, color: string, dark: string): LayerNode {
  return canvasLayer(name, group, (ctx) => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.6)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.35, 4, x, y, r);
    g.addColorStop(0, rgba("#FFFFFF", 0.42));
    g.addColorStop(0.18, color);
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.92, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.clip();
    for (let i = 0; i < 36; i++) {
      ctx.strokeStyle = i % 3 === 0 ? rgba("#FFFFFF", 0.18) : rgba("#05020B", 0.22);
      ctx.lineWidth = 3 + (i % 4);
      const yy = y - r + (i / 35) * r * 2;
      ctx.beginPath();
      ctx.ellipse(x, yy, r * (0.75 + Math.sin(i) * 0.12), r * 0.18, (i * 0.45) % Math.PI, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 24; i++) {
      ctx.strokeStyle = rgba("#06020C", 0.18);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - r + Math.random() * r * 2, y - r + Math.random() * r * 2);
      ctx.bezierCurveTo(x - r, y - r * 0.2, x + r, y + r * 0.2, x - r + Math.random() * r * 2, y - r + Math.random() * r * 2);
      ctx.stroke();
    }
    ctx.restore();
  });
}

async function generatedYarnBall(name: string, group: string, fileName: string, x: number, y: number, w: number, h: number): Promise<LayerNode> {
  const source = path.join(GENERATED_YARN_DIR, fileName);
  if (!fs.existsSync(source)) {
    return yarnBall(name, group, x + w / 2, y + h / 2, Math.min(w, h) / 2, "#7643A8", "#2A1448");
  }

  const img = await loadImage(source);
  return canvasLayer(name, group, (ctx) => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.56)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  });
}

function panelLayer(name: string, group: string, x: number, y: number, w: number, h: number, r: number): LayerNode {
  return canvasLayer(name, group, (ctx) => {
    ctx.shadowColor = "rgba(0,0,0,.65)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 14;
    roundedRect(ctx, x, y, w, h, r);
    ctx.fillStyle = "#28164E";
    ctx.fill();
    ctx.shadowBlur = 0;
    roundedRect(ctx, x + 16, y + 18, w - 32, h - 36, r - 14);
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, "#8A54B5");
    g.addColorStop(0.08, "#5E348B");
    g.addColorStop(1, "#271549");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "#D6A660";
    ctx.lineWidth = 3;
    roundedRect(ctx, x + 26, y + 28, w - 52, h - 56, r - 22);
    ctx.stroke();
    ctx.strokeStyle = "rgba(236,180,255,.62)";
    ctx.lineWidth = 5;
    roundedRect(ctx, x + 34, y + 38, w - 68, h - 76, r - 28);
    ctx.stroke();
    fillNoise(ctx, "#FFFFFF", 1200, 0.035);
  });
}

async function main(): Promise<void> {
  fs.mkdirSync(ASSET_DIR, { recursive: true });

  const bg = canvasLayer("BG velvet floor and vignette", "01_BACKGROUND", (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, DOC_H);
    g.addColorStop(0, "#09071D");
    g.addColorStop(0.44, "#20113A");
    g.addColorStop(1, "#07051A");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, DOC_W, DOC_H);
    knitPattern(ctx, 255, -10, 342, 640, "#211D60", "#100C37", 0.9);
    const vignette = ctx.createRadialGradient(DOC_W / 2, DOC_H * 0.43, 90, DOC_W / 2, DOC_H * 0.45, 800);
    vignette.addColorStop(0, "rgba(97,62,135,.18)");
    vignette.addColorStop(1, "rgba(0,0,0,.7)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, DOC_W, DOC_H);
    fillNoise(ctx, "#FFFFFF", 4200, 0.05);
  });

  const outerRail = railLayer("Outer purple U rail with gold pinstripe", "02_MACHINE_FRAME", DOC_W / 2, -40, 865, 375, 80);
  const innerRail = railLayer("Inner yarn track U rail", "02_MACHINE_FRAME", DOC_W / 2, 0, 675, 210, 64);

  const bulbs = bulbLayer("Warm bulbs following side rails", "02_MACHINE_FRAME", [
    [96, 210], [108, 360], [111, 520], [112, 690], [180, 113], [248, 88],
    [604, 88], [672, 113], [740, 210], [744, 360], [742, 520], [740, 690],
    [365, 870], [426, 870], [486, 870],
  ]);

  const topYarns: LayerNode[] = [
    await generatedYarnRoll("Generated realistic yellow yarn roll upper left", "03_YARN_TRACK/LEFT_STACK", "yarn_roll_yellow.png", 123, 27, 122, 198),
    await generatedYarnRoll("Generated realistic red yarn roll middle left", "03_YARN_TRACK/LEFT_STACK", "yarn_roll_red.png", 122, 212, 126, 188),
    await generatedYarnRoll("Generated realistic blue yarn roll lower left", "03_YARN_TRACK/LEFT_STACK", "yarn_roll_blue.png", 124, 393, 128, 204, -0.04),
    await generatedYarnRoll("Generated realistic navy yarn roll curve left", "03_YARN_TRACK/LEFT_STACK", "yarn_roll_navy.png", 170, 570, 166, 118, 0.42),
    await generatedYarnRoll("Generated realistic sage yarn roll upper right", "03_YARN_TRACK/RIGHT_STACK", "yarn_roll_sage.png", 609, 30, 124, 207),
    await generatedYarnRoll("Generated realistic teal yarn roll middle right", "03_YARN_TRACK/RIGHT_STACK", "yarn_roll_teal.png", 606, 219, 128, 222),
    await generatedYarnRoll("Generated realistic forest yarn roll lower right", "03_YARN_TRACK/RIGHT_STACK", "yarn_roll_forest.png", 606, 424, 130, 196),
    await generatedYarnRoll("Generated realistic pink yarn roll curve right", "03_YARN_TRACK/RIGHT_STACK", "yarn_roll_pink.png", 566, 590, 166, 118, -0.38),
    yarnSegment("Yarn tube orange bottom center", "03_YARN_TRACK/BOTTOM_CURVE", 334, 647, 196, 80, "#E6791D", "#7B2D0B"),
    yarnSegment("Small purple gate yarn roll", "03_YARN_TRACK/BOTTOM_CURVE", 355, 744, 140, 92, "#6F42A7", "#2D1750"),
  ];

  const bands = canvasLayer("Individual wood separators and hinges", "03_YARN_TRACK/WOOD_BANDS", (ctx) => {
    drawWoodBand(ctx, 110, 203, 150, 26, -0.02);
    drawWoodBand(ctx, 110, 390, 154, 25, 0.02);
    drawWoodBand(ctx, 205, 589, 120, 23, 0.42);
    drawWoodBand(ctx, 590, 212, 150, 25, 0.02);
    drawWoodBand(ctx, 590, 422, 154, 25, -0.02);
    drawWoodBand(ctx, 565, 595, 145, 26, -0.32);
    drawWoodBand(ctx, 325, 642, 32, 93, 0);
    drawWoodBand(ctx, 518, 642, 32, 93, 0);
    drawWoodBand(ctx, 385, 624, 14, 41, 0);
    drawWoodBand(ctx, 456, 624, 14, 41, 0);
  });

  const trayPanel = panelLayer("Empty purple placement tray with velvet texture", "04_PLAY_AREA", 112, 920, 628, 410, 58);
  const lowerCase = panelLayer("Bottom spool storage case", "05_SPOOL_TRAY", 10, 1350, 832, 352, 44);

  const dividers = canvasLayer("Spool tray dividers and base cups", "05_SPOOL_TRAY", (ctx) => {
    for (const x of [178, 328, 480, 632]) {
      ctx.strokeStyle = "#5B3B7C";
      ctx.lineWidth = 15;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, 1420);
      ctx.lineTo(x, 1628);
      ctx.stroke();
    }
    for (const x of [95, 247, 402, 554, 706]) drawWoodBand(ctx, x - 58, 1603, 116, 26, 0);
    knitPattern(ctx, 52, 1628, 745, 42, "#5D348D", "#241042", 0.65);
  });

  const spoolBalls: LayerNode[] = [
    await generatedYarnBall("Generated detailed yellow yarn ball", "05_SPOOL_TRAY/SPOOLS", "yarn_ball_yellow.png", 36, 1436, 126, 142),
    await generatedYarnBall("Generated detailed red yarn ball", "05_SPOOL_TRAY/SPOOLS", "yarn_ball_red.png", 190, 1438, 126, 140),
    await generatedYarnBall("Generated detailed blue yarn ball", "05_SPOOL_TRAY/SPOOLS", "yarn_ball_blue.png", 342, 1436, 126, 141),
    await generatedYarnBall("Generated detailed orange yarn ball", "05_SPOOL_TRAY/SPOOLS", "yarn_ball_orange.png", 494, 1436, 126, 142),
    await generatedYarnBall("Generated detailed green yarn ball", "05_SPOOL_TRAY/SPOOLS", "yarn_ball_green.png", 646, 1436, 126, 142),
  ];

  const sideProps = canvasLayer("Foreground baskets needles loose yarn props", "06_FOREGROUND_PROPS", (ctx) => {
    knitPattern(ctx, -40, 990, 130, 110, "#764B84", "#2F1840", 0.55);
    knitPattern(ctx, 736, 980, 140, 112, "#7D2535", "#32101A", 0.55);
    ctx.strokeStyle = "#8A5532";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    for (const x of [770, 802, 825]) {
      ctx.beginPath();
      ctx.moveTo(x, 855);
      ctx.lineTo(x + 48, 1018);
      ctx.stroke();
      ctx.fillStyle = "#A86A42";
      ctx.beginPath();
      ctx.arc(x, 855, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    drawWoodBand(ctx, -22, 1128, 112, 44, -0.2);
    knitPattern(ctx, 48, 1740, 190, 70, "#4E2675", "#1B0A31", 0.6);
    knitPattern(ctx, 610, 1718, 235, 80, "#4D2676", "#1A0A31", 0.6);
  });

  const children: LayerNode[] = [
    { name: "01_BACKGROUND", children: [bg] },
    { name: "02_MACHINE_FRAME", children: [outerRail, innerRail, bulbs] },
    { name: "03_YARN_TRACK", children: [...topYarns, bands] },
    { name: "04_PLAY_AREA", children: [trayPanel] },
    { name: "05_SPOOL_TRAY", children: [lowerCase, dividers, ...spoolBalls] },
    { name: "06_FOREGROUND_PROPS", children: [sideProps] },
  ];

  if (fs.existsSync(REFERENCE_PATH)) {
    const refImage = await loadImage(REFERENCE_PATH);
    const refCanvas = createCanvas(DOC_W, DOC_H);
    const refCtx = refCanvas.getContext("2d");
    refCtx.drawImage(refImage, 0, 0, DOC_W, DOC_H);
    children.unshift({
      name: "00_REFERENCE_IMAGE_HIDDEN",
      hidden: true,
      children: [{ name: "Original reference image hidden", canvas: refCanvas, hidden: true, opacity: 35 }],
    });
  }

  const psd = {
    width: DOC_W,
    height: DOC_H,
    children,
  };

  fs.writeFileSync(PSD_PATH, Buffer.from(writePsd(psd as any)));

  const preview = createCanvas(DOC_W, DOC_H);
  const pctx = preview.getContext("2d");
  for (const layer of flatLayers) {
    if (layer.hidden) continue;
    pctx.save();
    pctx.globalAlpha = (layer.opacity ?? 100) / 100;
    pctx.drawImage(layer.canvas, 0, 0);
    pctx.restore();
    const fileName = `${layer.group.replaceAll("/", "__")}__${layer.name.replace(/[^a-z0-9]+/gi, "_")}.png`;
    fs.writeFileSync(path.join(ASSET_DIR, fileName), layer.canvas.toBuffer("image/png"));
  }
  fs.writeFileSync(PNG_PATH, preview.toBuffer("image/png"));

  const designJson = {
    document: {
      name: "Knit_Sort_Gameplay_Layered",
      width: DOC_W,
      height: DOC_H,
      backgroundColor: "#09071D",
      resolution: 72,
      colorMode: "RGB",
    },
    sourceReference: REFERENCE_PATH,
    groups: children.map((g) => g.name),
    layers: flatLayers.map((layer) => ({
      type: "asset",
      layerName: layer.name,
      parentGroup: layer.group,
      x: 0,
      y: 0,
      scale: 100,
      opacity: layer.opacity ?? 100,
    })),
    exports: [
      { type: "psd", path: PSD_PATH },
      { type: "png", path: PNG_PATH },
    ],
  };
  fs.writeFileSync(DESIGN_JSON_PATH, JSON.stringify(designJson, null, 2));

  console.log(`PSD: ${PSD_PATH}`);
  console.log(`PNG: ${PNG_PATH}`);
  console.log(`Assets: ${ASSET_DIR}`);
  console.log(`Design JSON: ${DESIGN_JSON_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
