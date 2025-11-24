import { Clock, MessageCircle, FileSpreadsheet } from "lucide-react";

export function ProblemSection() {
    const problems = [
        {
            icon: <FileSpreadsheet className="w-8 h-8 text-blue-600" />,
            title: "売上・バック計算が複雑",
            description: "毎日の売上集計やキャストへのバック計算に時間がかかり、ミスも起きやすい。",
        },
        {
            icon: <MessageCircle className="w-8 h-8 text-blue-600" />,
            title: "LINE連絡がバラバラ",
            description: "キャストやスタッフとの連絡が個人のLINEに埋もれてしまい、情報共有ができない。",
        },
        {
            icon: <Clock className="w-8 h-8 text-blue-600" />,
            title: "シフト管理がカオス",
            description: "紙やグループLINEでのシフト提出は管理が大変。急な変更の対応も追いつかない。",
        },
    ];

    return (
        <section className="py-20 bg-slate-50">
            <div className="container">
                <div className="text-center mb-16">
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                        夜のお店で、こんなお悩みありませんか？
                    </h2>
                    <p className="text-slate-600">
                        アナログな管理や複数のツール使い分けによる<br className="md:hidden" />
                        非効率な業務から解放されましょう。
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {problems.map((problem, index) => (
                        <div key={index} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                                {problem.icon}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3 text-center">{problem.title}</h3>
                            <p className="text-slate-600 text-center leading-relaxed">{problem.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
