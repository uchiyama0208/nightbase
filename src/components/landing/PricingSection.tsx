import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function PricingSection() {
    const plans = [
        {
            name: "Light",
            price: "39,800",
            description: "小規模店舗や、まずは試してみたい方に。",
            features: [
                "スタッフ・キャスト管理 (〜10名)",
                "顧客カルテ機能",
                "基本シフト管理",
                "売上集計レポート",
                "メールサポート",
            ],
            cta: "無料で相談する",
            popular: false,
        },
        {
            name: "Standard",
            price: "79,800",
            description: "必要な機能が全て揃った、一番人気のプラン。",
            features: [
                "スタッフ・キャスト管理 (無制限)",
                "LINE連携機能",
                "給与・バック自動計算",
                "詳細分析ダッシュボード",
                "チャットサポート (平日10-19時)",
                "初期設定サポート",
            ],
            cta: "デモを予約する",
            popular: true,
        },
        {
            name: "Premium",
            price: "120,000~",
            description: "複数店舗展開や、専任サポートが必要な方に。",
            features: [
                "複数店舗一元管理",
                "専任担当者による定着支援",
                "カスタム機能開発",
                "API連携",
                "24時間緊急サポート",
                "オンサイト研修",
            ],
            cta: "お問い合わせ",
            popular: false,
        },
    ];

    return (
        <section id="pricing" className="py-24 bg-slate-50">
            <div className="container">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                        シンプルで透明な料金プラン
                    </h2>
                    <p className="text-slate-600">
                        まずは小さく始めて、お店の成長に合わせて拡張できます。<br />
                        契約期間の縛りはありません。
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            className={`relative bg-white rounded-2xl p-8 border ${plan.popular
                                    ? "border-blue-500 shadow-xl shadow-blue-500/10 scale-105 z-10"
                                    : "border-slate-200 shadow-sm hover:shadow-md"
                                } transition-all duration-300 flex flex-col`}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                    Most Popular
                                </div>
                            )}
                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                                <p className="text-sm text-slate-500 min-h-[40px]">{plan.description}</p>
                            </div>
                            <div className="mb-8">
                                <div className="flex items-baseline">
                                    <span className="text-sm text-slate-500 font-medium">月額</span>
                                    <span className="text-4xl font-bold text-slate-900 mx-1">{plan.price}</span>
                                    <span className="text-sm text-slate-500">円(税別)</span>
                                </div>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                                        <Check className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <Button
                                className={`w-full rounded-full h-12 font-medium ${plan.popular
                                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
                                        : "bg-slate-100 hover:bg-slate-200 text-slate-900"
                                    }`}
                                asChild
                            >
                                <Link href="/contact">{plan.cta}</Link>
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <p className="text-sm text-slate-500">
                        ※ 表示価格は全て税別です。<br />
                        ※ 初期費用は別途お見積もりとなります。キャンペーン適用で無料になる場合もございます。
                    </p>
                </div>
            </div>
        </section>
    );
}
