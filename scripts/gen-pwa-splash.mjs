import sharp from "sharp";
import { mkdirSync } from "node:fs";

const BG = { r: 8, g: 11, b: 18, alpha: 1 }; // #080b12 (marca)
const LOGO = "public/logo.png";

// iPhones (portrait), em pontos CSS. Manter em sync com components/pwa/apple-splash.tsx.
const DEVICES = [
  { w: 375, h: 667, dpr: 2 }, // SE 2/3, 8
  { w: 414, h: 896, dpr: 2 }, // XR, 11
  { w: 414, h: 896, dpr: 3 }, // XS Max, 11 Pro Max
  { w: 375, h: 812, dpr: 3 }, // X, XS, 11 Pro
  { w: 360, h: 780, dpr: 3 }, // 12/13 mini
  { w: 390, h: 844, dpr: 3 }, // 12/13/14
  { w: 428, h: 926, dpr: 3 }, // 12/13 Pro Max, 14 Plus
  { w: 393, h: 852, dpr: 3 }, // 14 Pro, 15, 15 Pro
  { w: 430, h: 932, dpr: 3 }, // 14/15 Pro Max, 15 Plus
];

mkdirSync("public/splash", { recursive: true });

for (const d of DEVICES) {
  const pw = d.w * d.dpr;
  const ph = d.h * d.dpr;
  const logoSize = Math.round(pw * 0.4);
  const emblem = await sharp(LOGO)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const out = `public/splash/splash-${pw}x${ph}.png`;
  await sharp({ create: { width: pw, height: ph, channels: 4, background: BG } })
    .composite([{ input: emblem, gravity: "center" }])
    .png()
    .toFile(out);
  console.log("wrote", out);
}
console.log("PWA splash OK");
