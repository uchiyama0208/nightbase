import { FloorTab } from "../hooks/use-floor-data";

/**
 * フロアページのタブ定義
 */
export const FLOOR_TABS: { key: FloorTab; label: string }[] = [
    { key: "active", label: "進行中" },
    { key: "reserved", label: "予約" },
    { key: "completed", label: "終了済み" },
] as const;

/**
 * 空データ時のメッセージ
 */
export const EMPTY_MESSAGES: Record<FloorTab, { title: string; subtitle?: string }> = {
    active: {
        title: "アクティブなセッションはありません",
        subtitle: "右上のボタンから新規セッションを開始してください",
    },
    reserved: {
        title: "本日の予約はありません",
    },
    completed: {
        title: "終了済みのセッションはありません",
    },
};
