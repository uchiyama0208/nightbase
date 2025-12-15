import { Resend } from "resend";

interface SendQueueNotificationEmailParams {
    to: string;
    storeName: string;
    guestName: string;
    customMessage: string;
}

interface SendReservationNotificationEmailParams {
    to: string;
    storeName: string;
    guestName: string;
    reservationDate: string;
    reservationTime: string;
    customMessage: string;
}

export async function sendQueueNotificationEmail({
    to,
    storeName,
    guestName,
    customMessage,
}: SendQueueNotificationEmailParams): Promise<{ success: boolean; error?: string }> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.error("RESEND_API_KEY is not configured");
        return { success: false, error: "メール設定が完了していません" };
    }

    const resend = new Resend(apiKey);

    try {
        const { error } = await resend.emails.send({
            from: `${storeName} <noreply@nightbase.app>`,
            to: [to],
            subject: `【${storeName}】順番のお知らせ`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="font-size: 24px; color: #1a1a1a; margin-bottom: 24px;">
                        ${storeName}
                    </h1>
                    <p style="font-size: 16px; color: #333; margin-bottom: 16px;">
                        ${guestName} 様
                    </p>
                    <p style="font-size: 16px; color: #333; margin-bottom: 24px; white-space: pre-wrap;">
                        ${customMessage}
                    </p>
                    <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
                    <p style="font-size: 12px; color: #666;">
                        このメールは${storeName}の順番待ちシステムから自動送信されています。
                    </p>
                </div>
            `,
        });

        if (error) {
            console.error("Email send error:", error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error("Email send exception:", err);
        return { success: false, error: "メール送信に失敗しました" };
    }
}

export async function sendReservationNotificationEmail({
    to,
    storeName,
    guestName,
    reservationDate,
    reservationTime,
    customMessage,
}: SendReservationNotificationEmailParams): Promise<{ success: boolean; error?: string }> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.error("RESEND_API_KEY is not configured");
        return { success: false, error: "メール設定が完了していません" };
    }

    const resend = new Resend(apiKey);

    try {
        const { error } = await resend.emails.send({
            from: `${storeName} <noreply@nightbase.app>`,
            to: [to],
            subject: `【${storeName}】ご予約のお知らせ`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="font-size: 24px; color: #1a1a1a; margin-bottom: 24px;">
                        ${storeName}
                    </h1>
                    <p style="font-size: 16px; color: #333; margin-bottom: 16px;">
                        ${guestName} 様
                    </p>
                    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                        <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">ご予約日時</p>
                        <p style="font-size: 18px; color: #1a1a1a; margin: 0; font-weight: bold;">
                            ${reservationDate} ${reservationTime}
                        </p>
                    </div>
                    <p style="font-size: 16px; color: #333; margin-bottom: 24px; white-space: pre-wrap;">
                        ${customMessage}
                    </p>
                    <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
                    <p style="font-size: 12px; color: #666;">
                        このメールは${storeName}の予約システムから自動送信されています。
                    </p>
                </div>
            `,
        });

        if (error) {
            console.error("Email send error:", error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error("Email send exception:", err);
        return { success: false, error: "メール送信に失敗しました" };
    }
}
