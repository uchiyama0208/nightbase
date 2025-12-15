// 料金システムの型定義（@/types/floor からのエクスポートを補完）
export { type PricingSystem } from "@/types/floor";

// 料金システム作成用のペイロード
export interface PricingSystemCreatePayload {
    name: string;
    set_fee: number;
    set_duration_minutes: number;
    extension_fee: number;
    extension_duration_minutes: number;
    nomination_fee: number;
    nomination_set_duration_minutes: number;
    douhan_fee: number;
    douhan_set_duration_minutes: number;
    companion_fee: number;
    companion_set_duration_minutes: number;
    service_rate: number;
    tax_rate: number;
    is_default: boolean;
}

// 料金システム更新用のペイロード
export interface PricingSystemUpdatePayload extends Partial<PricingSystemCreatePayload> {
    updated_at?: string;
}

// フォームデータの型定義
export interface PricingSystemFormData {
    name: string;
    set_fee: number | "";
    set_duration_minutes: number | "";
    extension_fee: number | "";
    extension_duration_minutes: number | "";
    nomination_fee: number | "";
    nomination_set_duration_minutes: number | "";
    douhan_fee: number | "";
    douhan_set_duration_minutes: number | "";
    companion_fee: number | "";
    companion_set_duration_minutes: number | "";
    service_rate: number | "";
    tax_rate: number | "";
    is_default: boolean;
}
