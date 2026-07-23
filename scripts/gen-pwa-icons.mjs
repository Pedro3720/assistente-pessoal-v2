import sharp from "sharp";
import { mkdirSync } from "node:fs";

const BG = { r: 8, g: 11, b: 18, alpha: 1 }; // #080b12 (marca)
const LOGO = "public/logo.png"; // emblema branco transparente (gerado por gen-logo.mjs)

mkdirSync("public/icons", { recursive: true });

async function icon(size, out, pad) {
  const inner = Math.round(size * (1 - pad * 2));
  const emblem = await sharp(LOGO)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: emblem, gravity: "center" }])
    .png()
    .toFile(out);
  console.log("wrote", out, `${size}x${size}`);
}

await icon(192, "public/icons/icon-192.png", 0.16);
await icon(512, "public/icons/icon-512.png", 0.16);
await icon(512, "public/icons/icon-512-maskable.png", 0.28); // safe zone maior
await icon(180, "public/icons/apple-touch-icon.png", 0.16); // iOS arredonda os cantos
console.log("PWA icons OK");
