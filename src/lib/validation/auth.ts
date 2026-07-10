import { z } from "zod";

export const resetRequestInput = z.object({
  email: z.string().trim().email("E-mail inválido"),
});
export type ResetRequestInput = z.infer<typeof resetRequestInput>;

export const passwordInput = z.object({
  password: z.string().min(6, "A senha precisa de ao menos 6 caracteres"),
});
export type PasswordInput = z.infer<typeof passwordInput>;
