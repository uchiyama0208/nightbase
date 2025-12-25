import { Metadata } from "next";
import { Monitor, Globe, MessageCircle, MapPin, Smartphone } from "lucide-react";

export const metadata: Metadata = {
    title: "関連サービス",
};

const SERVICES = [
    {
        id: "device-rental",
        name: "デバイスレンタル",
        description: "業務用タブレット・POSシステムのレンタル",
        icon: Monitor,
        color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
        comingSoon: true,
    },
    {
        id: "homepage",
        name: "ホームページ制作",
        description: "店舗の魅力を伝えるWebサイト制作",
        icon: Globe,
        color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
        comingSoon: true,
    },
    {
        id: "line",
        name: "公式LINE制作",
        description: "顧客とのコミュニケーションを強化",
        icon: MessageCircle,
        color: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
        comingSoon: true,
    },
    {
        id: "meo",
        name: "MEO",
        description: "Googleマップでの検索順位向上対策",
        icon: MapPin,
        color: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
        comingSoon: true,
    },
    {
        id: "app",
        name: "公式アプリ制作",
        description: "オリジナルの店舗アプリを開発",
        icon: Smartphone,
        color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
        comingSoon: true,
    },
];

export default function ServicesPage() {
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">関連サービス</h1>

            <p className="text-sm text-gray-600 dark:text-gray-400">
                店舗運営をサポートする各種サービスをご用意しています。
            </p>

            <div className="grid gap-4">
                {SERVICES.map((service) => {
                    const Icon = service.icon;

                    return (
                        <div
                            key={service.id}
                            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4"
                        >
                            <div className={`p-3 rounded-xl ${service.color}`}>
                                <Icon className="h-6 w-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                        {service.name}
                                    </h2>
                                    {service.comingSoon && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                            準備中
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    {service.description}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                    サービスについてのお問い合わせは、設定画面のサポートからご連絡ください。
                </p>
            </div>
        </div>
    );
}
