"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";

// ========== Types ==========

export interface SnsAccount {
    id: string;
    store_id: string;
    platform: "x" | "instagram";
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
    instagram_type: "post" | "story" | null;
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
    content_type: "cast_list" | "template" | "ai_generated";
    image_style: "photo_collage" | "text_design" | "none" | null;
    platforms: string[];
    instagram_type: "post" | "story" | null;
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

export async function disconnectSnsAccount(platform: "x" | "instagram") {
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
    const instagramType = formData.get("instagram_type") as string | null;
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
            instagram_type: instagramType || null,
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
    const instagramType = formData.get("instagram_type") as string | null;
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
            instagram_type: instagramType || null,
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
    const instagramType = formData.get("instagram_type") as string | null;
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
            instagram_type: instagramType || null,
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

// ========== AI Content Generation ==========

export async function generateSnsContent(prompt: string): Promise<string> {
    const { supabase, profile } = await checkSnsPermission();

    // 店舗情報を取得
    const { data: store } = await supabase
        .from("stores")
        .select("name")
        .eq("id", profile.store_id)
        .single();

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `あなたは夜のお店（キャバクラ、クラブ、バーなど）のSNS投稿を作成するアシスタントです。
店舗名: ${store?.name || ""}

以下の点に注意して投稿文を作成してください：
- 親しみやすく、魅力的な文章
- 適度に絵文字を使用
- ハッシュタグは3〜5個程度
- 280文字以内（X対応）

投稿文のみを返してください。`;

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
        ],
        temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error("AIからの応答がありません");
    }

    return content;
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

// ========== Immediate Post ==========

export async function postNow(formData: FormData) {
    const { supabase, profile, profileId } = await checkSnsPermission();

    const content = formData.get("content") as string;
    const platformsJson = formData.get("platforms") as string;
    const instagramType = formData.get("instagram_type") as string | null;
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
                // X API投稿（実装予定）
                // await postToX(account.access_token, content, imageUrl);
                results.push({ platform, success: true });
            } else if (platform === "instagram") {
                // Instagram API投稿（実装予定）
                // await postToInstagram(account.access_token, content, imageUrl, instagramType);
                results.push({ platform, success: true });
            }
        } catch (error: any) {
            results.push({ platform, success: false, error: error.message });
        }
    }

    // 投稿履歴として保存
    const now = new Date().toISOString();
    await supabase
        .from("sns_scheduled_posts")
        .insert({
            store_id: profile.store_id,
            content,
            image_url: imageUrl || null,
            platforms,
            instagram_type: instagramType || null,
            scheduled_at: now,
            status: "posted",
            created_by: profileId,
        });

    // 古い投稿を削除
    await cleanupOldPosts(supabase, profile.store_id);

    revalidatePath("/app/sns");
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
