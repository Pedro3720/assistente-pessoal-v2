/**
 * Reduz uma imagem no navegador (lado máximo `max` px) e exporta como JPEG File,
 * para caber no limite de corpo das Server Actions e economizar storage.
 * Client-only (usa document/canvas). Em falha, devolve o arquivo original.
 */
export async function resizeImage(file: File, max = 512, q = 0.85): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new window.Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Imagem inválida"));
    i.src = dataUrl;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", q)
  );
  if (!blob) return file;
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
