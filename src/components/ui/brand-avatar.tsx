import Image from "next/image";
import { brandSlugFor } from "@/lib/finance/brands";
import { cn } from "@/lib/utils";

/**
 * Tons neutros dessaturados para o fallback de inicial. Deliberadamente fora
 * da paleta categórica: a cor do avatar não pode competir com a cor que
 * significa categoria.
 */
const FALLBACK_TONES = ["#3a4356", "#4a4055", "#2f4a4a", "#4a4436", "#38414a"];

function toneFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return FALLBACK_TONES[Math.abs(hash) % FALLBACK_TONES.length];
}

/** Duas primeiras letras da primeira palavra com conteúdo. */
function initials(name: string): string {
  const word = name.trim().split(/\s+/)[0] ?? "";
  return word.slice(0, 2).toUpperCase() || "?";
}

export function BrandAvatar({
  name,
  size = 28,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const slug = brandSlugFor(name);

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: slug ? "#ffffff" : toneFor(name),
      }}
      aria-hidden
    >
      {slug ? (
        <Image src={`/brands/${slug}.svg`} alt="" width={size} height={size} />
      ) : (
        <span
          className="font-semibold text-white"
          style={{ fontSize: Math.round(size * 0.36) }}
        >
          {initials(name)}
        </span>
      )}
    </span>
  );
}
