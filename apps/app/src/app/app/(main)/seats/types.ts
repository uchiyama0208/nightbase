// テーブルタイプの型定義
export interface TableType {
    id: string;
    store_id: string;
    name: string;
    sort_order: number;
    created_at?: string;
    updated_at?: string;
}

// 並び替え更新のパラメータ
export interface SortOrderUpdate {
    id: string;
    sort_order: number;
}
