export type SuggestionStatus = "aberto" | "feito";

export interface Suggestion {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  status: SuggestionStatus;
  created_at: string;
}
