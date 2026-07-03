import { z } from "zod";

export const profileInput = z.object({
  display_name: z.string().trim().min(1, "Informe um nome"),
  phone: z.string().trim().max(30).nullable().default(null),
  avatar_url: z.string().trim().nullable().default(null),
});
export type ProfileInput = z.infer<typeof profileInput>;

export const signupInput = profileInput.extend({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(6, "A senha precisa de ao menos 6 caracteres"),
});
export type SignupInput = z.infer<typeof signupInput>;
