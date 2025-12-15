import { notFound } from "next/navigation";
import { getStoreInfo, getTableInfo, getActiveSession, getMenuCategories, getMenus } from "./actions";
import { OrderPageContent } from "./order-page-content";

interface PageProps {
    params: Promise<{
        storeId: string;
        tableId: string;
    }>;
}

export default async function OrderPage({ params }: PageProps) {
    const { storeId, tableId } = await params;

    // 店舗情報を取得
    const store = await getStoreInfo(storeId);
    if (!store) {
        notFound();
    }

    // 卓情報を取得
    const table = await getTableInfo(tableId, storeId);
    if (!table) {
        notFound();
    }

    // アクティブなセッションを確認
    const session = await getActiveSession(tableId);

    // メニューとカテゴリを取得
    const [categories, menus] = await Promise.all([
        getMenuCategories(storeId),
        getMenus(storeId),
    ]);

    return (
        <OrderPageContent
            store={store}
            table={table}
            session={session}
            categories={categories}
            menus={menus}
        />
    );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
