"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export function FaqSection() {
    const faqs = [
        {
            question: "ITが苦手なスタッフが多いですが、大丈夫でしょうか？",
            answer: "はい、大丈夫です。Nightbaseは「マニュアルなしでも使える」をコンセプトに設計されており、スマホを使える方なら直感的に操作できます。導入時のレクチャーも行っています。",
        },
        {
            question: "料金には何が含まれますか？",
            answer: "月額料金には、システムの全機能利用料、サーバー保守費用、基本的なメール・チャットサポートが含まれています。初期費用は別途お見積もりとなります。",
        },
        {
            question: "既存の顧客データは移行できますか？",
            answer: "はい、可能です。ExcelやCSV形式のデータがあれば、弊社側でインポート作業を代行することも可能です（プランにより有償となる場合があります）。",
        },
        {
            question: "契約期間の縛りはありますか？",
            answer: "いいえ、最低契約期間の縛りはございません。月単位でのご契約となりますので、安心して始めていただけます。",
        },
        {
            question: "インボイス制度には対応していますか？",
            answer: "はい、対応しています。適格請求書発行事業者の登録番号を登録することで、インボイス対応の領収書や請求書を発行できます。",
        },
    ];

    return (
        <section className="py-20 bg-white">
            <div className="container max-w-3xl">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                        よくあるご質問
                    </h2>
                </div>

                <Accordion type="single" collapsible className="w-full space-y-4">
                    {faqs.map((faq, index) => (
                        <AccordionItem key={index} value={`item-${index}`} className="border border-slate-200 rounded-xl px-6 bg-white data-[state=open]:border-blue-200 data-[state=open]:bg-blue-50/30 transition-colors">
                            <AccordionTrigger className="text-left font-bold text-slate-900 py-6 hover:no-underline hover:text-blue-600">
                                {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-600 leading-relaxed pb-6">
                                {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    );
}
