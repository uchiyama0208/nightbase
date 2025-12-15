/**
 * セッション詳細モーダルで使用するタグオプション
 * キャストの状態と料金タイプを表す6つのタグ
 */
export const TAG_OPTIONS = [
    { value: "waiting", label: "待機", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300", isStatus: true },
    { value: "serving", label: "接客中", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", isStatus: true },
    { value: "ended", label: "終了", color: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300", isStatus: true },
    { value: "nomination", label: "指名", color: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300", isStatus: false, itemName: "指名料" },
    { value: "companion", label: "場内", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", isStatus: false, itemName: "場内料金" },
    { value: "douhan", label: "同伴", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300", isStatus: false, itemName: "同伴料" },
] as const;

export type TagValue = typeof TAG_OPTIONS[number]['value'];
export type TagOption = typeof TAG_OPTIONS[number];

/**
 * ordersデータから現在のタグを取得
 * cast_statusに保存されている値をそのまま返す
 */
export function getCurrentTag(order: { cast_status?: string; item_name?: string }): TagValue {
    const status = order.cast_status;

    // cast_statusが6つのタグ値のいずれかであればそのまま返す
    if (status === 'waiting' || status === 'serving' || status === 'ended' ||
        status === 'nomination' || status === 'companion' || status === 'douhan') {
        return status;
    }

    // 旧データ互換: cast_statusがない場合はitem_nameから判定
    const itemName = order.item_name;
    if (itemName === '指名料') return 'nomination';
    if (itemName === '場内料金') return 'companion';
    if (itemName === '同伴料') return 'douhan';

    return 'waiting'; // デフォルト
}

/**
 * タグ値からオプションを取得
 */
export function getTagOption(value: TagValue): TagOption {
    return TAG_OPTIONS.find(opt => opt.value === value) || TAG_OPTIONS[0];
}
