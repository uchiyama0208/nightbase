import { createServerClient } from "@/lib/supabaseServerClient";
import { NextRequest, NextResponse } from "next/server";

/**
 * プッシュ購読の登録
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerClient() as any;
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // ユーザーのプロファイルを取得
        const { data: appUser } = await supabase
            .from("users")
            .select("current_profile_id")
            .eq("id", user.id)
            .maybeSingle();

        if (!appUser?.current_profile_id) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const body = await request.json();
        const { endpoint, p256dh, auth } = body;

        if (!endpoint || !p256dh || !auth) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 既存の購読を確認・更新、または新規作成
        const { data, error } = await supabase
            .from("push_subscriptions")
            .upsert({
                profile_id: appUser.current_profile_id,
                endpoint,
                p256dh,
                auth,
                user_agent: request.headers.get("user-agent") || null,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: "profile_id,endpoint",
            })
            .select()
            .single();

        if (error) {
            console.error("Error saving push subscription:", error);
            return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
        }

        // 通知設定がなければデフォルト設定を作成
        const { data: settings } = await supabase
            .from("push_notification_settings")
            .select("id")
            .eq("profile_id", appUser.current_profile_id)
            .maybeSingle();

        if (!settings) {
            await supabase
                .from("push_notification_settings")
                .insert({
                    profile_id: appUser.current_profile_id,
                });
        }

        return NextResponse.json({ success: true, subscription: data });
    } catch (error) {
        console.error("Push subscribe error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * プッシュ購読の解除
 */
export async function DELETE(request: NextRequest) {
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
        const { endpoint } = body;

        if (!endpoint) {
            return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
        }

        const { error } = await supabase
            .from("push_subscriptions")
            .delete()
            .eq("profile_id", appUser.current_profile_id)
            .eq("endpoint", endpoint);

        if (error) {
            console.error("Error deleting push subscription:", error);
            return NextResponse.json({ error: "Failed to delete subscription" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Push unsubscribe error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
