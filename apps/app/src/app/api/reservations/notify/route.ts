import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServerClient";
import { sendReservationNotificationEmail } from "@/lib/notifications/email";
import { sendReservationNotificationSMS } from "@/lib/notifications/sms";

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
        const { reservationId } = body;

        if (!reservationId) {
            return NextResponse.json(
                { success: false, error: "予約IDが必要です" },
                { status: 400 }
            );
        }

        // 予約を取得
        const { data: reservation, error: reservationError } = await supabase
            .from("reservations")
            .select("*, stores(name, reservation_notification_message)")
            .eq("id", reservationId)
            .single();

        if (reservationError || !reservation) {
            return NextResponse.json(
                { success: false, error: "予約が見つかりません" },
                { status: 404 }
            );
        }

        // ユーザーがこの店舗に所属しているか確認
        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .eq("store_id", reservation.store_id)
            .maybeSingle();

        if (!profile) {
            return NextResponse.json(
                { success: false, error: "この操作を行う権限がありません" },
                { status: 403 }
            );
        }

        const storeName = reservation.stores?.name || "店舗";
        const customMessage = reservation.stores?.reservation_notification_message || "ご予約ありがとうございます。当日のご来店をお待ちしております。";

        // 日付をフォーマット
        const reservationDate = new Date(reservation.reservation_date).toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        const reservationTime = reservation.reservation_time.slice(0, 5);

        // 連絡先タイプに応じて通知を送信
        let notificationResult: { success: boolean; error?: string };

        if (reservation.contact_type === "email") {
            notificationResult = await sendReservationNotificationEmail({
                to: reservation.contact_value,
                storeName,
                guestName: reservation.guest_name,
                reservationDate,
                reservationTime,
                customMessage,
            });
        } else {
            notificationResult = await sendReservationNotificationSMS({
                to: reservation.contact_value,
                storeName,
                guestName: reservation.guest_name,
                reservationDate,
                reservationTime,
                customMessage,
            });
        }

        if (!notificationResult.success) {
            return NextResponse.json(
                { success: false, error: notificationResult.error || "通知の送信に失敗しました" },
                { status: 500 }
            );
        }

        // 通知日時を更新
        await supabase
            .from("reservations")
            .update({
                notified_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", reservationId);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Reservation notify API error:", err);
        return NextResponse.json(
            { success: false, error: "サーバーエラーが発生しました" },
            { status: 500 }
        );
    }
}
