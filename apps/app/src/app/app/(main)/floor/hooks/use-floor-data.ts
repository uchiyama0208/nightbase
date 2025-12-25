import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Table } from "@/types/floor";
import { useTables, useActiveSessions, useCompletedSessions, useTodayReservations, useTodayQueueEntries, floorKeys } from "./queries";
import { useDeleteSession } from "./mutations";
import { processAutoFees } from "../actions/auto-fee";
import { getCurrentStoreId } from "../actions/auth";
import type { SessionDataV2 } from "../actions/types";
import type { QueueEntryData } from "../actions/reservation";
import { createBrowserClient } from "@supabase/ssr";

// ============================================
// 型定義
// ============================================

export type FloorTab = "active" | "reserved" | "completed";

// 予約データ型（ReservationCardと一致させる）
export interface ReservationData {
    id: string;
    store_id?: string;
    guest_name: string;
    party_size: number;
    reservation_date?: string;
    reservation_time: string;
    status: string;
    guest_id?: string | null;
    nominated_cast?: {
        id: string;
        display_name: string;
    } | null;
}

// フックの戻り値型
interface UseFloorDataReturn {
    tables: Table[];
    sessions: SessionDataV2[];
    reservations: ReservationData[];
    queueEntries: QueueEntryData[];
    activeCount: number;
    reservedCount: number;
    selectedSession: SessionDataV2 | null;
    selectedTable: Table | null;
    setSelectedSession: React.Dispatch<React.SetStateAction<SessionDataV2 | null>>;
    setSelectedTable: React.Dispatch<React.SetStateAction<Table | null>>;
    loadData: (targetSessionId?: string) => Promise<void>;
    removeSessionOptimistic: (sessionId: string) => void;
    currentTab: FloorTab;
    setCurrentTab: React.Dispatch<React.SetStateAction<FloorTab>>;
    storeId: string | null;
    isLoading: boolean;
}

// ============================================
// 定数
// ============================================

const AUTO_FEE_INTERVAL_MS = 60000; // 1分

// ============================================
// カスタムフック
// ============================================

/**
 * フロア画面のデータ管理フック
 * - テーブル、セッション、予約データを管理
 * - TanStack Queryでキャッシュ管理
 * - Supabase Realtimeで自動更新
 * - 自動料金処理を1分ごとに実行
 */
export function useFloorData(): UseFloorDataReturn {
    const queryClient = useQueryClient();

    // タブ状態
    const [currentTab, setCurrentTab] = useState<FloorTab>("active");

    // 選択状態
    const [selectedSession, setSelectedSession] = useState<SessionDataV2 | null>(null);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [storeId, setStoreId] = useState<string | null>(null);

    // キャッシュ用ref
    const storeIdRef = useRef<string | null>(null);
    const selectedSessionIdRef = useRef<string | null>(null);

    // selectedSessionIdをrefで追跡（loadData内でのクロージャ問題を回避）
    useEffect(() => {
        selectedSessionIdRef.current = selectedSession?.id ?? null;
    }, [selectedSession]);

    // TanStack Query フック
    const { data: tables = [], isLoading: isLoadingTables } = useTables();
    const { data: activeSessions = [], isLoading: isLoadingActive } = useActiveSessions();
    const { data: completedSessions = [], isLoading: isLoadingCompleted } = useCompletedSessions();
    const { data: reservations = [], isLoading: isLoadingReservations } = useTodayReservations();
    const { data: queueEntries = [], isLoading: isLoadingQueue } = useTodayQueueEntries();

    // ローディング状態
    const isLoading = isLoadingTables || isLoadingActive;

    // ミューテーション
    const deleteSessionMutation = useDeleteSession();

    // 現在のタブに応じたセッションデータ
    const sessions = currentTab === "active" ? activeSessions :
                     currentTab === "completed" ? completedSessions : [];

    /**
     * データを再読み込み
     */
    const loadData = useCallback(async (targetSessionId?: string) => {
        // storeIdは初回のみ取得
        if (!storeIdRef.current) {
            const currentStoreId = await getCurrentStoreId();
            if (currentStoreId) {
                storeIdRef.current = currentStoreId;
                setStoreId(currentStoreId);
            }
        }

        // TanStack Queryのキャッシュを再フェッチ（完了を待つ）
        await queryClient.refetchQueries({ queryKey: floorKeys.all });

        // 特定のセッションを選択（新規選択の場合のみ）
        // 既に選択中のセッションをリフレッシュする場合はuseEffectで自動更新されるため、ここでは何もしない
        if (targetSessionId && targetSessionId !== selectedSessionIdRef.current) {
            const allSessions = queryClient.getQueryData<SessionDataV2[]>(floorKeys.activeSessions()) ?? [];
            const session = allSessions.find((s) => s.id === targetSessionId);
            if (session) {
                const table = tables.find((t) => t.id === session.table_id);
                setSelectedSession(session);
                setSelectedTable(table || null);
            }
        }
    }, [queryClient, tables]);

    /**
     * 楽観的UIでセッションを削除
     */
    const removeSessionOptimistic = useCallback((sessionId: string) => {
        deleteSessionMutation.mutate(sessionId);
        setSelectedSession(null);
        setSelectedTable(null);
    }, [deleteSessionMutation]);

    // currentTabをrefで追跡（intervalのクロージャ問題を回避）
    const currentTabRef = useRef(currentTab);
    useEffect(() => {
        currentTabRef.current = currentTab;
    }, [currentTab]);

    // storeId初期化
    useEffect(() => {
        if (!storeIdRef.current) {
            getCurrentStoreId().then((id) => {
                if (id) {
                    storeIdRef.current = id;
                    setStoreId(id);
                }
            });
        }
    }, []);

    // 自動料金処理を1分ごとに実行（依存関係を最小化してinterval重複を防止）
    useEffect(() => {
        let isProcessing = false;

        const autoFeeInterval = setInterval(async () => {
            // 進行中タブでない場合はスキップ
            if (currentTabRef.current !== "active") return;
            // 処理中の場合はスキップ（レースコンディション防止）
            if (isProcessing) return;

            isProcessing = true;
            try {
                await processAutoFees();
                queryClient.invalidateQueries({ queryKey: floorKeys.activeSessions() });
            } catch (error) {
                console.error("Error processing auto fees:", error);
            } finally {
                isProcessing = false;
            }
        }, AUTO_FEE_INTERVAL_MS);

        return () => {
            clearInterval(autoFeeInterval);
        };
    }, [queryClient]);

    // Supabase Realtime subscription
    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const channel = supabase
            .channel("floor_changes")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "table_sessions",
                },
                async (payload) => {
                    // DELETEイベントの場合は再フェッチせずにキャッシュから直接削除
                    if (payload.eventType === "DELETE" && payload.old && "id" in payload.old) {
                        const deletedId = payload.old.id as string;
                        // 進行中のクエリをキャンセルして上書きを防ぐ
                        await queryClient.cancelQueries({ queryKey: floorKeys.sessions() });
                        queryClient.setQueryData<SessionDataV2[]>(
                            floorKeys.activeSessions(),
                            (old) => old?.filter((s) => s.id !== deletedId) ?? []
                        );
                        queryClient.setQueryData<SessionDataV2[]>(
                            floorKeys.completedSessions(),
                            (old) => old?.filter((s) => s.id !== deletedId) ?? []
                        );
                    } else {
                        // INSERT/UPDATEの場合は再フェッチ
                        queryClient.invalidateQueries({ queryKey: floorKeys.sessions() });
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "orders",
                },
                (payload) => {
                    // DELETEイベントは無視（セッション削除時のカスケード削除で発火するため）
                    // INSERT/UPDATEのみ再フェッチ
                    if (payload.eventType !== "DELETE") {
                        queryClient.invalidateQueries({ queryKey: floorKeys.sessions() });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    // 選択中のセッションを最新データで更新
    useEffect(() => {
        if (selectedSession) {
            const updated = sessions.find((s) => s.id === selectedSession.id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(selectedSession)) {
                setSelectedSession(updated);
            }
        }
    }, [sessions, selectedSession]);

    return {
        tables,
        sessions,
        reservations: currentTab === "reserved" ? reservations : [],
        queueEntries: currentTab === "reserved" ? queueEntries : [],
        activeCount: activeSessions.length,
        reservedCount: reservations.length + queueEntries.length,
        selectedSession,
        selectedTable,
        setSelectedSession,
        setSelectedTable,
        loadData,
        removeSessionOptimistic,
        currentTab,
        setCurrentTab,
        storeId,
        isLoading,
    };
}
