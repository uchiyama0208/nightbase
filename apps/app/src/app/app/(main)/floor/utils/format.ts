/**
 * 日時文字列を時刻表示（HH:mm）に変換
 */
export function formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Tokyo",
    });
}

/**
 * ISO文字列をinput[type="time"]用のフォーマット（HH:mm）に変換
 */
export function formatTimeForInput(isoString: string | null): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    const jstDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const hours = jstDate.getHours().toString().padStart(2, '0');
    const minutes = jstDate.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * input[type="time"]の値をISO文字列に変換
 * @param timeValue HH:mm形式の時刻文字列
 * @param baseDate 基準となる日付のISO文字列
 */
export function timeInputToISO(timeValue: string, baseDate: string): string | null {
    if (!timeValue) return null;
    const base = new Date(baseDate);
    // JSTで日付を取得
    const jstDateStr = base.toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");
    // JSTの日付と時刻からDateを作成
    const jstDateTime = new Date(`${jstDateStr}T${timeValue}:00+09:00`);
    return jstDateTime.toISOString();
}

/**
 * 時刻を安全に表示（無効な値の場合は"--:--"を返す）
 */
export function formatTimeSafe(timeStr: string | null | undefined): string {
    if (!timeStr) return "--:--";
    try {
        return new Date(timeStr).toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Tokyo",
        });
    } catch {
        return "--:--";
    }
}

/**
 * 予約時刻（HH:mm:ss形式）をHH:mm形式で表示
 */
export function formatReservationTime(time: string): string {
    return time.slice(0, 5);
}
