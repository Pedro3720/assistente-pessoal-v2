"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { createTask, updateTask } from "@/lib/actions/task";
import { STATUS_META, PRIORITY_META, STATUS_ORDER, PRIORITY_ORDER } from "@/lib/tasks/constants";
import type { Task, TaskStatus, TaskPriority } from "@/types/task";

export function TaskModal({ editing, onClose }: { editing: Task | null; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(editing?.status ?? "pending");
  const [priority, setPriority] = useState<TaskPriority>(editing?.priority ?? "medium");
  const [dueOn, setDueOn] = useState(editing?.due_on ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) {
      toast.error("O título é obrigatório.");
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      due_on: dueOn || null,
    };
    try {
      if (editing) await updateTask(editing.id, payload);
      else await createTask(payload);
      router.refresh();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-popover p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">{editing ? "Editar Tarefa" : "Nova Tarefa"}</h2>
          <div className="w-9" />
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              placeholder="O que precisa ser feito?"
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Detalhes (opcional)..."
              className="w-full resize-none rounded-lg border border-border bg-muted px-3 py-2 text-sm placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Status</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    status === s ? "bg-accent text-accent-foreground ring-1 ring-primary/40" : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Prioridade</label>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_ORDER.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    priority === p ? "bg-accent text-accent-foreground ring-1 ring-primary/40" : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIORITY_META[p].dot }} />
                  {PRIORITY_META[p].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Prazo (opcional)</label>
            <input
              type="date"
              value={dueOn}
              onChange={(e) => setDueOn(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
            />
          </div>

          <button
            onClick={save}
            disabled={saving || !title.trim()}
            className="mt-2 w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar tarefa"}
          </button>
        </div>
      </div>
    </div>
  );
}
