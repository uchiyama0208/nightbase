import { useState, useEffect, useCallback, useRef } from "react";
import { Table, TableSession } from "@/types/floor";
import { getTables } from "../../seats/actions";
import {
    getActiveSessionsV2,
    getCompletedSessionsV2,
} from "../actions/session";
import { processAutoFees } from "../actions/auto-fee";
import { getTodayReservations } from "../actions/reservation";
import { getCurrentStoreId } from "../actions/auth";
import type { SessionDataV2 } from "../actions/types";
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
    status: "waiting" | "visited" | "cancelled";
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
    selectedSession: SessionDataV2 | null;
    selectedTable: Table | null;
    setSelectedSession: React.Dispatch<React.SetStateAction<SessionDataV2 | null>>;
    setSelectedTable: React.Dispatch<React.SetStateAction<Table | null>>;
    loadData: (targetSessionId?: string) => Promise<void>;
    currentTab: FloorTab;
    setCurrentTab: React.Dispatch<React.SetStateAction<FloorTab>>;
    storeId: string | null;
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
 * - Supabase Realtimeで自動更新
 * - 自動料金処理を1分ごとに実行
 */
export function useFloorData(): UseFloorDataReturn {
    // State
    const [tables, setTables] = useState<Table[]>([]);
    const [sessions, setSessions] = useState<SessionDataV2[]>([]);
    const [reservations, setReservations] = useState<ReservationData[]>([]);
    const [selectedSession, setSelectedSession] = useState<SessionDataV2 | null>(null);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [currentTab, setCurrentTab] = useState<FloorTab>("active");
    const [storeId, setStoreId] = useState<string | null>(null);

    // キャッシュ用ref
    const storeIdRef = useRef<string | null>(null);
    const tablesRef = useRef<Table[]>([]);
    const isInitialLoadRef = useRef(true);

    /**
     * データを読み込む
     * @param targetSessionId 選択するセッションID（オプション）
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

        // テーブルとセッション/予約を並列取得
        const tablesPromise = isInitialLoadRef.current
            ? getTables()
            : Promise.resolve(tablesRef.current);

        const dataPromise = fetchTabData(currentTab);

        const [tablesData, contentData] = await Promise.all([tablesPromise, dataPromise]);

        // テーブルデータをキャッシュ
        if (isInitialLoadRef.current) {
            tablesRef.current = tablesData;
            isInitialLoadRef.current = false;
        }
        setTables(tablesData);

        // タブに応じてデータをセット
        let sessionsData: SessionDataV2[] = [];

        if (currentTab === "reserved") {
            setReservations(contentData as ReservationData[]);
            setSessions([]);
        } else {
            sessionsData = contentData as SessionDataV2[];
            setSessions(sessionsData);
            setReservations([]);
        }

        // 特定のセッションを選択
        if (targetSessionId && sessionsData.length > 0) {
            selectSessionById(targetSessionId, sessionsData, tablesData);
            return;
        }

        // 現在の選択を最新データで更新
        updateSelectedSession(sessionsData);
        updateSelectedTable(tablesData);
    }, [currentTab]);

    /**
     * タブに応じたデータを取得
     */
    const fetchTabData = async (tab: FloorTab) => {
        switch (tab) {
            case "reserved":
                return getTodayReservations();
            case "completed":
                return getCompletedSessionsV2();
            default:
                return getActiveSessionsV2();
        }
    };

    /**
     * IDでセッションを選択
     */
    const selectSessionById = (
        sessionId: string,
        sessionsData: SessionDataV2[],
        tablesData: Table[]
    ) => {
        const session = sessionsData.find((s) => s.id === sessionId);
        if (session) {
            const table = tablesData.find((t) => t.id === session.table_id);
            // SessionDataV2はTableSessionと互換性があるが、型が異なるためキャスト
            setSelectedSession(session);
            setSelectedTable(table || null);
        }
    };

    /**
     * 選択中のセッションを最新データで更新
     */
    const updateSelectedSession = (sessionsData: SessionDataV2[]) => {
        setSelectedSession((prev) => {
            if (!prev) return null;
            const updated = sessionsData.find((s) => s.id === prev.id);
            return updated || null;
        });
    };

    /**
     * 選択中のテーブルを最新データで更新
     */
    const updateSelectedTable = (tablesData: Table[]) => {
        setSelectedTable((prev) => {
            if (!prev) return null;
            const updated = tablesData.find((t) => t.id === prev.id);
            return updated || null;
        });
    };

    /**
     * 自動料金チェック処理（進行中タブのみ）
     */
    const processAutoFeesIfNeeded = useCallback(async () => {
        if (currentTab === "active") {
            try {
                await processAutoFees();
            } catch (error) {
                console.error("Error processing auto fees:", error);
            }
        }
    }, [currentTab]);

    // 初回ロードと自動更新
    useEffect(() => {
        loadData();

        // 自動料金チェックは1分ごと
        const autoFeeInterval = setInterval(() => {
            processAutoFeesIfNeeded().then(() => loadData());
        }, AUTO_FEE_INTERVAL_MS);

        return () => {
            clearInterval(autoFeeInterval);
        };
    }, [loadData, currentTab, processAutoFeesIfNeeded]);

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
                () => loadData()
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "orders",
                },
                () => loadData()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [loadData]);

    return {
        tables,
        sessions,
        reservations,
        selectedSession,
        selectedTable,
        setSelectedSession,
        setSelectedTable,
        loadData,
        currentTab,
        setCurrentTab,
        storeId,
    };
}
