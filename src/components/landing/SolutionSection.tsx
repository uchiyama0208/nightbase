"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

const solutions = [
    {
        id: "lounge",
        label: "ラウンジ",
        title: "ラウンジ経営の「見えないコスト」を削減",
        description: "会員制ラウンジ特有の細やかな顧客管理と、キャストのモチベーション管理を両立。洗練された空間に馴染むデザインで、カウンターでの操作もスマートに。",
        features: [
            "会員ランク別の詳細な顧客カルテ",
            "ボトルキープのデジタル管理",
            "黒服・キャスト間の連携強化",
        ],
    },
    {
        id: "bar",
        label: "バー",
        title: "バー運営を、もっとクリエイティブに",
        description: "カクテルレシピの共有から在庫管理、常連様の好みの把握まで。少人数運営のバーでも、接客に集中できる環境を作ります。",
        features: [
            "常連様の好みをタグ管理",
            "ドリンク在庫の自動減算",
            "ワンオペでも安心のオーダー管理",
        ],
    },
    {
        id: "cabaret",
        label: "キャバクラ",
        title: "キャバクラの複雑な給与計算を自動化",
        description: "指名・同伴・ドリンクバックなど、複雑な給与システムに完全対応。締め作業の時間を90%削減し、キャストへの明細発行も自動化。",
        features: [
            "複雑なバック・スライド給与計算",
            "付け回し・指名状況のリアルタイム把握",
            "キャスト向けアプリでシフト提出",
        ],
    },
    {
        id: "host",
        label: "ホストクラブ",
        title: "ホストクラブの売上競争を可視化",
        description: "リアルタイムランキングや目標達成度を可視化し、プレイヤーのモチベーションを最大化。売掛管理機能で回収漏れも防ぎます。",
        features: [
            "リアルタイム売上ランキング",
            "売掛金・回収予定の管理",
            "No.1を目指すための目標管理",
        ],
    },
];

export function SolutionSection() {
    const [activeTab, setActiveTab] = useState("lounge");
    const activeSolution = solutions.find((s) => s.id === activeTab) || solutions[0];

    return (
        <section className="py-20 bg-slate-50">
            <div className="container">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                        業態に合わせたソリューション
                    </h2>
                    <p className="text-slate-600">
                        あらゆるナイトワークの現場で、<br className="md:hidden" />
                        Nightbaseが活躍しています。
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 mb-12">
                    {solutions.map((solution) => (
                        <button
                            key={solution.id}
                            onClick={() => setActiveTab(solution.id)}
                            className={cn(
                                "px-6 py-3 rounded-full text-sm font-medium transition-all duration-300",
                                activeTab === solution.id
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 scale-105"
                                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                            )}
                        >
                            {solution.label}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-5xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="order-2 md:order-1">
                            <div className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold mb-4">
                                FOR {activeSolution.label.toUpperCase()}
                            </div>
                            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">
                                {activeSolution.title}
                            </h3>
                            <p className="text-slate-600 leading-relaxed mb-8">
                                {activeSolution.description}
                            </p>
                            <ul className="space-y-4">
                                {activeSolution.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-3 text-slate-700 font-medium">
                                        <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="order-1 md:order-2 bg-slate-100 rounded-2xl aspect-video md:aspect-square relative overflow-hidden group">
                            {/* Placeholder for Industry specific image */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
                                <span className="text-slate-300 font-bold text-4xl opacity-20">{activeSolution.label} Image</span>
                            </div>
                            {/* Decorative circles */}
                            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-200/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
