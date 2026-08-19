/**
 * Datas no fuso de São Paulo, independentes do fuso do servidor
 * (na Vercel o servidor roda em UTC — este módulo evita o bug de "dia errado"
 * que existia no projeto antigo por causa de toISOString()).
 */

const TZ = "America/Sao_Paulo";

/** Data de hoje em 'YYYY-MM-DD', no fuso de SP. */
export function todayISO(): string {
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Ano e mês (1-12) atuais no fuso de SP. */
export function currentYearMonth(): { year: number; month: number } {
  const [year, month] = todayISO().split("-").map(Number);
  return { year, month };
}

/** Aplica um deslocamento de meses e devolve { year, month } normalizado. */
export function shiftMonth(year: number, month: number, offset: number) {
  const base = new Date(Date.UTC(year, month - 1 + offset, 1));
  return { year: base.getUTCFullYear(), month: base.getUTCMonth() + 1 };
}

/** Primeiro e último dia do mês em 'YYYY-MM-DD' (inclusivos). */
export function monthBounds(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

/** Rótulo do mês em português: (2026, 7) → "julho de 2026". */
export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/** Formata 'YYYY-MM-DD' para exibição pt-BR: "2026-07-01" → "01/07/2026". */
export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Normaliza hora do banco ou do formulário para exibição e composição: "14:30:00" → "14:30". */
export function formatTimeBR(time: string): string {
  return time.slice(0, 5);
}

/** Offset fixo de São Paulo (o Brasil não usa horário de verão desde 2019). */
const SP_OFFSET = "-03:00";

/** Compõe data + hora locais (SP) num ISO com offset: ("2026-07-05","14:00") → "2026-07-05T14:00:00-03:00". */
export function composeSP(date: string, time: string): string {
  return `${date}T${time}:00${SP_OFFSET}`;
}

/** Extrai data (YYYY-MM-DD) e hora (HH:mm) locais de SP de um ISO/timestamptz. */
export function spDateParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return { date, time };
}
