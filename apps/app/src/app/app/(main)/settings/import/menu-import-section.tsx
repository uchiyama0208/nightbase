"use client";

import { useState } from "react";
import { MenuCategory, MenuImportResult } from "../../menus/actions";
import { CategoryManageModal } from "../../menus/category-manage-modal";
import { CsvImportCard } from "./csv-import-card";
import { MENU_FIELDS } from "./field-definitions";
import { Plus, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ImportResult } from "./types";

interface MenuImportSectionProps {
    categories: MenuCategory[];
    importAction: (formData: FormData) => Promise<MenuImportResult>;
    onImportComplete?: () => void;
}

export function MenuImportSection({ categories, importAction, onImportComplete }: MenuImportSectionProps) {
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("");

    // Wrapper to ensure ImportResult type compatibility
    const handleImport = async (formData: FormData): Promise<ImportResult> => {
        formData.set("categoryId", selectedCategory);
        return importAction(formData);
    };

    return (
        <>
            <CsvImportCard
                icon={<Utensils className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
                iconBg="bg-orange-100 dark:bg-orange-900/30"
                title="メニューインポート"
                description="CSVからメニューを一括登録"
                fields={MENU_FIELDS}
                importAction={handleImport}
                onImportComplete={onImportComplete}
                additionalFields={
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400">
                            カテゴリ:
                        </label>
                        <select
                            name="categoryId"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            required
                            className="h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">選択してください</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCategoryModalOpen(true)}
                            className="h-9 px-2"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                }
            />

            <CategoryManageModal
                open={isCategoryModalOpen}
                onOpenChange={setIsCategoryModalOpen}
                categories={categories}
            />
        </>
    );
}
