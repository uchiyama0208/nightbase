import { createServerClient } from "@/lib/supabaseServerClient";
import { NextRequest, NextResponse } from "next/server";

// 通知タイプの定義
export const NOTIFICATION_TYPES = [
    // 勤怠系
    "attendance",
    "shift_submitted",
    "shift_deadline",
    // フロア系
    "order_notification",
    "guest_arrival",
    "checkout",
    "set_time",
    "extension",
    "nomination",
    "in_store",
    "cast_rotation",
    // 管理系
    "inventory",
    "invitation_joined",
    "application",
    "resume",
    // 予約系
    "queue",
    "reservation",
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];

/**
 * 通知設定の取得
 */
export async function GET() {
    try {
        const supabase = await createServerClient() as any;
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: appUser } = await supabase
            .from("users")
            .select("current_profile_id")
            .eq("id", user.id)
            .maybeSingle();

        if (!appUser?.current_profile_id) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // 設定を取得
        let { data: settings } = await supabase
            .from("push_notification_settings")
            .select("*")
            .eq("profile_id", appUser.current_profile_id)
            .maybeSingle();

        // 設定がなければデフォルト設定を作成
        if (!settings) {
            const { data: newSettings, error } = await supabase
                .from("push_notification_settings")
                .insert({
                    profile_id: appUser.current_profile_id,
                })
                .select()
                .single();

            if (error) {
                console.error("Error creating default settings:", error);
                return NextResponse.json({ error: "Failed to create settings" }, { status: 500 });
            }
            settings = newSettings;
        }

        // 購読状態も取得
        const { data: subscriptions } = await supabase
            .from("push_subscriptions")
            .select("id")
            .eq("profile_id", appUser.current_profile_id);

        const isSubscribed = subscriptions && subscriptions.length > 0;

        return NextResponse.json({
            settings,
            isSubscribed,
        });
    } catch (error) {
        console.error("Get push settings error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * 通知設定の更新
 */
export async function PUT(request: NextRequest) {
    try {
        const supabase = await createServerClient() as any;
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: appUser } = await supabase
            .from("users")
            .select("current_profile_id")
            .eq("id", user.id)
            .maybeSingle();

        if (!appUser?.current_profile_id) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const body = await request.json();

        // 許可されたフィールドのみを抽出
        const allowedFields = ["enabled", ...NOTIFICATION_TYPES];
        const updates: Record<string, boolean> = {};

        for (const field of allowedFields) {
            if (typeof body[field] === "boolean") {
                updates[field] = body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        updates.updated_at = new Date().toISOString() as any;

        const { data, error } = await supabase
            .from("push_notification_settings")
            .update(updates)
            .eq("profile_id", appUser.current_profile_id)
            .select()
            .single();

        if (error) {
            console.error("Error updating push settings:", error);
            return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
        }

        return NextResponse.json({ success: true, settings: data });
    } catch (error) {
        console.error("Update push settings error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
