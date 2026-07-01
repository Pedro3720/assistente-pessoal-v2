import type { EventRepeat } from "@/types/calendar";

export const EVENT_CATEGORIES: { label: string; color: string }[] = [
  { label: "Trabalho", color: "#3b82f6" },
  { label: "Pessoal", color: "#10b981" },
  { label: "Saúde", color: "#ef4444" },
  { label: "Estudos", color: "#f59e0b" },
  { label: "Finanças", color: "#8b5cf6" },
  { label: "Lazer", color: "#ec4899" },
];

export const REPEAT_OPTIONS: { value: EventRepeat; label: string }[] = [
  { value: "none", label: "Não repetir" },
  { value: "daily", label: "Diário" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
];

export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Sem lembrete" },
  { value: 5, label: "5 minutos antes" },
  { value: 15, label: "15 minutos antes" },
  { value: 30, label: "30 minutos antes" },
  { value: 60, label: "1 hora antes" },
  { value: 1440, label: "1 dia antes" },
];

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const WEEKDAY_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
