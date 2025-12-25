import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
    icon?: LucideIcon;
    title?: string;
    description: string;
    action?: React.ReactNode;
    className?: string;
}

/**
 * 汎用的な空状態コンポーネント
 * カード、リスト、グリッドなどでデータがない時に表示
 */
export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center py-12 px-4 text-center",
                "bg-gray-50 dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700",
                className
            )}
        >
            {Icon && (
                <div className="mb-4 p-3 rounded-full bg-gray-100 dark:bg-gray-800">
                    <Icon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                </div>
            )}
            {title && (
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                    {title}
                </h3>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                {description}
            </p>
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

interface TableEmptyStateProps {
    colSpan: number;
    description: string;
    className?: string;
}

/**
 * テーブル用の空状態コンポーネント
 * TableBodyの中で使用
 */
export function TableEmptyState({
    colSpan,
    description,
    className,
}: TableEmptyStateProps) {
    return (
        <tr>
            <td
                colSpan={colSpan}
                className={cn(
                    "text-center py-8 text-gray-500 dark:text-gray-400",
                    className
                )}
            >
                {description}
            </td>
        </tr>
    );
}

interface InlineEmptyStateProps {
    description: string;
    className?: string;
}

/**
 * インライン用の空状態コンポーネント
 * 小さなスペースで使用
 */
export function InlineEmptyState({
    description,
    className,
}: InlineEmptyStateProps) {
    return (
        <div
            className={cn(
                "text-sm text-gray-500 dark:text-gray-400 text-center py-4",
                className
            )}
        >
            {description}
        </div>
    );
}
