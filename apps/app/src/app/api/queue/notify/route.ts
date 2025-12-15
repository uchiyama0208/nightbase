import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServerClient";
import { sendQueueNotificationEmail } from "@/lib/notifications/email";
import { sendQueueNotificationSMS } from "@/lib/notifications/sms";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerClient() as any;

        // 認証チェック
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: "認証が必要です" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { entryId } = body;

        if (!entryId) {
            return NextResponse.json(
                { success: false, error: "エントリIDが必要です" },
                { status: 400 }
            );
        }

        // エントリを取得
        const { data: entry, error: entryError } = await supabase
            .from("queue_entries")
            .select("*, stores(name, queue_notification_message)")
            .eq("id", entryId)
            .single();

        if (entryError || !entry) {
            return NextResponse.json(
                { success: false, error: "エントリが見つかりません" },
                { status: 404 }
            );
        }

        // ユーザーがこの店舗に所属しているか確認
        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .eq("store_id", entry.store_id)
            .maybeSingle();

        if (!profile) {
            return NextResponse.json(
                { success: false, error: "この操作を行う権限がありません" },
                { status: 403 }
            );
        }

        const storeName = entry.stores?.name || "店舗";
        const customMessage = entry.stores?.queue_notification_message || "お待たせいたしました。まもなくご案内できます。";

        // 連絡先タイプに応じて通知を送信
        let notificationResult: { success: boolean; error?: string };

        if (entry.contact_type === "email") {
            notificationResult = await sendQueueNotificationEmail({
                to: entry.contact_value,
                storeName,
                guestName: entry.guest_name,
                customMessage,
            });
        } else {
            notificationResult = await sendQueueNotificationSMS({
                to: entry.contact_value,
                storeName,
                guestName: entry.guest_name,
                customMessage,
            });
        }

        if (!notificationResult.success) {
            return NextResponse.json(
                { success: false, error: notificationResult.error || "通知の送信に失敗しました" },
                { status: 500 }
            );
        }

        // ステータスを更新
        await supabase
            .from("queue_entries")
            .update({
                status: "notified",
                notified_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", entryId);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Queue notify API error:", err);
        return NextResponse.json(
            { success: false, error: "サーバーエラーが発生しました" },
            { status: 500 }
        );
    }
}
