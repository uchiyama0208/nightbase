"use client";

import { ChevronLeft, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalHeaderProps {
    title: string;
    onClose?: () => void;
    onBack?: () => void;
    showBackButton?: boolean;
    rightElement?: React.ReactNode;
    className?: string;
}

/**
 * モーダル用の統一ヘッダーコンポーネント
 * sticky + 戻るボタン + タイトル（中央） + 右側要素
 */
export function ModalHeader({
    title,
    onClose,
    onBack,
    showBackButton = true,
    rightElement,
    className,
}: ModalHeaderProps) {
    const handleBack = onBack || onClose;

    return (
        <div
            className={cn(
                "sticky top-0 z-10 bg-white dark:bg-gray-900 flex items-center gap-2 h-14 border-b border-gray-200 dark:border-gray-700 px-4",
                className
            )}
        >
            {showBackButton && handleBack ? (
                <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="戻る"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
            ) : (
                <div className="w-8 h-8" />
            )}

            <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                {title}
            </h2>

            {rightElement ? (
                <div className="flex items-center">{rightElement}</div>
            ) : (
                <div className="w-8 h-8" />
            )}
        </div>
    );
}

interface ModalHeaderWithMenuProps extends Omit<ModalHeaderProps, "rightElement"> {
    menuTrigger?: React.ReactNode;
}

/**
 * メニューボタン付きモーダルヘッダー
 */
export function ModalHeaderWithMenu({
    menuTrigger,
    ...props
}: ModalHeaderWithMenuProps) {
    return (
        <ModalHeader
            {...props}
            rightElement={menuTrigger}
        />
    );
}
