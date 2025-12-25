"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

// ========== Types ==========

export interface SnsAccount {
    id: string;
    store_id: string;
    platform: "x";
    account_name: string | null;
    account_id: string | null;
    is_connected: boolean;
    created_at: string;
    updated_at: string;
}

export interface SnsTemplate {
    id: string;
    store_id: string;
    name: string;
    content: string;
    template_type: "text" | "cast_list" | "custom";
    image_style: "photo_collage" | "text_design" | "none" | null;
    created_at: string;
    updated_at: string;
}

export interface SnsScheduledPost {
    id: string;
    store_id: string;
    template_id: string | null;
    content: string;
    image_url: string | null;
    image_style: "photo_collage" | "text_design" | "none" | null;
    platforms: string[];
    scheduled_at: string;
    status: "pending" | "posted" | "failed";
    error_message: string | null;
    created_by: string | null;
    created_at: string;
}

export interface SnsRecurringSchedule {
    id: string;
    store_id: string;
    template_id: string | null;
    name: string;
    content_type: "cast_list" | "template";
    image_style: "photo_collage" | "text_design" | "none" | null;
    platforms: string[];
    schedule_hour: number;
    is_active: boolean;
    last_run_at: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    template?: SnsTemplate;
}


// ========== Helper Functions ==========

async function checkSnsPermission() {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) throw new Error("No profile found");

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile?.store_id) throw new Error("No store found");
    if (profile.role !== "staff" && profile.role !== "admin") throw new Error("Insufficient permissions");

    return { supabase, profile, profileId: appUser.current_profile_id };
}

// ========== SNS Accounts ==========

export async function getSnsAccounts(): Promise<SnsAccount[]> {
    const { supabase, profile } = await checkSnsPermission();

    const { data, error } = await supabase
        .from("sns_accounts")
        .select("id, store_id, platform, account_name, account_id, is_connected, created_at, updated_at")
        .eq("store_id", profile.store_id);

    if (error) {
        console.error("Error fetching sns accounts:", error);
        return [];
    }

    return data || [];
}

export async function disconnectSnsAccount(platform: "x") {
    const { supabase, profile } = await checkSnsPermission();

    const { error } = await supabase
        .from("sns_accounts")
        .update({
            is_connected: false,
            access_token: null,
            refresh_token: null,
            token_expires_at: null,
            updated_at: new Date().toISOString(),
        })
        .eq("store_id", profile.store_id)
        .eq("platform", platform);

    if (error) {
        throw new Error("Failed to disconnect account");
    }

    revalidatePath("/app/sns");
    return { success: true };
}

// ========== Templates ==========

export async function getSnsTemplates(): Promise<SnsTemplate[]> {
    const { supabase, profile } = await checkSnsPermission();

    const { data, error } = await supabase
        .from("sns_templates")
        .select("*")
        .eq("store_id", profile.store_id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching sns templates:", error);
        return [];
    }

    return data || [];
}

export async function createSnsTemplate(formData: FormData) {
    const { supabase, profile } = await checkSnsPermission();

    const name = formData.get("name") as string;
    const content = formData.get("content") as string;
    const templateType = formData.get("template_type") as string;
    const imageStyle = formData.get("image_style") as string | null;

    const { data, error } = await supabase
        .from("sns_templates")
        .insert({
            store_id: profile.store_id,
            name,
            content,
            template_type: templateType,
            image_style: imageStyle || null,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating template:", error);
        throw new Error("テンプレートの作成に失敗しました");
    }

    revalidatePath("/app/sns");
    return { success: true, template: data };
}

export async function updateSnsTemplate(formData: FormData) {
    const { supabase } = await checkSnsPermission();

    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const content = formData.get("content") as string;
    const templateType = formData.get("template_type") as string;
    const imageStyle = formData.get("image_style") as string | null;

    const { error } = await supabase
        .from("sns_templates")
        .update({
            name,
            content,
            template_type: templateType,
            image_style: imageStyle || null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id);

    if (error) {
        console.error("Error updating template:", error);
        throw new Error("テンプレートの更新に失敗しました");
    }

    revalidatePath("/app/sns");
    return { success: true };
}

export async function deleteSnsTemplate(id: string) {
    const { supabase } = await checkSnsPermission();

    const { error } = await supabase
        .from("sns_templates")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting template:", error);
        throw new Error("テンプレートの削除に失敗しました");
    }

    revalidatePath("/app/sns");
    return { success: true };
}

// ========== Scheduled Posts ==========

const MAX_POST_HISTORY = 50; // 保存する投稿履歴の最大数

export async function getScheduledPosts(): Promise<SnsScheduledPost[]> {
    const { supabase, profile } = await checkSnsPermission();

    const { data, error } = await supabase
        .from("sns_scheduled_posts")
        .select("*")
        .eq("store_id", profile.store_id)
        .eq("status", "pending")
        .order("scheduled_at", { ascending: true });

    if (error) {
        console.error("Error fetching scheduled posts:", error);
        return [];
    }

    return data || [];
}

export async function getPostHistory(): Promise<SnsScheduledPost[]> {
    const { supabase, profile } = await checkSnsPermission();

    const { data, error } = await supabase
        .from("sns_scheduled_posts")
        .select("*")
        .eq("store_id", profile.store_id)
        .eq("status", "posted")
        .order("created_at", { ascending: false })
        .limit(MAX_POST_HISTORY);

    if (error) {
        console.error("Error fetching post history:", error);
        return [];
    }

    return data || [];
}

async function cleanupOldPosts(supabase: any, storeId: string) {
    // 投稿済みの件数を取得
    const { count } = await supabase
        .from("sns_scheduled_posts")
        .select("*", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("status", "posted");

    if (count && count > MAX_POST_HISTORY) {
        // 古い投稿を削除
        const { data: oldPosts } = await supabase
            .from("sns_scheduled_posts")
            .select("id")
            .eq("store_id", storeId)
            .eq("status", "posted")
            .order("created_at", { ascending: true })
            .limit(count - MAX_POST_HISTORY);

        if (oldPosts && oldPosts.length > 0) {
            const idsToDelete = oldPosts.map((p: any) => p.id);
            await supabase
                .from("sns_scheduled_posts")
                .delete()
                .in("id", idsToDelete);
        }
    }
}

export async function createScheduledPost(formData: FormData) {
    const { supabase, profile, profileId } = await checkSnsPermission();

    const content = formData.get("content") as string;
    const imageUrl = formData.get("image_url") as string | null;
    const imageStyle = formData.get("image_style") as string | null;
    const platformsJson = formData.get("platforms") as string;
    const scheduledAt = formData.get("scheduled_at") as string;
    const templateId = formData.get("template_id") as string | null;

    const platforms = JSON.parse(platformsJson);

    const { data, error } = await supabase
        .from("sns_scheduled_posts")
        .insert({
            store_id: profile.store_id,
            template_id: templateId || null,
            content,
            image_url: imageUrl || null,
            image_style: imageStyle || null,
            platforms,
            scheduled_at: scheduledAt,
            created_by: profileId,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating scheduled post:", error);
        throw new Error("スケジュール投稿の作成に失敗しました");
    }

    revalidatePath("/app/sns");
    return { success: true, post: data };
}

export async function deleteScheduledPost(id: string) {
    const { supabase } = await checkSnsPermission();

    const { error } = await supabase
        .from("sns_scheduled_posts")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting scheduled post:", error);
        throw new Error("スケジュール投稿の削除に失敗しました");
    }

    revalidatePath("/app/sns");
    return { success: true };
}

// ========== Recurring Schedules ==========

export async function getRecurringSchedules(): Promise<SnsRecurringSchedule[]> {
    const { supabase, profile } = await checkSnsPermission();

    const { data, error } = await supabase
        .from("sns_recurring_schedules")
        .select(`
            *,
            template:sns_templates(*)
        `)
        .eq("store_id", profile.store_id)
        .order("schedule_hour", { ascending: true });

    if (error) {
        console.error("Error fetching recurring schedules:", error);
        return [];
    }

    return data || [];
}

export async function createRecurringSchedule(formData: FormData) {
    const { supabase, profile, profileId } = await checkSnsPermission();

    const name = formData.get("name") as string;
    const contentType = formData.get("content_type") as string;
    const imageStyle = formData.get("image_style") as string | null;
    const platformsJson = formData.get("platforms") as string;
    const scheduleHour = parseInt(formData.get("schedule_hour") as string);
    const templateId = formData.get("template_id") as string | null;

    const platforms = JSON.parse(platformsJson);

    const { data, error } = await supabase
        .from("sns_recurring_schedules")
        .insert({
            store_id: profile.store_id,
            template_id: templateId || null,
            name,
            content_type: contentType,
            image_style: imageStyle || null,
            platforms,
            schedule_hour: scheduleHour,
            created_by: profileId,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating recurring schedule:", error);
        throw new Error("繰り返しスケジュールの作成に失敗しました");
    }

    revalidatePath("/app/sns");
    return { success: true, schedule: data };
}

export async function updateRecurringSchedule(formData: FormData) {
    const { supabase } = await checkSnsPermission();

    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const contentType = formData.get("content_type") as string;
    const imageStyle = formData.get("image_style") as string | null;
    const platformsJson = formData.get("platforms") as string;
    const scheduleHour = parseInt(formData.get("schedule_hour") as string);
    const templateId = formData.get("template_id") as string | null;
    const isActive = formData.get("is_active") === "true";

    const platforms = JSON.parse(platformsJson);

    const { error } = await supabase
        .from("sns_recurring_schedules")
        .update({
            template_id: templateId || null,
            name,
            content_type: contentType,
            image_style: imageStyle || null,
            platforms,
            schedule_hour: scheduleHour,
            is_active: isActive,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id);

    if (error) {
        console.error("Error updating recurring schedule:", error);
        throw new Error("繰り返しスケジュールの更新に失敗しました");
    }

    revalidatePath("/app/sns");
    return { success: true };
}

export async function deleteRecurringSchedule(id: string) {
    const { supabase } = await checkSnsPermission();

    const { error } = await supabase
        .from("sns_recurring_schedules")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting recurring schedule:", error);
        throw new Error("繰り返しスケジュールの削除に失敗しました");
    }

    revalidatePath("/app/sns");
    return { success: true };
}

export async function toggleRecurringSchedule(id: string, isActive: boolean) {
    const { supabase } = await checkSnsPermission();

    const { error } = await supabase
        .from("sns_recurring_schedules")
        .update({
            is_active: isActive,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id);

    if (error) {
        console.error("Error toggling recurring schedule:", error);
        throw new Error("スケジュールの切り替えに失敗しました");
    }

    revalidatePath("/app/sns");
    return { success: true };
}

// ========== Template Variable Replacement ==========

export async function getTemplatePreview(templateContent: string): Promise<string> {
    const { supabase, profile } = await checkSnsPermission();

    // 店舗情報を取得
    const { data: store } = await supabase
        .from("stores")
        .select("name")
        .eq("id", profile.store_id)
        .single();

    // 今日の日付（JST）
    const now = new Date();
    const jstDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const month = jstDate.getMonth() + 1;
    const day = jstDate.getDate();
    const weekdays = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
    const weekday = weekdays[jstDate.getDay()];

    // 今日の出勤キャストを取得（attendancesテーブルから）
    const todayStr = jstDate.toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");

    const { data: attendances } = await supabase
        .from("attendances")
        .select(`
            profile:profiles(display_name)
        `)
        .eq("store_id", profile.store_id)
        .eq("date", todayStr)
        .in("status", ["attended", "scheduled"]);

    const castNames = attendances
        ?.map((a: any) => a.profile?.display_name)
        .filter(Boolean) || [];

    // シフトから本日出勤予定のキャストを取得
    const { data: shifts } = await supabase
        .from("shifts")
        .select(`
            profile:profiles(display_name)
        `)
        .eq("store_id", profile.store_id)
        .eq("date", todayStr);

    const scheduledCastNames = shifts
        ?.map((s: any) => s.profile?.display_name)
        .filter(Boolean) || [];

    // 曜日を短縮形に
    const shortWeekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const shortWeekday = shortWeekdays[jstDate.getDay()];

    // 変数を置換
    let result = templateContent;
    result = result.replace(/{日付}/g, `${month}月${day}日(${shortWeekday})`);
    result = result.replace(/{店舗名}/g, store?.name || "");
    result = result.replace(/{出勤中キャスト}/g, castNames.join("、") || "（出勤情報なし）");
    result = result.replace(/{出勤予定キャスト}/g, scheduledCastNames.join("、") || "（出勤予定なし）");
    result = result.replace(/{出勤人数}/g, String(castNames.length));

    return result;
}

// ========== Get Today's Casts ==========

export async function getTodayCasts(): Promise<{ id: string; display_name: string; avatar_url: string | null }[]> {
    const { supabase, profile } = await checkSnsPermission();

    // 今日の日付（JST）
    const now = new Date();
    const todayStr = now.toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");

    const { data: attendances } = await supabase
        .from("attendances")
        .select(`
            profile:profiles(id, display_name, avatar_url)
        `)
        .eq("store_id", profile.store_id)
        .eq("date", todayStr)
        .in("status", ["attended", "scheduled"]);

    return attendances
        ?.map((a: any) => ({
            id: a.profile?.id,
            display_name: a.profile?.display_name,
            avatar_url: a.profile?.avatar_url,
        }))
        .filter((c: any) => c.id && c.display_name) || [];
}

// ========== X API Helper Functions ==========

const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const X_TWEET_URL = "https://api.twitter.com/2/tweets";

interface XTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
}

async function refreshXToken(refreshToken: string): Promise<XTokenResponse> {
    const credentials = Buffer.from(
        `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(X_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Basic ${credentials}`,
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        }).toString(),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to refresh X token:", errorText);
        throw new Error("Xのトークン更新に失敗しました。再連携が必要です。");
    }

    return response.json();
}

async function getValidXToken(supabase: any, account: any): Promise<string> {
    // Check if token is expired
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null;
    const now = new Date();

    // If token expires within 5 minutes, refresh it
    if (expiresAt && expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
        if (!account.refresh_token) {
            throw new Error("リフレッシュトークンがありません。再連携が必要です。");
        }

        try {
            const newTokens = await refreshXToken(account.refresh_token);
            const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

            // Update tokens in database
            await supabase
                .from("sns_accounts")
                .update({
                    access_token: newTokens.access_token,
                    refresh_token: newTokens.refresh_token || account.refresh_token,
                    token_expires_at: newExpiresAt,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", account.id);

            return newTokens.access_token;
        } catch (error) {
            // Mark account as disconnected if refresh fails
            await supabase
                .from("sns_accounts")
                .update({
                    is_connected: false,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", account.id);
            throw error;
        }
    }

    return account.access_token;
}

async function postToX(supabase: any, account: any, content: string): Promise<{ id: string }> {
    // Get valid access token (refresh if needed)
    const accessToken = await getValidXToken(supabase, account);

    // Post tweet
    const response = await fetch(X_TWEET_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            text: content,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("X API error:", response.status, errorData);

        if (response.status === 401) {
            // Token is invalid, mark as disconnected
            await supabase
                .from("sns_accounts")
                .update({
                    is_connected: false,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", account.id);
            throw new Error("Xの認証が無効です。再連携が必要です。");
        }

        if (response.status === 403) {
            throw new Error("Xへの投稿権限がありません。アプリの権限設定を確認してください。");
        }

        if (response.status === 429) {
            throw new Error("X APIのレート制限に達しました。しばらく待ってから再試行してください。");
        }

        throw new Error(errorData.detail || errorData.title || "Xへの投稿に失敗しました");
    }

    const data = await response.json();
    return { id: data.data.id };
}

// ========== Immediate Post ==========

export async function postNow(formData: FormData) {
    const { supabase, profile, profileId } = await checkSnsPermission();

    const content = formData.get("content") as string;
    const platformsJson = formData.get("platforms") as string;
    const imageUrl = formData.get("image_url") as string | null;

    const platforms = JSON.parse(platformsJson) as string[];

    // SNSアカウント情報を取得
    const { data: accounts } = await supabase
        .from("sns_accounts")
        .select("*")
        .eq("store_id", profile.store_id)
        .eq("is_connected", true);

    if (!accounts || accounts.length === 0) {
        throw new Error("連携されているSNSアカウントがありません");
    }

    const results: { platform: string; success: boolean; error?: string }[] = [];

    for (const platform of platforms) {
        const account = accounts.find(a => a.platform === platform);
        if (!account) {
            results.push({ platform, success: false, error: "アカウントが連携されていません" });
            continue;
        }

        try {
            if (platform === "x") {
                // X API投稿
                const result = await postToX(supabase, account, content);
                results.push({ platform, success: true });
            }
        } catch (error) {
            console.error(`Error posting to ${platform}:`, error);
            const message = error instanceof Error ? error.message : "投稿に失敗しました";
            results.push({ platform, success: false, error: message });
        }
    }

    // 投稿結果を確認
    const allFailed = results.every(r => !r.success);

    // 投稿履歴として保存
    const now = new Date().toISOString();
    await supabase
        .from("sns_scheduled_posts")
        .insert({
            store_id: profile.store_id,
            content,
            image_url: imageUrl || null,
            platforms,
            scheduled_at: now,
            status: allFailed ? "failed" : "posted",
            error_message: allFailed ? results.map(r => r.error).filter(Boolean).join(", ") : null,
            created_by: profileId,
        });

    // 古い投稿を削除
    await cleanupOldPosts(supabase, profile.store_id);

    revalidatePath("/app/sns");

    if (allFailed) {
        throw new Error(results.map(r => r.error).filter(Boolean).join(", "));
    }

    return { success: true, results };
}

// ========== Get SNS Page Data ==========

type SnsPageDataResult =
    | { redirect: string }
    | {
          data: {
              storeId: string;
              storeName: string;
              accounts: SnsAccount[];
              templates: SnsTemplate[];
              scheduledPosts: SnsScheduledPost[];
              postHistory: SnsScheduledPost[];
              recurringSchedules: SnsRecurringSchedule[];
          };
      };

export async function getSnsPageData(): Promise<SnsPageDataResult> {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { redirect: "/login" };
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return { redirect: "/app/me" };
    }

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("*, stores(*)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile || !currentProfile.store_id) {
        return { redirect: "/app/me" };
    }

    if (currentProfile.role !== "staff" && currentProfile.role !== "admin") {
        return { redirect: "/app/timecard" };
    }

    const [accounts, templates, scheduledPosts, postHistory, recurringSchedules] = await Promise.all([
        getSnsAccounts(),
        getSnsTemplates(),
        getScheduledPosts(),
        getPostHistory(),
        getRecurringSchedules(),
    ]);

    return {
        data: {
            storeId: currentProfile.store_id,
            storeName: currentProfile.stores?.name || "",
            accounts,
            templates,
            scheduledPosts,
            postHistory,
            recurringSchedules,
        },
    };
}
