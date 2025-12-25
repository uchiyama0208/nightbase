"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { floorKeys } from "./queries";
import {
    createSession,
    deleteSession,
    updateSession,
    checkoutSession,
    reopenSession,
} from "../actions/session";
import type { SessionDataV2, SessionUpdateData } from "../actions/types";

// ============================================
// セッション作成ミューテーション
// ============================================

interface CreateSessionParams {
    tableId?: string | null;
    tableName?: string | null;
    mainGuestId?: string;
    pricingSystemId?: string;
}

/**
 * セッション作成（楽観的UI付き）
 */
export function useCreateSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: CreateSessionParams) => {
            return createSession(
                params.tableId,
                params.mainGuestId,
                params.pricingSystemId
            );
        },
        onMutate: async (params) => {
            // 進行中のフェッチをキャンセル
            await queryClient.cancelQueries({ queryKey: floorKeys.activeSessions() });

            // 楽観的に新しいセッションを追加（UUIDで一意性を保証）
            const tempId = `temp-${crypto.randomUUID()}`;
            const optimisticSession: SessionDataV2 = {
                id: tempId,
                store_id: "",
                table_id: params.tableId ?? null,
                main_guest_id: null,
                guest_count: 0,
                status: "active",
                start_time: new Date().toISOString(),
                end_time: null,
                pricing_system_id: params.pricingSystemId ?? null,
                total_amount: 0,
                session_guests: [],
                orders: [],
            };

            queryClient.setQueryData<SessionDataV2[]>(
                floorKeys.activeSessions(),
                (old) => [optimisticSession, ...(old ?? [])]
            );

            return { tempId };
        },
        // onSuccessは不要（RealtimeのinvalidateQueriesが再フェッチして仮セッションを実データに置き換える）
        onError: (_err, _params, context) => {
            // エラー時は仮セッションを削除
            if (context?.tempId) {
                queryClient.setQueryData<SessionDataV2[]>(
                    floorKeys.activeSessions(),
                    (old) => old?.filter((s) => s.id !== context.tempId) ?? []
                );
            }
        },
    });
}

// ============================================
// セッション削除ミューテーション
// ============================================

/**
 * セッション削除
 * Note: 楽観的更新はRealtimeとの競合を避けるため使用しない
 * RealtimeのDELETEイベントがキャッシュから直接削除する
 */
export function useDeleteSession() {
    return useMutation({
        mutationFn: deleteSession,
    });
}

// ============================================
// セッション更新ミューテーション
// ============================================

interface UpdateSessionParams {
    sessionId: string;
    updates: SessionUpdateData;
}

/**
 * セッション更新
 * Note: Realtimeが自動でinvalidateするため、onSettledでのinvalidateは不要
 */
export function useUpdateSession() {
    return useMutation({
        mutationFn: async ({ sessionId, updates }: UpdateSessionParams) => {
            return updateSession(sessionId, updates);
        },
    });
}

// ============================================
// セッション会計完了ミューテーション
// ============================================

/**
 * セッション会計完了（楽観的UI付き）
 * Note: Realtimeが自動でinvalidateするため、onSettledでのinvalidateは不要
 */
export function useCheckoutSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: checkoutSession,
        onMutate: async (sessionId) => {
            await queryClient.cancelQueries({ queryKey: floorKeys.activeSessions() });

            const previousSessions = queryClient.getQueryData<SessionDataV2[]>(
                floorKeys.activeSessions()
            );

            // 楽観的にセッションを削除（完了タブに移動）
            queryClient.setQueryData<SessionDataV2[]>(
                floorKeys.activeSessions(),
                (old) => old?.filter((s) => s.id !== sessionId) ?? []
            );

            return { previousSessions };
        },
        onError: (_err, _sessionId, context) => {
            if (context?.previousSessions) {
                queryClient.setQueryData(
                    floorKeys.activeSessions(),
                    context.previousSessions
                );
            }
        },
        // Realtimeがinvalidateするため、ここでは不要
    });
}

// ============================================
// セッション再開ミューテーション
// ============================================

/**
 * セッション再開（楽観的UI付き）
 * Note: Realtimeが自動でinvalidateするため、onSettledでのinvalidateは不要
 */
export function useReopenSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: reopenSession,
        onMutate: async (sessionId) => {
            await queryClient.cancelQueries({ queryKey: floorKeys.completedSessions() });

            const previousSessions = queryClient.getQueryData<SessionDataV2[]>(
                floorKeys.completedSessions()
            );

            // 楽観的にセッションを削除（進行中タブに移動）
            queryClient.setQueryData<SessionDataV2[]>(
                floorKeys.completedSessions(),
                (old) => old?.filter((s) => s.id !== sessionId) ?? []
            );

            return { previousSessions };
        },
        onError: (_err, _sessionId, context) => {
            if (context?.previousSessions) {
                queryClient.setQueryData(
                    floorKeys.completedSessions(),
                    context.previousSessions
                );
            }
        },
        // Realtimeがinvalidateするため、ここでは不要
    });
}
