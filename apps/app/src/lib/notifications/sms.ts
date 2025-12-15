import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

interface SendQueueNotificationSMSParams {
    to: string;
    storeName: string;
    guestName: string;
    customMessage: string;
}

interface SendReservationNotificationSMSParams {
    to: string;
    storeName: string;
    guestName: string;
    reservationDate: string;
    reservationTime: string;
    customMessage: string;
}

// 電話番号を国際形式に変換（日本の場合）
function formatPhoneNumber(phone: string): string {
    // ハイフンとスペースを削除
    const cleaned = phone.replace(/[\s\-]/g, "");

    // すでに+81で始まっている場合はそのまま
    if (cleaned.startsWith("+81")) {
        return cleaned;
    }

    // 0から始まる場合は+81に置換
    if (cleaned.startsWith("0")) {
        return "+81" + cleaned.slice(1);
    }

    // それ以外の場合は+81を付加
    return "+81" + cleaned;
}

export async function sendQueueNotificationSMS({
    to,
    storeName,
    guestName,
    customMessage,
}: SendQueueNotificationSMSParams): Promise<{ success: boolean; error?: string }> {
    // Twilio設定が不完全な場合
    if (!accountSid || !authToken || !fromNumber) {
        console.error("Twilio configuration is incomplete");
        return { success: false, error: "SMS設定が完了していません" };
    }

    try {
        const client = twilio(accountSid, authToken);
        const formattedTo = formatPhoneNumber(to);

        const message = await client.messages.create({
            body: `【${storeName}】\n${guestName}様\n${customMessage}`,
            from: fromNumber,
            to: formattedTo,
        });

        console.log("SMS sent successfully:", message.sid);
        return { success: true };
    } catch (err: any) {
        console.error("SMS send error:", err);
        return { success: false, error: err.message || "SMS送信に失敗しました" };
    }
}

export async function sendReservationNotificationSMS({
    to,
    storeName,
    guestName,
    reservationDate,
    reservationTime,
    customMessage,
}: SendReservationNotificationSMSParams): Promise<{ success: boolean; error?: string }> {
    // Twilio設定が不完全な場合
    if (!accountSid || !authToken || !fromNumber) {
        console.error("Twilio configuration is incomplete");
        return { success: false, error: "SMS設定が完了していません" };
    }

    try {
        const client = twilio(accountSid, authToken);
        const formattedTo = formatPhoneNumber(to);

        const message = await client.messages.create({
            body: `【${storeName}】\n${guestName}様\n予約日時: ${reservationDate} ${reservationTime}\n${customMessage}`,
            from: fromNumber,
            to: formattedTo,
        });

        console.log("SMS sent successfully:", message.sid);
        return { success: true };
    } catch (err: any) {
        console.error("SMS send error:", err);
        return { success: false, error: err.message || "SMS送信に失敗しました" };
    }
}
