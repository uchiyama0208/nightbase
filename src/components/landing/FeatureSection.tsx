import { Users, Calendar, Calculator, Heart, MessageSquare } from "lucide-react";

export function FeatureSection() {
    const features = [
        {
            icon: <Users className="w-6 h-6" />,
            title: "顧客カルテ管理",
            description: "お客様の好みや来店履歴、ボトル情報を詳細に記録。接客の質を向上させます。",
        },
        {
            icon: <Calendar className="w-6 h-6" />,
            title: "シフト・出勤管理",
            description: "スマホから簡単にシフト提出。確定シフトの共有もスムーズに行えます。",
        },
        {
            icon: <Calculator className="w-6 h-6" />,
            title: "売上・バック自動計算",
            description: "複雑な給与システムにも対応。日々の売上入力だけで自動計算されます。",
        },
        {
            icon: <Heart className="w-6 h-6" />,
            title: "指名・同伴管理",
            description: "指名や同伴の状況をリアルタイムで把握。キャストのモチベーション管理にも。",
        },
        {
            icon: <MessageSquare className="w-6 h-6" />,
            title: "LINE連携",
            description: "予約確認や出勤リマインドをLINEで自動通知。連絡の手間を大幅に削減。",
        },
    ];

    return (
        <section id="features" className="py-20 bg-white">
            <div className="container">
                <div className="text-center mb-16">
                    <span className="text-blue-600 font-medium text-sm tracking-wider uppercase mb-2 block">Features</span>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                        Nightbaseがまとめて解決します
                    </h2>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        店舗運営に必要な機能をオールインワンで提供。<br />
                        もう、複数のツールを行き来する必要はありません。
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className="group p-6 rounded-2xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all duration-300">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                {feature.icon}
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
                        </div>
                    ))}

                    {/* Last card as a summary or CTA */}
                    <div className="p-6 rounded-2xl bg-slate-900 text-white flex flex-col justify-center items-center text-center">
                        <h3 className="text-lg font-bold mb-2">その他にも機能が充実</h3>
                        <p className="text-slate-300 text-sm mb-4">
                            分析レポート、権限管理、複数店舗管理など...
                        </p>
                        <button className="text-sm font-medium text-blue-300 hover:text-blue-200 underline underline-offset-4">
                            全機能一覧を見る
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
