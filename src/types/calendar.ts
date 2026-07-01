export type EventRepeat = "none" | "daily" | "weekly" | "monthly";

export interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  starts_at: string; // ISO timestamptz
  ends_at: string | null;
  all_day: boolean;
  color: string;
  category: string | null;
  repeat: EventRepeat;
  reminder_minutes: number | null;
  google_event_id: string | null;
}
