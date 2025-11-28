"use client";

import { useState } from "react";
import { MenuCategory } from "../../menus/actions";
import { CategoryManageModal } from "../../menus/category-manage-modal";
import { Plus } from "lucide-react";

interface MenuImportSectionProps {
    categories: MenuCategory[];
    importAction: (formData: FormData) => Promise<any>;
}

export function MenuImportSection({ categories, importAction }: MenuImportSectionProps) {
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    return (
        <>
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">メニューCSVインポート</h2>
                        <p className="mt-1 text-[11px] md:text-xs text-gray-500 dark:text-gray-400">
                            name, price のヘッダーを持つCSVをアップロードします。下で選択したカテゴリが一括で適用されます。
                        </p>
                    </div>
                </div>
                <form
                    action={importAction}
                    className="flex flex-col gap-2"
                >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <input
                            type="file"
                            name="file"
                            accept=".csv,text/csv"
                            required
                            className="block w-full text-xs md:text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:rounded-md file:border file:border-gray-200 dark:file:border-gray-600 file:bg-gray-50 dark:file:bg-gray-700 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-100 dark:hover:file:bg-gray-600"
                        />
                        <div className="flex gap-2 w-full sm:w-auto">
                            <select
                                name="categoryId"
                                required
                                className="flex-1 sm:flex-initial sm:w-auto rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-xs md:text-sm text-gray-700 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">カテゴリーを選択</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setIsCategoryModalOpen(true)}
                                className="inline-flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-xs md:text-sm text-gray-700 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                カテゴリを追加
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="inline-flex justify-center items-center rounded-full bg-blue-600 px-4 py-2 text-xs md:text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                        >
                            メニューをインポート
                        </button>
                    </div>
                </form>
            </div>

            <CategoryManageModal
                open={isCategoryModalOpen}
                onOpenChange={setIsCategoryModalOpen}
                categories={categories}
            />
        </>
    );
}
