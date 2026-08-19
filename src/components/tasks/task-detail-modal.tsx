"use client";

import { Bell, CalendarClock, Check, Edit3, RotateCcw, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { STATUS_META, PRIORITY_META, reminderLabel } from "@/lib/tasks/constants";
import { formatDateBR, formatTimeBR, todayISO } from "@/lib/dates";
import type { Task, TaskCategory } from "@/types/task";

/**
 * Leitura da tarefa por completo: título sem corte, descrição inteira, prazo
 * com hora e lembrete. Alterar é sempre por uma das três ações do rodapé, que
 * fecham o detalhe antes de agir (o objeto aqui é uma cópia e ficaria velho).
 */
export function TaskDetailModal({
  task,
  category,
  onClose,
  onToggle,
  onEdit,
  onRemove,
}: {
  task: Task;
  category: TaskCategory | null;
  onClose: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const done = task.status === "completed";
  const overdue = Boolean(task.due_on && !done && task.due_on < todayISO());
  const action =
    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors";

  return (
    <Modal onClose={onClose} title="Detalhes da tarefa">
      <div className="space-y-5">
        <div className="flex items-start gap-2">
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: PRIORITY_META[task.priority].dot }}
            title={`Prioridade ${PRIORITY_META[task.priority].label}`}
          />
          <h3
            className={`break-words text-lg font-semibold leading-snug ${
              done ? "text-muted-foreground line-through" : "text-foreground"
            }`}
          >
            {task.title}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_META[task.status].color}`}>
            {STATUS_META[task.status].label}
          </span>
          <span className={`text-[11px] font-medium ${PRIORITY_META[task.priority].text}`}>
            {PRIORITY_META[task.priority].label}
          </span>
          {category && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: `${category.color}22`, color: category.color }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category.color }} />
              {category.name}
            </span>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
            {task.due_on ? (
              <span className={overdue ? "font-medium text-red-600 dark:text-red-400" : ""}>
                <span className="num">{formatDateBR(task.due_on)}</span>
                {task.due_time && (
                  <>
                    {" às "}
                    <span className="num">{formatTimeBR(task.due_time)}</span>
                  </>
                )}
                {overdue ? " (atrasada)" : ""}
              </span>
            ) : (
              <span className="text-muted-foreground">Sem prazo</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className={task.reminder_minutes === null ? "text-muted-foreground" : ""}>
              {reminderLabel(task.reminder_minutes)}
            </span>
          </div>
        </div>

        {task.description ? (
          <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{task.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground/60">Sem descrição.</p>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <button onClick={onToggle} className={`${action} bg-primary text-primary-foreground hover:bg-primary/90`}>
            {done ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {done ? "Reabrir" : "Concluir"}
          </button>
          <button onClick={onEdit} className={`${action} bg-muted text-foreground hover:bg-accent`}>
            <Edit3 className="h-4 w-4" /> Editar
          </button>
          <button onClick={onRemove} className={`${action} bg-muted text-red-600 hover:bg-accent dark:text-red-400`}>
            <Trash2 className="h-4 w-4" /> Excluir
          </button>
        </div>
      </div>
    </Modal>
  );
}
