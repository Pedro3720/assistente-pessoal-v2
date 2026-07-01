// Item da lista — a senha NÃO vem aqui; é revelada sob demanda (revealPassword).
export interface PasswordItem {
  id: number;
  title: string;
  username: string | null;
  url: string | null;
  notes: string | null;
  has_secret: boolean;
}
