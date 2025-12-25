"use client";

import { useQuery } from "@tanstack/react-query";
import { getTables } from "../../seats/actions";
import {
    getActiveSessionsV2,
    getCompletedSessionsV2,
} from "../actions/session";
import { getTodayReservations, getTodayQueueEntries } from "../actions/reservation";

// ============================================
// クエリキー定義
// ============================================

export const floorKeys = {
    all: ["floor"] as const,
    tables: () => [...floorKeys.all, "tables"] as const,
    sessions: () => [...floorKeys.all, "sessions"] as const,
    activeSessions: () => [...floorKeys.sessions(), "active"] as const,
    completedSessions: () => [...floorKeys.sessions(), "completed"] as const,
    reservations: () => [...floorKeys.all, "reservations"] as const,
    todayReservations: () => [...floorKeys.reservations(), "today"] as const,
    queueEntries: () => [...floorKeys.all, "queueEntries"] as const,
    todayQueueEntries: () => [...floorKeys.queueEntries(), "today"] as const,
};

// ============================================
// クエリフック
// ============================================

/**
 * テーブル一覧を取得
 */
export function useTables() {
    return useQuery({
        queryKey: floorKeys.tables(),
        queryFn: getTables,
        staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    });
}

/**
 * 進行中セッション一覧を取得
 */
export function useActiveSessions() {
    return useQuery({
        queryKey: floorKeys.activeSessions(),
        queryFn: getActiveSessionsV2,
        staleTime: 30 * 1000, // 30秒間キャッシュ（頻繁に更新されるため短め）
    });
}

/**
 * 完了済みセッション一覧を取得
 */
export function useCompletedSessions() {
    return useQuery({
        queryKey: floorKeys.completedSessions(),
        queryFn: getCompletedSessionsV2,
        staleTime: 60 * 1000, // 1分間キャッシュ
    });
}

/**
 * 本日の予約一覧を取得
 */
export function useTodayReservations() {
    return useQuery({
        queryKey: floorKeys.todayReservations(),
        queryFn: getTodayReservations,
        staleTime: 60 * 1000, // 1分間キャッシュ
    });
}

/**
 * 本日のキューエントリ一覧を取得
 */
export function useTodayQueueEntries() {
    return useQuery({
        queryKey: floorKeys.todayQueueEntries(),
        queryFn: getTodayQueueEntries,
        staleTime: 60 * 1000, // 1分間キャッシュ
    });
}
