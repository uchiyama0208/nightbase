"use server";

import { getAppData, type ProfileWithStoreData, type PagePermissions } from "../data-access";

export interface AppAuthData {
    profile: ProfileWithStoreData | null;
    storeId: string | undefined;
    permissions: PagePermissions | null;
}

export interface AppAuthResult {
    data?: AppAuthData;
    redirect?: string;
}

/**
 * クライアントから呼び出せる認証データ取得用Server Action
 */
export async function getAppAuthData(): Promise<AppAuthResult> {
    const { user, profile, storeId, permissions } = await getAppData();

    if (!user) {
        return { redirect: "/login" };
    }

    if (!profile) {
        return { redirect: "/onboarding/choice" };
    }

    if (!profile.store_id) {
        return { redirect: "/onboarding/store-info" };
    }

    return {
        data: {
            profile,
            storeId,
            permissions: permissions ?? null,
        },
    };
}
