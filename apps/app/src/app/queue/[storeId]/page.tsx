import { getStoreForQueue, getWaitingCount } from "./actions";
import { QueueForm } from "./queue-form";

interface QueuePageProps {
    params: Promise<{ storeId: string }>;
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

    // 待ち組数を取得
    const waitingResult = await getWaitingCount(storeId);
    const waitingCount = waitingResult.count || 0;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <QueueForm store={storeResult.store} waitingCount={waitingCount} />
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';
