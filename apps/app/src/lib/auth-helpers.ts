import { createServerClient } from "@/lib/supabaseServerClient";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 認証・ストア情報取得の結果型
 */
export interface AuthContext {
    supabase: SupabaseClient;
    userId: string;
    profileId: string;
    storeId: string;
    role: string;
    roleId: string | null;
}

/**
 * ページデータ取得用の結果型（リダイレクト対応）
 */
export type PageDataResult<T> =
    | { redirect: string }
    | { data: T };

/**
 * 認証チェック用のオプション
 */
export interface AuthCheckOptions {
    /** staffロールを必須にするか（デフォルト: false） */
    requireStaff?: boolean;
    /** 特定の権限をチェックするか */
    permission?: string;
}

/**
 * 認証とストア情報を取得する共通関数（Server Actions用）
 *
 * @throws {Error} 認証エラー、プロフィール未設定、ストア未設定の場合
 * @returns 認証コンテキスト
 */
export async function getAuthContext(options: AuthCheckOptions = {}): Promise<AuthContext> {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        throw new Error("No profile found");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile?.store_id) {
        throw new Error("No store found");
    }

    // staffロールチェック
    if (options.requireStaff && profile.role !== "staff" && profile.role !== "admin") {
        throw new Error("Insufficient permissions");
    }

    // 権限チェック
    if (options.permission && profile.role_id) {
        const { data: roleData } = await supabase
            .from("store_roles")
            .select("permissions")
            .eq("id", profile.role_id)
            .single();

        const permissions = roleData?.permissions as Record<string, boolean> | null;
        if (permissions && !permissions[options.permission]) {
            // Fallback: 基本ロールがstaffでない場合はエラー
            if (profile.role !== "staff" && profile.role !== "admin") {
                throw new Error("Insufficient permissions");
            }
        }
    }

    return {
        supabase,
        userId: user.id,
        profileId: appUser.current_profile_id,
        storeId: profile.store_id,
        role: profile.role,
        roleId: profile.role_id,
    };
}

/**
 * 認証とストア情報を取得する共通関数（ページデータ取得用）
 * リダイレクトパスを返すので、ページコンポーネントで使用
 *
 * @returns 認証コンテキストまたはリダイレクト情報
 */
export async function getAuthContextForPage(options: AuthCheckOptions = {}): Promise<
    | { redirect: string }
    | { context: AuthContext; storeName: string }
> {
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

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role_id, role, stores(name)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile?.store_id) {
        return { redirect: "/app/me" };
    }

    // staffロールチェック
    if (options.requireStaff && profile.role !== "staff" && profile.role !== "admin") {
        return { redirect: "/app/timecard" };
    }

    const storesData = profile.stores as { name: string } | { name: string }[] | null;
    const storeName = Array.isArray(storesData) ? storesData[0]?.name || "" : storesData?.name || "";

    return {
        context: {
            supabase,
            userId: user.id,
            profileId: appUser.current_profile_id,
            storeId: profile.store_id,
            role: profile.role,
            roleId: profile.role_id,
        },
        storeName,
    };
}

/**
 * 認証のみチェックする軽量版（ストア情報が不要な場合）
 *
 * @throws {Error} 認証エラーの場合
 * @returns ユーザーIDとプロフィールID
 */
export async function getAuthUser(): Promise<{
    supabase: SupabaseClient;
    userId: string;
    profileId: string;
}> {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        throw new Error("No profile found");
    }

    return {
        supabase,
        userId: user.id,
        profileId: appUser.current_profile_id,
    };
}

/**
 * Supabaseクエリのエラーを処理する共通関数
 */
export function handleQueryError(error: unknown, context: string): never {
    console.error(`Error in ${context}:`, error);
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`${context}に失敗しました: ${message}`);
}

/**
 * Supabaseクエリ結果をログ出力付きで処理
 */
export function logQueryError(error: unknown, context: string): void {
    console.error(`Error ${context}:`, error);
}
