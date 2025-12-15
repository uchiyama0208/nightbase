import { Metadata } from "next";
import { getStoreForReservation, getCastsForReservation } from "./actions";
import { ReservationForm } from "./reservation-form";

interface ReservePageProps {
    params: Promise<{ storeId: string }>;
}

export async function generateMetadata({ params }: ReservePageProps): Promise<Metadata> {
    const { storeId } = await params;
    const storeResult = await getStoreForReservation(storeId);

    const storeName = storeResult.success && storeResult.store ? storeResult.store.name : "";

    return {
        title: storeName ? `来店予約 | ${storeName}` : "来店予約",
    };
}

export default async function ReservePage({ params }: ReservePageProps) {
    const { storeId } = await params;

    // 店舗情報を取得
    const storeResult = await getStoreForReservation(storeId);

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

    // キャスト一覧を取得
    const castsResult = await getCastsForReservation(storeId);
    const casts = castsResult.casts || [];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <ReservationForm store={storeResult.store} casts={casts} />
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';
