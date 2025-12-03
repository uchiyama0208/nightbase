export function getTimeValue(isoString: string | null, daySwitchTime: string): number {
    if (!isoString) return 0;
    const date = new Date(isoString);
    // Get hours and minutes in JST
    const hours = parseInt(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo", hour: "2-digit", hour12: false }), 10);
    const minutes = parseInt(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo", minute: "2-digit" }), 10);
    const totalMinutes = hours * 60 + minutes;

    // Convert day switch time to minutes
    const [switchHours, switchMinutes] = daySwitchTime.split(':').map(Number);
    const switchTotalMinutes = switchHours * 60 + switchMinutes;

    // If before day switch time, treat as next day (+24 hours)
    if (totalMinutes < switchTotalMinutes) {
        return totalMinutes + 24 * 60;
    }
    return totalMinutes;
}

export function sortCastsByTime(casts: any[], daySwitchTime: string) {
    return casts.sort((a: any, b: any) => {
        const timeA = getTimeValue(a.start_time, daySwitchTime);
        const timeB = getTimeValue(b.start_time, daySwitchTime);
        return timeA - timeB;
    });
}
