"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Trash2, Check, RotateCcw, Mail } from "lucide-react";
import { toast } from "sonner";
import { adminSetSuggestionStatus, adminDeleteSuggestion } from "@/lib/actions/suggestion";
import { formatDateBR } from "@/lib/dates";
import type { SuggestionWithAuthor } from "@/types/suggestion";

/** Imagens de uma sugestão (usa image_urls; cai para image_url em linhas antigas). */
function imagesOf(s: SuggestionWithAuthor): string[] {
  if (s.image_urls?.length) return s.image_urls;
  return s.image_url ? [s.image_url] : [];
}

export function AdminSuggestionsView({ suggestions }: { suggestions: SuggestionWithAuthor[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"todas" | "aberto" | "feito">("todas");

  const shown = suggestions.filter((s) => filter === "todas" || s.status === filter);

  async function toggle(s: SuggestionWithAuthor) {
    try {
      await adminSetSuggestionStatus(s.id, s.status === "feito" ? "aberto" : "feito");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  async function remove(id: number) {
    if (!confirm("Excluir esta sugestão do usuário?")) return;
    try {
      await adminDeleteSuggestion(id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["todas", "aberto", "feito"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:bg-accent/80"
            }`}
          >
            {f === "todas" ? "Todas" : f === "aberto" ? "Abertas" : "Feitas"}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">Nenhuma sugestão.</p>
      ) : (
        shown.map((s) => (
          <div key={s.id} className="glass card-glow rounded-2xl border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.status === "feito" ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}>
                    {s.status === "feito" ? "Feito" : "Aberto"}
                  </span>
                  <h3 className={`truncate font-medium ${s.status === "feito" ? "text-muted-foreground line-through" : ""}`}>{s.title}</h3>
                </div>
                {s.description && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{s.description}</p>}
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{s.author_email}</span>
                  {s.author_name && <span>· {s.author_name}</span>}
                  <span>· {formatDateBR(s.created_at.slice(0, 10))}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => toggle(s)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent" title={s.status === "feito" ? "Reabrir" : "Marcar feito"}>
                  {s.status === "feito" ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                </button>
                <button onClick={() => remove(s.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent" title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {imagesOf(s).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {imagesOf(s).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                    <Image src={url} alt={`print ${i + 1}`} width={480} height={270} className="max-h-60 w-auto rounded-lg border border-border object-contain" unoptimized />
                  </a>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
