import {
  Apple, Baby, Banknote, Bed, Beer, Bike, BookOpen, Briefcase, Bus, Car, Coffee, Coins,
  CreditCard, Cross, Dog, Dumbbell, Film, Fuel, Gamepad2, Gift, GraduationCap, HeartPulse,
  Home, Lamp, Landmark, Laptop, Music, PartyPopper, PiggyBank, Pill, Pizza, Plane, Plug,
  Receipt, Repeat, Shield, Shirt, ShoppingCart, Smartphone, Sofa, Sparkles, Stethoscope,
  Tag, Ticket, TrainFront, TrendingUp, Utensils, Wallet, Wifi, Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Catálogo de ícones oferecidos ao usuário (categorias, contas, assinaturas).
 *
 * Os ícones são importados um a um de propósito: só estes entram no bundle.
 * Importar o objeto `icons` inteiro do lucide traria as 1.500+ ilustrações.
 *
 * O `nome` é o que fica salvo na coluna `icon` do banco.
 */
export type IconEntry = { nome: string; rotulo: string; Icon: LucideIcon };
export type IconGroup = { grupo: string; itens: IconEntry[] };

export const ICON_GROUPS: IconGroup[] = [
  {
    grupo: "Casa",
    itens: [
      { nome: "home", rotulo: "Casa", Icon: Home },
      { nome: "sofa", rotulo: "Móveis", Icon: Sofa },
      { nome: "bed", rotulo: "Quarto", Icon: Bed },
      { nome: "lamp", rotulo: "Luz", Icon: Lamp },
      { nome: "plug", rotulo: "Energia", Icon: Plug },
      { nome: "wrench", rotulo: "Reparos", Icon: Wrench },
    ],
  },
  {
    grupo: "Alimentação",
    itens: [
      { nome: "utensils", rotulo: "Restaurante", Icon: Utensils },
      { nome: "shopping-cart", rotulo: "Mercado", Icon: ShoppingCart },
      { nome: "coffee", rotulo: "Café", Icon: Coffee },
      { nome: "pizza", rotulo: "Delivery", Icon: Pizza },
      { nome: "beer", rotulo: "Bar", Icon: Beer },
      { nome: "apple", rotulo: "Feira", Icon: Apple },
    ],
  },
  {
    grupo: "Transporte",
    itens: [
      { nome: "car", rotulo: "Carro", Icon: Car },
      { nome: "fuel", rotulo: "Combustível", Icon: Fuel },
      { nome: "bus", rotulo: "Ônibus", Icon: Bus },
      { nome: "train-front", rotulo: "Trem", Icon: TrainFront },
      { nome: "bike", rotulo: "Bicicleta", Icon: Bike },
      { nome: "plane", rotulo: "Viagem", Icon: Plane },
    ],
  },
  {
    grupo: "Saúde",
    itens: [
      { nome: "heart-pulse", rotulo: "Saúde", Icon: HeartPulse },
      { nome: "pill", rotulo: "Remédio", Icon: Pill },
      { nome: "stethoscope", rotulo: "Consulta", Icon: Stethoscope },
      { nome: "cross", rotulo: "Plano", Icon: Cross },
      { nome: "dumbbell", rotulo: "Academia", Icon: Dumbbell },
    ],
  },
  {
    grupo: "Lazer",
    itens: [
      { nome: "gamepad-2", rotulo: "Jogos", Icon: Gamepad2 },
      { nome: "film", rotulo: "Cinema", Icon: Film },
      { nome: "music", rotulo: "Música", Icon: Music },
      { nome: "ticket", rotulo: "Eventos", Icon: Ticket },
      { nome: "party-popper", rotulo: "Festa", Icon: PartyPopper },
    ],
  },
  {
    grupo: "Trabalho e estudo",
    itens: [
      { nome: "briefcase", rotulo: "Trabalho", Icon: Briefcase },
      { nome: "laptop", rotulo: "Freelance", Icon: Laptop },
      { nome: "graduation-cap", rotulo: "Educação", Icon: GraduationCap },
      { nome: "book-open", rotulo: "Livros", Icon: BookOpen },
    ],
  },
  {
    grupo: "Dinheiro",
    itens: [
      { nome: "wallet", rotulo: "Carteira", Icon: Wallet },
      { nome: "landmark", rotulo: "Banco", Icon: Landmark },
      { nome: "piggy-bank", rotulo: "Poupança", Icon: PiggyBank },
      { nome: "banknote", rotulo: "Dinheiro", Icon: Banknote },
      { nome: "coins", rotulo: "Moedas", Icon: Coins },
      { nome: "trending-up", rotulo: "Investimento", Icon: TrendingUp },
      { nome: "credit-card", rotulo: "Cartão", Icon: CreditCard },
      { nome: "receipt", rotulo: "Contas", Icon: Receipt },
    ],
  },
  {
    grupo: "Outros",
    itens: [
      { nome: "tag", rotulo: "Etiqueta", Icon: Tag },
      { nome: "gift", rotulo: "Presente", Icon: Gift },
      { nome: "shirt", rotulo: "Roupas", Icon: Shirt },
      { nome: "smartphone", rotulo: "Celular", Icon: Smartphone },
      { nome: "wifi", rotulo: "Internet", Icon: Wifi },
      { nome: "repeat", rotulo: "Assinatura", Icon: Repeat },
      { nome: "dog", rotulo: "Pets", Icon: Dog },
      { nome: "baby", rotulo: "Filhos", Icon: Baby },
      { nome: "shield", rotulo: "Seguro", Icon: Shield },
      { nome: "sparkles", rotulo: "Cuidados", Icon: Sparkles },
    ],
  },
];

/** Busca direta por nome, para renderizar o que está salvo no banco. */
export const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  ICON_GROUPS.flatMap((g) => g.itens.map((i) => [i.nome, i.Icon]))
);

export function getIcon(nome: string): LucideIcon | undefined {
  return ICON_MAP[nome];
}
