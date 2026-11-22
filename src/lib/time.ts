import { TIME_ZONE } from "@/config/app";

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const keyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatDateTime(iso: string | Date): string {
  return dateTimeFormatter.format(new Date(iso));
}

export function formatDate(iso: string | Date): string {
  return dateFormatter.format(new Date(iso));
}

/** Asia/Dhaka calendar day key, e.g. "2026-11-22". */
export function dayKey(date: Date = new Date()): string {
  return keyFormatter.format(date);
}

/** Asia/Dhaka hour (0-23). */
export function dhakaHour(date: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      hour12: false,
    }).format(date),
  );
}
