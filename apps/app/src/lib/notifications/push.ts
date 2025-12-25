/**
 * プッシュ通知送信ユーティリティ（サーバーサイド）
 */
import webpush from "web-push";
import { createServiceRoleClient } from "@/lib/supabaseServiceClient";

// 通知タイプの定義
export const NOTIFICATION_TYPES = [
    "attendance",
    "shift_submitted",
    "shift_deadline",
    "order_notification",
    "guest_arrival",
    "checkout",
    "set_time",
    "extension",
    "nomination",
    "in_store",
    "cast_rotation",
    "inventory",
    "invitation_joined",
    "application",
    "resume",
    "queue",
    "reservation",
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];

// 通知タイプと権限ページの対応
const NOTIFICATION_TYPE_TO_PAGE: Record<NotificationType, string | null> = {
    attendance: "attendance",
    shift_submitted: "shifts",
    shift_deadline: "shifts",
    order_notification: "orders",
    guest_arrival: "floor",
    checkout: "floor",
    set_time: "floor",
    extension: "floor",
    nomination: "floor",
    in_store: "floor",
    cast_rotation: "floor",
    inventory: "bottles",
    invitation_joined: "invitations",
    application: "resumes",
    resume: "resumes",
    queue: "queue",
    reservation: "reservations",
};

// VAPID設定
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
        "mailto:support@nightbase.jp",
        vapidPublicKey,
        vapidPrivateKey
    );
}

interface PushNotificationPayload {
    title: string;
    body: string;
    url?: string;
    tag?: string;
    requireInteraction?: boolean;
}

interface SendPushNotificationParams {
    storeId: string;
    notificationType: NotificationType;
    title: string;
    body: string;
    url?: string;
    profileIds?: string[]; // 指定がなければ店舗の全スタッフに送信
    excludeProfileIds?: string[]; // 除外するプロファイルID
}

/**
 * プッシュ通知を送信
 */
export async function sendPushNotification(params: SendPushNotificationParams): Promise<{
    sent: number;
    failed: number;
}> {
    const {
        storeId,
        notificationType,
        title,
        body,
        url,
        profileIds,
        excludeProfileIds = [],
    } = params;

    if (!vapidPublicKey || !vapidPrivateKey) {
        console.warn("VAPID keys not configured, skipping push notification");
        return { sent: 0, failed: 0 };
    }

    const supabase = createServiceRoleClient() as any;

    // 対象のプロファイルIDを取得
    let targetProfileIds: string[] = [];

    if (profileIds && profileIds.length > 0) {
        targetProfileIds = profileIds;
    } else {
        // 店舗の全スタッフを取得
        const { data: profiles } = await supabase
            .from("profiles")
            .select("id")
            .eq("store_id", storeId)
            .in("role", ["admin", "staff", "cast"]);

        targetProfileIds = profiles?.map((p: any) => p.id) || [];
    }

    // 除外するプロファイルを除く
    targetProfileIds = targetProfileIds.filter(id => !excludeProfileIds.includes(id));

    if (targetProfileIds.length === 0) {
        return { sent: 0, failed: 0 };
    }

    // 通知設定で有効になっているユーザーのみフィルタ
    const { data: enabledSettings } = await supabase
        .from("push_notification_settings")
        .select("profile_id")
        .in("profile_id", targetProfileIds)
        .eq("enabled", true)
        .eq(notificationType, true);

    const enabledProfileIds = enabledSettings?.map((s: any) => s.profile_id) || [];

    if (enabledProfileIds.length === 0) {
        return { sent: 0, failed: 0 };
    }

    // 権限チェック：通知タイプに対応するページへのアクセス権があるかチェック
    const requiredPage = NOTIFICATION_TYPE_TO_PAGE[notificationType];
    let authorizedProfileIds = enabledProfileIds;

    if (requiredPage) {
        // ロールごとの権限を取得
        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, role")
            .in("id", enabledProfileIds);

        const { data: roles } = await supabase
            .from("roles")
            .select("id, permissions")
            .eq("store_id", storeId);

        const rolePermissions: Record<string, any> = {};
        roles?.forEach((role: any) => {
            rolePermissions[role.id] = role.permissions;
        });

        // admin は全てのページにアクセス可能
        authorizedProfileIds = profiles?.filter((profile: any) => {
            if (profile.role === "admin") return true;
            const permissions = rolePermissions[profile.role];
            if (!permissions) return false;
            return permissions[requiredPage]?.view === true;
        }).map((p: any) => p.id) || [];
    }

    if (authorizedProfileIds.length === 0) {
        return { sent: 0, failed: 0 };
    }

    // 購読情報を取得
    const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .in("profile_id", authorizedProfileIds);

    if (!subscriptions || subscriptions.length === 0) {
        return { sent: 0, failed: 0 };
    }

    // 通知ペイロード
    const payload: PushNotificationPayload = {
        title,
        body,
        url: url || "/app/dashboard",
        tag: notificationType,
    };

    let sent = 0;
    let failed = 0;

    // 各購読に通知を送信
    for (const subscription of subscriptions) {
        try {
            await webpush.sendNotification(
                {
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh: subscription.p256dh,
                        auth: subscription.auth,
                    },
                },
                JSON.stringify(payload)
            );
            sent++;
        } catch (error) {
            console.error("Push notification failed:", error);
            failed++;

            // 410 Gone または 404 Not Found の場合は購読を削除
            if (error && typeof error === 'object' && 'statusCode' in error && (error.statusCode === 410 || error.statusCode === 404)) {
                await supabase
                    .from("push_subscriptions")
                    .delete()
                    .eq("id", subscription.id);
            }
        }
    }

    return { sent, failed };
}

/**
 * 特定のユーザーにプッシュ通知を送信（権限チェックなし）
 */
export async function sendPushNotificationToProfiles(params: {
    profileIds: string[];
    notificationType: NotificationType;
    title: string;
    body: string;
    url?: string;
}): Promise<{ sent: number; failed: number }> {
    const { profileIds, notificationType, title, body, url } = params;

    if (!vapidPublicKey || !vapidPrivateKey) {
        console.warn("VAPID keys not configured, skipping push notification");
        return { sent: 0, failed: 0 };
    }

    const supabase = createServiceRoleClient() as any;

    // 通知設定で有効になっているユーザーのみフィルタ
    const { data: enabledSettings } = await supabase
        .from("push_notification_settings")
        .select("profile_id")
        .in("profile_id", profileIds)
        .eq("enabled", true)
        .eq(notificationType, true);

    const enabledProfileIds = enabledSettings?.map((s: any) => s.profile_id) || [];

    if (enabledProfileIds.length === 0) {
        return { sent: 0, failed: 0 };
    }

    // 購読情報を取得
    const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .in("profile_id", enabledProfileIds);

    if (!subscriptions || subscriptions.length === 0) {
        return { sent: 0, failed: 0 };
    }

    const payload: PushNotificationPayload = {
        title,
        body,
        url: url || "/app/dashboard",
        tag: notificationType,
    };

    let sent = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
        try {
            await webpush.sendNotification(
                {
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh: subscription.p256dh,
                        auth: subscription.auth,
                    },
                },
                JSON.stringify(payload)
            );
            sent++;
        } catch (error) {
            console.error("Push notification failed:", error);
            failed++;

            if (error && typeof error === 'object' && 'statusCode' in error && (error.statusCode === 410 || error.statusCode === 404)) {
                await supabase
                    .from("push_subscriptions")
                    .delete()
                    .eq("id", subscription.id);
            }
        }
    }

    return { sent, failed };
}
