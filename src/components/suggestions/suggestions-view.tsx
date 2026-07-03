"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Trash2, Check, RotateCcw, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { resizeImage } from "@/lib/images";
import { createSuggestion, setSuggestionStatus, deleteSuggestion } from "@/lib/actions/suggestion";
import { formatDateBR } from "@/lib/dates";
import type { Suggestion } from "@/types/suggestion";

export function SuggestionsView({ suggestions }: { suggestions: Suggestion[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const small = await resizeImage(f, 1024, 0.85);
      const dt = new DataTransfer();
      dt.items.add(small);
      e.target.files = dt.files;
    } catch {
      /* usa original */
    }
  }

  async function action(formData: FormData) {
    setSaving(true);
    try {
      await createSuggestion(formData);
      toast.success("Sugestão registrada");
      (document.getElementById("sugg-form") as HTMLFormElement | null)?.reset();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(s: Suggestion) {
    try {
      await setSuggestionStatus(s.id, s.status === "feito" ? "aberto" : "feito");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  async function remove(id: number) {
    if (!confirm("Excluir esta sugestão?")) return;
    try {
      await deleteSuggestion(id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <form id="sugg-form" action={action} className="glass card-glow space-y-4 rounded-2xl border border-border p-6">
        <div className="space-y-1.5">
          <label htmlFor="title" className="text-sm font-medium">Título</label>
          <Input id="title" name="title" placeholder="Resumo da melhoria/problema" required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="description" className="text-sm font-medium">Descrição</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Explique o que gostaria de melhorar…"
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent">
            <Paperclip className="h-4 w-4" /> Anexar print
            <input type="file" name="image_file" accept="image/*" className="hidden" onChange={onImage} />
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {saving ? "Enviando..." : "Registrar sugestão"}
        </button>
      </form>

      <div className="space-y-3">
        {suggestions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">Nenhuma sugestão ainda.</p>
        ) : (
          suggestions.map((s) => (
            <div key={s.id} className="glass card-glow rounded-2xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.status === "feito" ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}>
                      {s.status === "feito" ? "Feito" : "Aberto"}
                    </span>
                    <h3 className={`truncate font-medium ${s.status === "feito" ? "line-through text-muted-foreground" : ""}`}>{s.title}</h3>
                  </div>
                  {s.description && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{s.description}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateBR(s.created_at.slice(0, 10))}</p>
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
              {s.image_url && (
                <a href={s.image_url} target="_blank" rel="noopener noreferrer" className="mt-3 block">
                  <Image src={s.image_url} alt="print" width={480} height={270} className="max-h-60 w-auto rounded-lg border border-border object-contain" unoptimized />
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
