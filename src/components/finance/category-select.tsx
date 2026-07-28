"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createCategory, updateCategory } from "@/lib/actions/finance";
import { SelectMenu, type SelectOption } from "@/components/ui/select-menu";
import type { Category, TxType } from "@/types/finance";

/**
 * Seletor de categoria da revisão do extrato: além de escolher, permite criar
 * uma categoria nova e renomear ou trocar o ícone das existentes sem sair da
 * tela.
 *
 * Categoria NÃO tem cor no banco: o schema é `categoryInput = { name, icon,
 * kind }` e o tipo `Category` não tem campo de cor. A identidade visual da
 * categoria é o emoji.
 */
export function CategorySelect({
  value,
  categories,
  kind,
  disabled = false,
  onChange,
}: {
  value: number | null;
  categories: Category[];
  kind: TxType;
  disabled?: boolean;
  onChange: (id: number | null) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<{ id: number | null; name: string; icon: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const options: SelectOption[] = [
    { value: "", label: "Sem categoria" },
    ...categories.map((c) => ({ value: String(c.id), label: c.name, icon: c.icon })),
  ];

  async function salvar() {
    if (!form || !form.name.trim()) return;
    setSaving(true);
    try {
      if (form.id === null) {
        const nova = await createCategory({ name: form.name.trim(), icon: form.icon || "🏷️", kind });
        // já deixa a categoria nova aplicada na linha que a criou
        if (nova && typeof nova.id === "number") onChange(nova.id);
        toast.success("Categoria criada");
      } else {
        await updateCategory(form.id, { name: form.name.trim(), icon: form.icon || "🏷️" });
        toast.success("Categoria atualizada");
      }
      setForm(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar categoria");
    } finally {
      setSaving(false);
    }
  }

  const editor = form && (
    <div className="space-y-2 p-2">
      <div className="flex gap-1.5">
        <input
          value={form.icon}
          onChange={(e) => setForm({ ...form, icon: e.target.value })}
          maxLength={2}
          placeholder="🏷️"
          className="w-10 rounded-lg border border-border bg-muted px-1 py-1.5 text-center text-xs"
        />
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") salvar();
          }}
          autoFocus
          placeholder="Nome da categoria"
          className="min-w-0 flex-1 rounded-lg border border-border bg-muted px-2 py-1.5 text-xs"
        />
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={salvar}
          disabled={saving || !form.name.trim()}
          className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setForm(null)}
          className="rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
        >
          Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <SelectMenu
      value={value === null ? "" : String(value)}
      options={options}
      disabled={disabled}
      placeholder="Sem categoria"
      className="w-44"
      onChange={(v) => onChange(v === "" ? null : Number(v))}
      onEditOption={(o) => {
        const c = categories.find((x) => String(x.id) === o.value);
        if (c) setForm({ id: c.id, name: c.name, icon: c.icon });
      }}
      footer={
        form ? (
          editor
        ) : (
          <button
            type="button"
            onClick={() => setForm({ id: null, name: "", icon: "🏷️" })}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-primary hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" /> Nova categoria
          </button>
        )
      }
    />
  );
}
