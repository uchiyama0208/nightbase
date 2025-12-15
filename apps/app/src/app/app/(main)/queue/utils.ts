/**
 * 店舗の日付切り替え時間を考慮した営業日を計算
 * @param daySwitchTime 日付切り替え時間（例: "05:00"）
 * @returns 営業日の日付文字列（YYYY-MM-DD形式）
 */
export function getBusinessDate(daySwitchTime: string = "05:00"): string {
    const now = new Date();
    const jstDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const currentHour = jstDate.getHours();
    const currentMinute = jstDate.getMinutes();

    // day_switch_time をパース（例: "05:00" → 5時）
    const parts = daySwitchTime.split(":");
    const switchHour = parseInt(parts[0], 10) || 5;
    const switchMinute = parseInt(parts[1], 10) || 0;

    // 現在時刻が切り替え時間より前の場合は前日の営業日
    if (currentHour < switchHour || (currentHour === switchHour && currentMinute < switchMinute)) {
        jstDate.setDate(jstDate.getDate() - 1);
    }

    return jstDate.toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");
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
    return new Date(timestamp).toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");
}
