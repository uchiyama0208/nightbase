export function formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Tokyo",
    });
}
