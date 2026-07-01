import { GOOGLE } from "./config";
import { getValidAccessToken } from "./tokens";
import { monthBounds, spDateParts } from "@/lib/dates";
import type { CalendarEvent } from "@/types/calendar";

const TZ = "America/Sao_Paulo";

const RRULE: Record<string, string | undefined> = {
  daily: "RRULE:FREQ=DAILY",
  weekly: "RRULE:FREQ=WEEKLY",
  monthly: "RRULE:FREQ=MONTHLY",
};

function buildBody(event: CalendarEvent) {
  const startIso = event.starts_at;
  const endIso = event.ends_at ?? new Date(new Date(startIso).getTime() + 3600000).toISOString();
  const start = event.all_day ? { date: spDateParts(startIso).date } : { dateTime: startIso, timeZone: TZ };
  const end = event.all_day ? { date: spDateParts(endIso).date } : { dateTime: endIso, timeZone: TZ };

  const body: Record<string, unknown> = {
    summary: event.title,
    description: event.description ?? undefined,
    start,
    end,
  };
  const rule = RRULE[event.repeat];
  if (rule) body.recurrence = [rule];
  return body;
}

/** Cria/atualiza o evento no Google. Retorna o google_event_id ou null (não conectado/falha). */
export async function pushEvent(userId: string, event: CalendarEvent): Promise<string | null> {
  const token = await getValidAccessToken(userId);
  if (!token) return null;

  const isUpdate = !!event.google_event_id;
  const url = isUpdate
    ? `${GOOGLE.calendarApi}/calendars/primary/events/${event.google_event_id}`
    : `${GOOGLE.calendarApi}/calendars/primary/events`;

  const res = await fetch(url, {
    method: isUpdate ? "PATCH" : "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(buildBody(event)),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { id?: string };
  return data.id ?? null;
}

export async function deleteGoogleEvent(userId: string, googleEventId: string): Promise<void> {
  const token = await getValidAccessToken(userId);
  if (!token) return;
  await fetch(`${GOOGLE.calendarApi}/calendars/primary/events/${googleEventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export interface GoogleEventItem {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

export async function fetchGoogleEvents(userId: string, year: number, month: number): Promise<GoogleEventItem[]> {
  const token = await getValidAccessToken(userId);
  if (!token) throw new Error("Google não conectado");

  const { start, end } = monthBounds(year, month);
  const params = new URLSearchParams({
    timeMin: `${start}T00:00:00-03:00`,
    timeMax: `${end}T23:59:59-03:00`,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const res = await fetch(`${GOOGLE.calendarApi}/calendars/primary/events?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Falha ao buscar eventos do Google");
  const data = (await res.json()) as { items?: GoogleEventItem[] };
  return data.items ?? [];
}
