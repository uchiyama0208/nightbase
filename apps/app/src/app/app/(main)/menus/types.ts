// メニューカテゴリの型定義
export interface MenuCategory {
    id: string;
    store_id: string;
    name: string;
    sort_order: number;
    created_at: string;
}

// メニューの型定義
export interface Menu {
    id: string;
    store_id: string;
    name: string;
    category_id: string;
    price: number;
    target_type: "guest" | "cast";
    cast_back_amount: number;
    hide_from_slip: boolean;
    is_hidden: boolean;
    image_url: string | null;
    stock_enabled: boolean;
    stock_quantity: number;
    stock_alert_threshold: number;
    created_at: string;
    updated_at: string;
    category?: MenuCategory;
}

// AI読み取り用のメニューアイテム型
export interface ExtractedMenuItem {
    name: string;
    price: number;
}

// カテゴリ並び替え用の型
export interface CategorySortOrderUpdate {
    id: string;
    sort_order: number;
}

// メニュー一括作成用の型
export interface BulkMenuCreateItem {
    name: string;
    price: number;
    categoryId: string;
}

// メニューデータ取得の結果型
export interface MenusDataResult {
    redirect?: string;
    data?: {
        menus: Menu[];
        categories: MenuCategory[];
    };
}

// メニュー作成用のペイロード
export interface MenuCreatePayload {
    store_id: string;
    name: string;
    category_id: string;
    price: number;
    target_type: "guest" | "cast";
    cast_back_amount: number;
    hide_from_slip: boolean;
    is_hidden: boolean;
    image_url: string | null;
    stock_enabled: boolean;
    stock_quantity: number;
    stock_alert_threshold: number;
}

// メニュー更新用のペイロード
export interface MenuUpdatePayload {
    name: string;
    category_id: string;
    price: number;
    target_type: "guest" | "cast";
    cast_back_amount: number;
    hide_from_slip: boolean;
    is_hidden: boolean;
    image_url: string | null;
    stock_enabled: boolean;
    stock_quantity: number;
    stock_alert_threshold: number;
    updated_at: string;
}
