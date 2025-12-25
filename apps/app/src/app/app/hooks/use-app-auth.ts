"use client";

import { useQuery } from "@tanstack/react-query";
import { getAppAuthData } from "../actions/auth";

export const authKeys = {
    all: ["auth"] as const,
    data: () => [...authKeys.all, "data"] as const,
    permissions: (pageKey: string) => [...authKeys.all, "permissions", pageKey] as const,
};

/**
 * アプリ全体の認証・権限データを取得するフック
 * キャッシュにより2回目以降は即座にデータを返す
 */
export function useAppAuth() {
    return useQuery({
        queryKey: authKeys.data(),
        queryFn: async () => {
            const result = await getAppAuthData();
            if (result.redirect) {
                window.location.href = result.redirect;
                return null;
            }
            return result.data;
        },
        staleTime: 5 * 60 * 1000, // 5分間キャッシュ
        gcTime: 30 * 60 * 1000, // 30分間保持
    });
}

/**
 * 認証データからよく使う値を取得するヘルパー
 */
export function useAuthHelpers() {
    const { data, isLoading } = useAppAuth();

    return {
        isLoading,
        isAuthenticated: !!data?.profile,
        profile: data?.profile ?? null,
        storeId: data?.storeId ?? null,
        permissions: data?.permissions ?? null,
        canEdit: (pageKey: string) => {
            if (!data?.profile) return false;
            if (data.profile.role === "admin") return true;
            const perm = data.permissions?.[pageKey];
            return perm === "edit";
        },
        hasAccess: (pageKey: string) => {
            if (!data?.profile) return false;
            if (data.profile.role === "admin") return true;
            const perm = data.permissions?.[pageKey];
            return perm === "view" || perm === "edit";
        },
    };
}
