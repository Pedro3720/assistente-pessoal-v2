import { z } from "zod";

export const repeatSchema = z.enum(["none", "daily", "weekly", "monthly"]);

export const eventInput = z.object({
  title: z.string().trim().min(1, "Título obrigatório"),
  description: z.string().trim().nullable().default(null),
  starts_at: z.string().min(1, "Início obrigatório"), // ISO com offset
  ends_at: z.string().nullable().default(null),
  all_day: z.boolean().default(false),
  color: z.string().default("#3b82f6"),
  category: z.string().nullable().default(null),
  repeat: repeatSchema.default("none"),
  reminder_minutes: z.number().int().nullable().default(null),
});
export type EventInput = z.infer<typeof eventInput>;
