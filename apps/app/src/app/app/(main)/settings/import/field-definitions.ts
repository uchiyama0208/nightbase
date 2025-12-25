import { FieldDefinition } from "./types";

export const USER_FIELDS: FieldDefinition[] = [
    {
        key: "display_name",
        label: "表示名",
        type: "string",
        required: true,
        examples: ["山田太郎", "YAMADA"],
    },
    {
        key: "display_name_kana",
        label: "表示名かな",
        type: "string",
        required: false,
        examples: ["やまだたろう"],
    },
    {
        key: "real_name",
        label: "本名",
        type: "string",
        required: false,
        examples: ["山田太郎"],
    },
    {
        key: "real_name_kana",
        label: "本名かな",
        type: "string",
        required: false,
        examples: ["やまだたろう"],
    },
];

export const ATTENDANCE_FIELDS: FieldDefinition[] = [
    {
        key: "display_name",
        label: "ユーザー名",
        type: "string",
        required: true,
        examples: ["山田太郎"],
    },
    {
        key: "date",
        label: "日付",
        type: "date",
        required: true,
        examples: ["2024-01-15", "2024/01/15"],
    },
    {
        key: "status",
        label: "ステータス",
        type: "string",
        required: true,
        examples: ["scheduled", "working", "finished"],
    },
    {
        key: "start_time",
        label: "開始時刻",
        type: "time",
        required: false,
        examples: ["18:00", "18:00:00"],
    },
    {
        key: "end_time",
        label: "終了時刻",
        type: "time",
        required: false,
        examples: ["02:00", "02:00:00"],
    },
];

export const MENU_FIELDS: FieldDefinition[] = [
    {
        key: "name",
        label: "メニュー名",
        type: "string",
        required: true,
        examples: ["ビール", "ウイスキー"],
    },
    {
        key: "price",
        label: "価格",
        type: "number",
        required: true,
        examples: ["500", "1000"],
    },
];
