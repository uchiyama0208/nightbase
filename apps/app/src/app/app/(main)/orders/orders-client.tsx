"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthHelpers } from "@/app/app/hooks";
import { OrdersContent } from "./orders-content";
import { getOrdersPageData } from "./actions";

function OrdersSkeleton() {
    return (
        <div className="space-y-4 animate-pulse p-4">
            <div className="flex items-center justify-between">
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="flex gap-2">
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
            </div>
            <div className="flex gap-2">
                <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <div className="grid gap-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function OrdersClient() {
    const { isLoading: isAuthLoading, canEdit, hasAccess } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["orders", "pageData"],
        queryFn: getOrdersPageData,
        staleTime: 30 * 1000,
    });

    if (isAuthLoading || isDataLoading || !data) {
        return <OrdersSkeleton />;
    }

    if (!hasAccess("orders")) {
        window.location.href = "/app/me";
        return <OrdersSkeleton />;
    }

    return (
        <OrdersContent
            initialOrders={data.orders}
            initialTableCalls={data.tableCalls}
            storeId={data.storeId}
            canEdit={canEdit("orders")}
        />
    );
}
