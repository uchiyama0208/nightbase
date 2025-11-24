import { MessageSquare, MonitorPlay, Settings, Rocket } from "lucide-react";

export function FlowSection() {
    const steps = [
        {
            icon: <MessageSquare className="w-6 h-6" />,
            title: "お問い合わせ",
            description: "フォームよりお気軽にご連絡ください。担当者より日程調整のご連絡を差し上げます。",
        },
        {
            icon: <MonitorPlay className="w-6 h-6" />,
            title: "ヒアリング・デモ",
            description: "貴店の課題をお伺いし、実際の画面をお見せしながら最適な活用法をご提案します。",
        },
        {
            icon: <Settings className="w-6 h-6" />,
            title: "初期設定サポート",
            description: "スタッフ登録やメニュー設定など、面倒な初期設定を専任チームがサポートします。",
        },
        {
            icon: <Rocket className="w-6 h-6" />,
            title: "運用開始",
            description: "最短3日で導入可能。運用開始後もチャットサポートで安心してご利用いただけます。",
        },
    ];

    return (
        <section className="py-20 bg-slate-50">
            <div className="container">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                        導入までの流れ
                    </h2>
                    <p className="text-slate-600">
                        お問い合わせから運用開始まで、<br className="md:hidden" />
                        専任スタッフがスムーズにサポートします。
                    </p>
                </div>

                <div className="relative max-w-4xl mx-auto">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-slate-200 -z-10"></div>

                    <div className="grid md:grid-cols-4 gap-8">
                        {steps.map((step, index) => (
                            <div key={index} className="relative flex flex-col items-center text-center bg-white md:bg-transparent p-6 md:p-0 rounded-xl shadow-sm md:shadow-none border md:border-none border-slate-100">
                                <div className="w-24 h-24 bg-white rounded-full border-4 border-blue-50 flex items-center justify-center mb-4 shadow-sm relative z-10">
                                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                                        {step.icon}
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm border-2 border-white">
                                        {index + 1}
                                    </div>
                                </div>
                                <h3 className="font-bold text-slate-900 mb-2">{step.title}</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
