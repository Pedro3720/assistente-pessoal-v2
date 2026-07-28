"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Trash2, Check, RotateCcw, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { resizeImage } from "@/lib/images";
import { createSuggestion, setSuggestionStatus, deleteSuggestion } from "@/lib/actions/suggestion";
import { formatDateBR } from "@/lib/dates";
import type { Suggestion } from "@/types/suggestion";

/** Imagens de uma sugestão (usa image_urls; cai para image_url em linhas antigas). */
function imagesOf(s: Suggestion): string[] {
  if (s.image_urls?.length) return s.image_urls;
  return s.image_url ? [s.image_url] : [];
}

export function SuggestionsView({ suggestions }: { suggestions: Suggestion[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ""; // permite re-selecionar o mesmo arquivo depois
    if (picked.length === 0) return;
    const resized: File[] = [];
    for (const f of picked) {
      try {
        resized.push(await resizeImage(f, 1024, 0.85));
      } catch {
        resized.push(f);
      }
    }
    setFiles((prev) => [...prev, ...resized]);
    setPreviews((prev) => [...prev, ...resized.map((f) => URL.createObjectURL(f))]);
  }

  function removeFile(i: number) {
    URL.revokeObjectURL(previews[i]);
    setFiles((prev) => prev.filter((_, k) => k !== i));
    setPreviews((prev) => prev.filter((_, k) => k !== i));
  }

  function clearFiles() {
    previews.forEach((u) => URL.revokeObjectURL(u));
    setFiles([]);
    setPreviews([]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData();
    fd.set("title", (form.elements.namedItem("title") as HTMLInputElement).value);
    fd.set("description", (form.elements.namedItem("description") as HTMLTextAreaElement).value);
    for (const f of files) fd.append("image_files", f);

    setSaving(true);
    try {
      await createSuggestion(fd);
      toast.success("Sugestão registrada");
      form.reset();
      clearFiles();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar");
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
      <form id="sugg-form" onSubmit={handleSubmit} className="glass card-glow space-y-4 rounded-2xl border border-border p-6">
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

        <div className="space-y-2">
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent">
            <Paperclip className="h-4 w-4" /> Anexar prints
            <input type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
          </label>

          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {previews.map((url, i) => (
                <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`anexo ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    title="Remover"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {previews.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {previews.length} imagem(ns) anexada(s), serão enviadas ao registrar.
            </p>
          )}
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
          suggestions.map((s) => {
            const imgs = imagesOf(s);
            return (
              <div key={s.id} className="glass card-glow rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.status === "feito" ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}>
                        {s.status === "feito" ? "Feito" : "Aberto"}
                      </span>
                      <h3 className={`truncate font-medium ${s.status === "feito" ? "line-through text-muted-foreground" : ""}`}>{s.title}</h3>
                    </div>
                    {s.description && <p className="mt-1 break-words whitespace-pre-wrap text-sm text-muted-foreground">{s.description}</p>}
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
                {imgs.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {imgs.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                        <Image src={url} alt={`print ${i + 1}`} width={480} height={270} className="max-h-60 w-auto rounded-lg border border-border object-contain" unoptimized />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
