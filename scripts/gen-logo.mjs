import sharp from "sharp";
import https from "node:https";
import { mkdirSync } from "node:fs";

// Logo enviada pelo usuário (sugestão #15), bucket público de sugestões
const SRC =
  "https://qlqewlrzjlbwrybwrimt.supabase.co/storage/v1/object/public/suggestions/99c9c485-e0a5-4bc4-906d-4d00ad447b03/1783427682586.jpg";

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (r) => {
        if (r.statusCode !== 200) return reject(new Error("HTTP " + r.statusCode));
        const chunks = [];
        r.on("data", (c) => chunks.push(c));
        r.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

const src = await download(SRC);

// 1) logo.png transparente: alfa = luminância (preto->transparente), RGB = branco
const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const rgba = Buffer.alloc(width * height * 4);
for (let i = 0, j = 0; i < data.length; i += channels, j += 4) {
  const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  rgba[j] = 255;
  rgba[j + 1] = 255;
  rgba[j + 2] = 255;
  rgba[j + 3] = lum;
}
const transparent = await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();

mkdirSync("public", { recursive: true });
await sharp(transparent).toFile("public/logo.png");

// 2) favicon: emblema branco num ladrilho escuro arredondado 64x64
const emblem = await sharp(transparent)
  .resize(52, 52, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();
const tile = Buffer.from(
  `<svg width="64" height="64"><rect width="64" height="64" rx="14" fill="#080b12"/></svg>`
);
await sharp(tile).composite([{ input: emblem, gravity: "center" }]).png().toFile("src/app/icon.png");

console.log("OK: public/logo.png +", `${width}x${height}`, "e src/app/icon.png 64x64");
