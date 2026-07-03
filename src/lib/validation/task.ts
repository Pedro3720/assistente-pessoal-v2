import { z } from "zod";

export const statusSchema = z.enum(["pending", "in_progress", "completed"]);
export const prioritySchema = z.enum(["low", "medium", "high"]);

export const taskInput = z.object({
  title: z.string().trim().min(1, "Título obrigatório"),
  description: z.string().trim().nullable().default(null),
  status: statusSchema.default("pending"),
  priority: prioritySchema.default("medium"),
  due_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    .nullable()
    .default(null),
});
export type TaskInput = z.infer<typeof taskInput>;

export const reorderInput = z.array(z.number().int()).min(1);
