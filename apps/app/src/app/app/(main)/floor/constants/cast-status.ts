export const CAST_STATUS_OPTIONS = [
    { value: "waiting", label: "待機", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
    { value: "serving", label: "接客中", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
    { value: "ended", label: "終了", color: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300" },
    { value: "jonai", label: "場内", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
    { value: "shimei", label: "指名", color: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300" },
] as const;

export function getStatusOption(status: string) {
    return CAST_STATUS_OPTIONS.find(opt => opt.value === status) || CAST_STATUS_OPTIONS[0];
}
