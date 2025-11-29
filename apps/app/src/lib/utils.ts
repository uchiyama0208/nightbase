import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const defaultDateTimeOptions: Intl.DateTimeFormatOptions = {
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

  const tzOffset = date.getTimezoneOffset() * 60000;
  const localISO = new Date(date.getTime() - tzOffset).toISOString();
  return localISO.slice(0, 16);
}
