import { z } from "zod";

export const passwordInput = z.object({
  title: z.string().trim().min(1, "Título obrigatório"),
  username: z.string().trim().nullable().default(null),
  password: z.string().default(""), // texto puro na entrada; criptografado na action
  url: z.string().trim().nullable().default(null),
  notes: z.string().trim().nullable().default(null),
});
export type PasswordInput = z.infer<typeof passwordInput>;
