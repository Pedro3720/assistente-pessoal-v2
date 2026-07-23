"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { createTaskCategory, updateTaskCategory, deleteTaskCategory } from "@/lib/actions/task";
import { TASK_CATEGORY_COLORS } from "@/lib/tasks/constants";
import type { TaskCategory } from "@/types/task";

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TASK_CATEGORY_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`h-6 w-6 rounded-full border-2 transition-all ${
            value === c ? "scale-110 border-foreground" : "border-transparent"
          }`}
          style={{ backgroundColor: c }}
          aria-label={`Cor ${c}`}
        />
      ))}
    </div>
  );
}

export function TaskCategoryManager({
  categories,
  onClose,
}: {
  categories: TaskCategory[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState(TASK_CATEGORY_COLORS[0]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(TASK_CATEGORY_COLORS[0]);

  async function add() {
    if (!name.trim()) return;
    try {
      await createTaskCategory({ name: name.trim(), color });
      setName("");
      setColor(TASK_CATEGORY_COLORS[0]);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar");
    }
  }

  async function saveEdit(id: number) {
    if (!editName.trim()) return;
    try {
      await updateTaskCategory(id, { name: editName.trim(), color: editColor });
      setEditingId(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  }

  async function remove(id: number) {
    if (!confirm("Excluir esta categoria? As tarefas dela ficam sem categoria.")) return;
    try {
      await deleteTaskCategory(id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  return (
    <Modal onClose={onClose} title="Categorias de tarefas">
      <div className="space-y-5">
        {/* adicionar */}
        <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da categoria (ex.: Trabalho)"
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
          />
          <ColorPicker value={color} onChange={setColor} />
          <button
            onClick={add}
            disabled={!name.trim()}
            className="flex w-full items-center justify-center gap-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        </div>

        {/* lista */}
        <div className="space-y-1.5">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma categoria ainda.</p>
          ) : (
            categories.map((c) => (
              <div key={c.id} className="rounded-lg border border-border p-2">
                {editingId === c.id ? (
                  <div className="space-y-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded border border-border bg-muted px-2 py-1 text-sm"
                    />
                    <ColorPicker value={editColor} onChange={setEditColor} />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(c.id)}
                        className="flex flex-1 items-center justify-center gap-1 rounded bg-primary py-1.5 text-xs font-medium text-primary-foreground"
                      >
                        <Check className="h-3.5 w-3.5" /> Salvar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="flex-1 truncate text-sm">{c.name}</span>
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setEditName(c.name);
                        setEditColor(c.color);
                      }}
                      className="p-1 text-muted-foreground hover:text-primary"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="p-1 text-muted-foreground hover:text-red-500"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
