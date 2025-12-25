import { notFound } from "next/navigation";
import { getStoreInfo, getTables } from "./actions";
import { TabletOrderContent } from "./tablet-order-content";

interface PageProps {
    params: Promise<{
        storeId: string;
    }>;
}

export default async function TabletOrderPage({ params }: PageProps) {
    const { storeId } = await params;

    // 店舗情報を取得
    const store = await getStoreInfo(storeId);
    if (!store) {
        notFound();
    }

    // タブレット注文が無効な場合
    if (!store.tablet_order_enabled) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="text-center space-y-4 max-w-md">
                    <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <span className="text-3xl">🚫</span>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        タブレット注文は利用できません
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        現在、この店舗ではタブレット注文が<br />
                        有効になっていません。
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                        {store.name}
                    </p>
                </div>
            </div>
        );
    }

    // テーブル一覧を取得
    const tables = await getTables(storeId);

    return (
        <TabletOrderContent
            store={store}
            tables={tables}
        />
    );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
