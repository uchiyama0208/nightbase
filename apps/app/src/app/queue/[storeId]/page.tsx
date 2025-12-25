import type { Metadata } from "next";
import { getStoreForQueue, getWaitingCount, getCastsForQueue, getQueueCustomFieldsForForm } from "./actions";
import { QueueForm } from "./queue-form";

interface QueuePageProps {
    params: Promise<{ storeId: string }>;
}

export async function generateMetadata({ params }: QueuePageProps): Promise<Metadata> {
    const { storeId } = await params;
    const storeResult = await getStoreForQueue(storeId);
    const storeName = storeResult.success && storeResult.store ? storeResult.store.name : "";

    return {
        title: `順番待ち登録 | ${storeName}`,
    };
}

export default async function QueuePage({ params }: QueuePageProps) {
    const { storeId } = await params;

    // 店舗情報を取得
    const storeResult = await getStoreForQueue(storeId);

    if (!storeResult.success || !storeResult.store) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-4">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                        <h1 className="text-xl font-bold text-red-600 dark:text-red-400">
                            エラー
                        </h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            {storeResult.error}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // 待ち組数、キャスト一覧、カスタム質問を並列取得
    const [waitingResult, castsResult, customFieldsResult] = await Promise.all([
        getWaitingCount(storeId),
        getCastsForQueue(storeId),
        getQueueCustomFieldsForForm(storeId),
    ]);
    const waitingCount = waitingResult.count || 0;
    const casts = castsResult.casts || [];
    const customFields = customFieldsResult.fields || [];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <QueueForm store={storeResult.store} waitingCount={waitingCount} casts={casts} customFields={customFields} />
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';
