import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MenuList } from "./menu-list";
import { getMenusData } from "./actions";

export const metadata: Metadata = {
    title: "メニュー管理",
};

function MenusSkeleton() {
    return (
        <div className="container mx-auto py-6 space-y-6 animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
    );
}

export default async function MenusPage() {
    const result = await getMenusData();

    // Handle redirects
    if ('redirect' in result && result.redirect) {
        redirect(result.redirect);
    }

    if (!('data' in result) || !result.data) {
        redirect("/app/me");
    }

    const { menus, categories } = result.data;

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">メニュー管理</h1>
                <p className="mt-2 text-sm text-muted-foreground dark:text-gray-400">
                    お店のメニューの登録・編集・削除ができます。
                </p>
            </div>

            <Suspense fallback={<MenusSkeleton />}>
                <MenuList initialMenus={menus} categories={categories} />
            </Suspense>
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
