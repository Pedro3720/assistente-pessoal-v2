import { z } from "zod";

export const statusSchema = z.enum(["pending", "in_progress", "completed"]);
export const prioritySchema = z.enum(["low", "medium", "high"]);

export const taskInput = z
  .object({
    title: z.string().trim().min(1, "Título obrigatório"),
    description: z.string().trim().nullable().default(null),
    status: statusSchema.default("pending"),
    priority: prioritySchema.default("medium"),
    due_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
      .nullable()
      .default(null),
    due_time: z
      .string()
      .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora inválida")
      .nullable()
      .default(null),
    reminder_minutes: z.number().int().min(0).max(1440).nullable().default(null),
    category_id: z.number().int().positive().nullable().default(null),
  })
  // A regra de integridade mora aqui, não na tela: sem data não há hora, e sem
  // hora não há lembrete. Vale igual para createTask e updateTask.
  .transform((v) => {
    const due_time = v.due_on && v.due_time ? v.due_time.slice(0, 5) : null;
    return { ...v, due_time, reminder_minutes: due_time === null ? null : v.reminder_minutes };
  });
export type TaskInput = z.infer<typeof taskInput>;

export const taskCategoryInput = z.object({
  name: z.string().trim().min(1, "Nome obrigatório"),
  color: z.string().trim().min(1).default("#3b82f6"),
});
export type TaskCategoryInput = z.infer<typeof taskCategoryInput>;

export const reorderInput = z.array(z.number().int()).min(1);
