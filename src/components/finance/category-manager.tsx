"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { IconPicker } from "@/components/ui/icon-picker";
import { EntityIcon } from "@/components/ui/entity-icon";
import { createCategory, updateCategory, deleteCategory } from "@/lib/actions/finance";
import type { Category, TxType } from "@/types/finance";

export function CategoryManager({
  categories,
  onClose,
}: {
  categories: Category[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("tag");
  const [kind, setKind] = useState<TxType>("expense");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");

  async function add() {
    if (!name.trim()) return;
    try {
      await createCategory({ name: name.trim(), icon: icon || "tag", kind });
      setName(""); setIcon("tag");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar");
    }
  }

  async function saveEdit(id: number) {
    try {
      await updateCategory(id, { name: editName.trim(), icon: editIcon || "tag" });
      setEditingId(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  }

  async function remove(id: number) {
    if (!confirm("Excluir esta categoria? As transações ficam sem categoria.")) return;
    try {
      await deleteCategory(id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  const list = (k: TxType) => categories.filter((c) => c.kind === k);

  return (
    <Modal onClose={onClose} title="Categorias">
      <div className="space-y-5">
        {/* adicionar */}
        <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
          <div className="flex gap-2">
            <IconPicker value={icon} onChange={setIcon} />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da categoria"
              className="min-w-0 flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            {(["expense", "income"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium ${
                  kind === k ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground"
                }`}
              >
                {k === "expense" ? "Despesa" : "Receita"}
              </button>
            ))}
          </div>
          <button
            onClick={add}
            disabled={!name.trim()}
            className="flex w-full items-center justify-center gap-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        </div>

        {/* listas */}
        {(["expense", "income"] as const).map((k) => (
          <div key={k} className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {k === "expense" ? "Despesas" : "Receitas"}
            </p>
            {list(k).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma.</p>
            ) : (
              list(k).map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                  {editingId === c.id ? (
                    <>
                      <IconPicker value={editIcon} onChange={setEditIcon} />
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="min-w-0 flex-1 rounded border border-border bg-muted px-2 py-1 text-sm"
                      />
                      <button onClick={() => saveEdit(c.id)} className="p-1 text-green-600" title="Salvar">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground" title="Cancelar">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <EntityIcon value={c.icon} size={16} className="h-6 w-6 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                      <button
                        onClick={() => { setEditingId(c.id); setEditName(c.name); setEditIcon(c.icon); }}
                        className="p-1 text-muted-foreground hover:text-primary"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove(c.id)} className="p-1 text-muted-foreground hover:text-red-500" title="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
