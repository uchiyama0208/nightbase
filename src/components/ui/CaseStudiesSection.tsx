const caseStudies = [
  {
    company: "Lumen Travel",
    quote:
      "Nightbase によってグローバルな予約データを一元管理できるようになり、価格最適化の意思決定スピードが 4 倍になりました。",
    role: "データオペレーション責任者",
  },
  {
    company: "Stella Commerce",
    quote:
      "マーケティングと販売データをリアルタイムで統合できるため、毎週のレポーティング作業時間が 70% 削減されました。",
    role: "アナリティクスマネージャー",
  },
  {
    company: "Nova Mobility",
    quote:
      "セキュアな権限管理と自動アラート機能のおかげで、品質指標の異常を 15 分以内に検知できるようになりました。",
    role: "プロダクトオーナー",
  },
];

export function CaseStudiesSection() {
  return (
    <section id="case-studies" className="bg-slate-950 py-24">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="max-w-2xl text-left">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-200">
            導入事例
          </h2>
          <p className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            リーディングカンパニーが Nightbase を選ぶ理由
          </p>
          <p className="mt-4 text-base text-slate-300">
            さまざまな業界のデータチームが Nightbase を活用して、重要な指標を即座に把握し、ビジネスの成長を加速しています。
          </p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {caseStudies.map((study) => (
            <figure
              key={study.company}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-8 shadow-lg shadow-black/20"
            >
              <blockquote className="text-sm leading-6 text-slate-200">“{study.quote}”</blockquote>
              <figcaption className="mt-6 text-sm font-semibold text-white">
                <span className="block text-indigo-200">{study.company}</span>
                <span className="text-slate-400">{study.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
