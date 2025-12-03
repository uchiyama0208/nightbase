import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const defaultDateTimeOptions: Intl.DateTimeFormatOptions = {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

function parseDateInput(dateString: string | null | undefined) {
  if (!dateString) return null;

  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatWithFallback(
  dateString: string | null | undefined,
  formatterFactory: () => Intl.DateTimeFormat
) {
  const date = parseDateInput(dateString);
  const fallback = dateString ?? "-";

  return date ? formatterFactory().format(date) : fallback;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null | undefined) {
  return formatWithFallback(dateString, () => dateFormatter);
}

export function formatDateTime(
  dateString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = defaultDateTimeOptions
) {
  return formatWithFallback(
    dateString,
    () => new Intl.DateTimeFormat("ja-JP", options)
  );
}

export function toDateTimeLocalInputValue(dateString: string | null | undefined) {
  const date = parseDateInput(dateString);
  if (!date) return "";

  // Format as JST datetime-local input value (YYYY-MM-DDTHH:mm)
  const jstFormatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return jstFormatter.format(date).replace(" ", "T");
}

// JST time formatting utilities
export function formatJSTTime(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatJSTDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\//g, "/");
}

export function formatJSTDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getJSTDateString(date: Date = new Date()): string {
  return date.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\//g, "-");
}
