import { cn } from "@/lib/utils";

interface SkeletonProps {
    className?: string;
}

/**
 * 基本スケルトンコンポーネント
 * シマーアニメーション
 */
export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                "relative overflow-hidden bg-gray-200 dark:bg-gray-700 rounded",
                className
            )}
        >
            <div className="absolute inset-0 skeleton-shimmer" />
        </div>
    );
}

/**
 * テキスト用スケルトン
 */
export function SkeletonText({ className }: SkeletonProps) {
    return <Skeleton className={cn("h-4 w-full rounded", className)} />;
}

/**
 * 見出し用スケルトン
 */
export function SkeletonHeading({ className }: SkeletonProps) {
    return <Skeleton className={cn("h-6 w-48 rounded-lg", className)} />;
}

/**
 * アバター用スケルトン
 */
export function SkeletonAvatar({ className }: SkeletonProps) {
    return <Skeleton className={cn("h-10 w-10 rounded-full", className)} />;
}

/**
 * ボタン用スケルトン
 */
export function SkeletonButton({ className }: SkeletonProps) {
    return <Skeleton className={cn("h-10 w-24 rounded-lg", className)} />;
}

/**
 * カード用スケルトン
 */
export function SkeletonCard({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                "bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 p-4 space-y-4",
                className
            )}
        >
            <div className="flex items-center gap-3">
                <SkeletonAvatar />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                </div>
            </div>
            <div className="space-y-2">
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-3/4 rounded" />
            </div>
        </div>
    );
}

/**
 * テーブル行用スケルトン
 */
export function SkeletonTableRow({
    columns = 5,
    className,
}: {
    columns?: number;
    className?: string;
}) {
    return (
        <tr className={className}>
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="p-4">
                    <Skeleton className="h-4 w-full rounded" />
                </td>
            ))}
        </tr>
    );
}

/**
 * リストアイテム用スケルトン
 */
export function SkeletonListItem({ className }: SkeletonProps) {
    return (
        <div className={cn("flex items-center gap-3 p-3", className)}>
            <SkeletonAvatar className="h-8 w-8" />
            <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
            </div>
        </div>
    );
}

/**
 * ページ全体用スケルトン
 */
export function SkeletonPage({ className }: SkeletonProps) {
    return (
        <div className={cn("space-y-6 animate-pulse", className)}>
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
                <SkeletonHeading />
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>
            </div>

            {/* タブ */}
            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                <Skeleton className="h-6 w-20 rounded" />
                <Skeleton className="h-6 w-20 rounded" />
                <Skeleton className="h-6 w-20 rounded" />
            </div>

            {/* コンテンツ */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <SkeletonListItem key={i} />
                    ))}
                </div>
            </div>
        </div>
    );
}
