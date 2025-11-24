import { Star } from "lucide-react";

export function TestimonialSection() {
    const testimonials = [
        {
            store: "Akasaka Lounge Three",
            role: "オーナー",
            comment: "導入して最初の1ヶ月で、集計作業の時間が半分以下になりました。空いた時間でキャストのケアに回れるようになり、お店の雰囲気が良くなったのが一番の成果です。",
            rating: 5,
        },
        {
            store: "Club VELVET",
            role: "店長",
            comment: "以前は紙のシフト表を使っていましたが、Nightbaseにしてから提出率が100%に。急な欠勤が出た時のヘルプ募集もスムーズで助かっています。",
            rating: 5,
        },
        {
            store: "Bar ROOTS",
            role: "マネージャー",
            comment: "ITツールは苦手でしたが、これは本当にスマホ感覚で使えました。サポートの方も親切で、初期設定もスムーズに終わりました。",
            rating: 5,
        },
    ];

    return (
        <section className="py-20 bg-white">
            <div className="container">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                        導入店舗様の声
                    </h2>
                    <p className="text-slate-600">
                        多くのオーナー様・店長様から<br className="md:hidden" />
                        喜びの声をいただいています。
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((item, index) => (
                        <div key={index} className="bg-slate-50 p-8 rounded-2xl border border-slate-100 relative">
                            <div className="flex gap-1 mb-4">
                                {[...Array(item.rating)].map((_, i) => (
                                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                ))}
                            </div>
                            <p className="text-slate-700 leading-relaxed mb-6 text-sm md:text-base">
                                "{item.comment}"
                            </p>
                            <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
                                <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0"></div>
                                <div>
                                    <div className="font-bold text-slate-900 text-sm">{item.store}</div>
                                    <div className="text-xs text-slate-500">{item.role}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
