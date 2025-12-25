"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { ChevronRight } from "lucide-react";
import {
    getMenuOptionsForMenu,
    MenuOption,
} from "./actions";
import { MenuOptionLinkModal } from "./menu-option-link-modal";

interface MenuOptionLinkSectionProps {
    menuId: string | null;
    canEdit?: boolean;
}

export function MenuOptionLinkSection({ menuId, canEdit = false }: MenuOptionLinkSectionProps) {
    const [linkedOptions, setLinkedOptions] = useState<MenuOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // データ取得
    const fetchData = async () => {
        if (!menuId) return;

        setIsLoading(true);
        try {
            const linked = await getMenuOptionsForMenu(menuId);
            setLinkedOptions(linked);
        } catch (error) {
            console.error("Failed to fetch options:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (menuId) {
            fetchData();
        }
    }, [menuId]);

    // モーダルが閉じたときにデータを再取得
    const handleModalClose = (open: boolean) => {
        setIsModalOpen(open);
        if (!open) {
            fetchData();
        }
    };

    // 新規メニューの場合
    if (!menuId) {
        return (
            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">オプション</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    メニューを保存後にオプションを設定できます
                </p>
            </div>
        );
    }

    return (
        <>
            <button
                type="button"
                className="w-full pt-3 border-t border-gray-200 dark:border-gray-700"
                onClick={() => setIsModalOpen(true)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex-1 text-left">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer">
                            オプション
                        </Label>
                        {isLoading ? (
                            <p className="text-xs text-gray-500 mt-1">読み込み中...</p>
                        ) : linkedOptions.length === 0 ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                タップしてオプションを追加
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {linkedOptions.map((option) => (
                                    <span
                                        key={option.id}
                                        className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300"
                                    >
                                        {option.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                </div>
            </button>

            <MenuOptionLinkModal
                menuId={menuId}
                open={isModalOpen}
                onOpenChange={handleModalClose}
                canEdit={canEdit}
            />
        </>
    );
}
