import { z } from "zod";

export const suggestionInput = z.object({
  title: z.string().trim().min(1, "Informe um título"),
  description: z.string().trim().nullable().default(null),
  image_url: z.string().trim().nullable().default(null),
});
export const suggestionStatus = z.enum(["aberto", "feito"]);
