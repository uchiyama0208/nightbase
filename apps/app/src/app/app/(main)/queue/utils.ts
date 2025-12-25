/**
 * 店舗の日付切り替え時間を考慮した営業日を計算
 * @param daySwitchTime 日付切り替え時間（例: "05:00"）
 * @returns 営業日の日付文字列（YYYY-MM-DD形式）
 */
export function getBusinessDate(daySwitchTime: string = "05:00"): string {
    const now = new Date();

    // day_switch_time をパース（例: "05:00" → 5時）
    const parts = daySwitchTime.split(":");
    const switchHour = parseInt(parts[0], 10) || 5;
    const switchMinute = parseInt(parts[1], 10) || 0;

    // JSTの現在時刻を取得
    const jstFormatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    const jstParts = jstFormatter.formatToParts(now);
    const currentYear = parseInt(jstParts.find(p => p.type === "year")?.value || "2024", 10);
    const currentMonth = parseInt(jstParts.find(p => p.type === "month")?.value || "1", 10);
    const currentDay = parseInt(jstParts.find(p => p.type === "day")?.value || "1", 10);
    const currentHour = parseInt(jstParts.find(p => p.type === "hour")?.value || "0", 10);
    const currentMinute = parseInt(jstParts.find(p => p.type === "minute")?.value || "0", 10);

    // 営業日を計算 (JST日付を直接計算)
    let businessYear = currentYear;
    let businessMonth = currentMonth;
    let businessDay = currentDay;

    // 現在時刻が切り替え時間より前の場合は前日の営業日
    if (currentHour < switchHour || (currentHour === switchHour && currentMinute < switchMinute)) {
        // 前日を計算
        const tempDate = new Date(Date.UTC(currentYear, currentMonth - 1, currentDay));
        tempDate.setUTCDate(tempDate.getUTCDate() - 1);
        businessYear = tempDate.getUTCFullYear();
        businessMonth = tempDate.getUTCMonth() + 1;
        businessDay = tempDate.getUTCDate();
    }

    // YYYY-MM-DD形式で返す
    const yearStr = String(businessYear);
    const monthStr = String(businessMonth).padStart(2, "0");
    const dayStr = String(businessDay).padStart(2, "0");
    return `${yearStr}-${monthStr}-${dayStr}`;
}

/**
 * 営業日の開始時刻をISO形式で取得
 * @param daySwitchTime 日付切り替え時間（例: "05:00"）
 * @returns 営業日開始時刻のタイムスタンプ（ISO形式）
 */
export function getBusinessDayStart(daySwitchTime: string = "05:00"): string {
    const businessDate = getBusinessDate(daySwitchTime);
    // 時刻部分を正規化（秒がない場合は追加）
    const timeParts = daySwitchTime.split(":");
    const normalizedTime = timeParts.length >= 3
        ? `${timeParts[0]}:${timeParts[1]}:${timeParts[2]}`
        : `${timeParts[0]}:${timeParts[1]}:00`;

    return `${businessDate}T${normalizedTime}+09:00`;
}

/**
 * タイムスタンプから日付文字列を取得
 * @param timestamp タイムスタンプ（ISO形式）
 * @returns 日付文字列（YYYY-MM-DD形式）
 */
export function getDateFromTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    // en-CA localeはYYYY-MM-DD形式を返す
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}
