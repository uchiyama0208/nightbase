"use client";

import { useRouter } from "next/navigation";
import { StoreInfo, TableInfo } from "./actions";
import { Check, Users } from "lucide-react";

interface TabletOrderContentProps {
    store: StoreInfo;
    tables: TableInfo[];
}

export function TabletOrderContent({ store, tables }: TabletOrderContentProps) {
    const router = useRouter();

    const handleTableSelect = (table: TableInfo) => {
        // 既存の注文ページにリダイレクト
        router.push(`/order/${store.id}/${table.id}`);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">{store.name}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">テーブルを選択してください</p>
                </div>
            </header>

            {/* Table grid */}
            <div className="p-4">
                {tables.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <Users className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">
                            テーブルが登録されていません
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {tables.map(table => (
                            <button
                                key={table.id}
                                type="button"
                                onClick={() => handleTableSelect(table)}
                                className={`relative p-6 rounded-2xl border-2 transition-all duration-200 ${
                                    table.has_active_session
                                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-600"
                                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                }`}
                            >
                                {table.has_active_session && (
                                    <div className="absolute top-2 right-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                            <Check className="h-4 w-4 text-white" />
                                        </div>
                                    </div>
                                )}
                                <div className="text-center">
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {table.name}
                                    </span>
                                    <p className={`text-xs mt-2 ${
                                        table.has_active_session
                                            ? "text-blue-600 dark:text-blue-400"
                                            : "text-gray-400 dark:text-gray-500"
                                    }`}>
                                        {table.has_active_session ? "利用中" : "空席"}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
