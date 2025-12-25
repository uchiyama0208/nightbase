"use client";

import { useQuery } from "@tanstack/react-query";
import { ShoppingList } from "./shopping-list";
import { getShoppingPageData } from "./actions";
import { useAuthHelpers } from "@/app/app/hooks";

function ShoppingSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <div className="grid gap-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 h-16" />
                ))}
            </div>
        </div>
    );
}

export function ShoppingClient() {
    const { isLoading: isAuthLoading, hasAccess, canEdit } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["shopping", "pageData"],
        queryFn: getShoppingPageData,
        staleTime: 60 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data) {
        window.location.href = data.redirect;
        return <ShoppingSkeleton />;
    }

    if (isAuthLoading || isDataLoading || !data) {
        return <ShoppingSkeleton />;
    }

    if (!hasAccess("shopping")) {
        window.location.href = "/app/me";
        return <ShoppingSkeleton />;
    }

    const pageData = data.data;

    return (
        <ShoppingList
            initialItems={pageData.shoppingList}
            lowStockMenus={pageData.lowStockMenus}
            canEdit={canEdit("shopping")}
        />
    );
}
