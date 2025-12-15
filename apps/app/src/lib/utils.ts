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

// ============================================
// 日付範囲ユーティリティ
// ============================================

/**
 * 今日のJST日付範囲を取得
 * @returns 今日の開始時刻と終了時刻（JST）
 */
export function getJSTTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  const jstFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const jstDateStr = jstFormatter.format(now);
  const [month, day, year] = jstDateStr.split("/");

  // JSTの今日の開始と終了を作成
  const start = new Date(`${year}-${month}-${day}T00:00:00+09:00`);
  const end = new Date(`${year}-${month}-${day}T23:59:59.999+09:00`);

  return { start, end };
}

/**
 * 今日のJST日付範囲をISO文字列で取得
 * @returns ISO形式の今日の開始時刻と終了時刻
 */
export function getJSTTodayRangeISO(): { startISO: string; endISO: string } {
  const { start, end } = getJSTTodayRange();
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  };
}

/**
 * 時刻文字列をISO形式に変換
 * @param timeStr 時刻文字列（HH:mm形式）
 * @param dateStr 日付文字列（YYYY-MM-DD形式）
 * @returns ISO形式の日時文字列、または無効な場合はnull
 */
export function timeToISO(timeStr: string | null, dateStr: string): string | null {
  if (!timeStr) return null;
  const combined = `${dateStr}T${timeStr}:00+09:00`;
  const date = new Date(combined);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * 時刻文字列を正規化（"09:00" → "09:00", "9:00" → "09:00"）
 * @param timeStr 時刻文字列
 * @returns 正規化された時刻文字列、または無効な場合は空文字列
 */
export function normalizeTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "";
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "";
  const hours = match[1].padStart(2, "0");
  const minutes = match[2];
  return `${hours}:${minutes}`;
}

/**
 * ISO文字列からJST時刻を取得（HH:mm形式）
 * @param isoStr ISO形式の日時文字列
 * @returns HH:mm形式の時刻文字列
 */
export function getJSTTimeFromISO(isoStr: string | null | undefined): string {
  if (!isoStr) return "";
  const date = new Date(isoStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * 2つの日時の差分を分単位で計算
 * @param start 開始日時（ISO文字列）
 * @param end 終了日時（ISO文字列）
 * @returns 差分の分数
 */
export function getMinutesDifference(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
}

/**
 * 分数を「○時間○分」形式にフォーマット
 * @param minutes 分数
 * @returns フォーマットされた文字列
 */
export function formatMinutesToHoursAndMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}分`;
  if (mins === 0) return `${hours}時間`;
  return `${hours}時間${mins}分`;
}
