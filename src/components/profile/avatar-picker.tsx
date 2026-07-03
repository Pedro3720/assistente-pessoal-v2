"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";
import { resizeImage } from "@/lib/images";

export const PRESET_AVATARS = [
  "/avatars/preset-1.svg",
  "/avatars/preset-2.svg",
  "/avatars/preset-3.svg",
  "/avatars/preset-4.svg",
  "/avatars/preset-5.svg",
  "/avatars/preset-6.svg",
];

/**
 * Escolha de avatar: presets OU upload de foto própria.
 * Submete via form nativo: <input type="file" name="avatar_file"> (foto própria)
 * e <input type="hidden" name="avatar_url"> (preset ou URL atual).
 */
export function AvatarPicker({
  name,
  initialUrl,
}: {
  name: string;
  initialUrl: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [presetUrl, setPresetUrl] = useState<string | null>(
    initialUrl && PRESET_AVATARS.includes(initialUrl) ? initialUrl : null
  );

  function pickPreset(url: string) {
    setPresetUrl(url);
    setPreview(url);
    if (fileRef.current) fileRef.current.value = ""; // limpa upload ao escolher preset
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPresetUrl(null); // foto própria vence o preset
    try {
      const small = await resizeImage(f, 512, 0.85);
      // injeta o arquivo reduzido de volta no input, para o form enviar o pequeno
      if (fileRef.current) {
        const dt = new DataTransfer();
        dt.items.add(small);
        fileRef.current.files = dt.files;
      }
      setPreview(URL.createObjectURL(small));
    } catch {
      setPreview(URL.createObjectURL(f)); // fallback: usa o original
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-full border border-border bg-muted">
          {preview ? (
            <Image src={preview} alt="Avatar" width={64} height={64} className="h-16 w-16 object-cover" unoptimized />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center text-xs text-muted-foreground">sem foto</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
        >
          <Upload className="h-4 w-4" /> Enviar foto
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESET_AVATARS.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => pickPreset(url)}
            className={`h-10 w-10 overflow-hidden rounded-full border-2 transition-all ${
              presetUrl === url ? "scale-110 border-foreground" : "border-transparent"
            }`}
          >
            <Image src={url} alt="Avatar" width={40} height={40} className="h-10 w-10" unoptimized />
          </button>
        ))}
      </div>

      {/* campos submetidos com o form */}
      <input ref={fileRef} type="file" name="avatar_file" accept="image/*" className="hidden" onChange={onFile} />
      <input type="hidden" name="avatar_url" value={presetUrl ?? initialUrl ?? ""} />
      <input type="hidden" data-picker={name} />
    </div>
  );
}
