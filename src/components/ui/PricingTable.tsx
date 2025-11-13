const tiers = [
  {
    name: "Starter",
    price: "¥39,800",
    description: "スモールチーム向けの基本プラン。標準コネクタとダッシュボードを利用できます。",
    features: [
      "5人までのメンバー", 
      "主要 SaaS コネクタ 15 種類", 
      "毎日の自動バックアップ", 
      "メールサポート"
    ],
    highlighted: false,
  },
  {
    name: "Growth",
    price: "¥89,800",
    description: "より高度な自動化を求める成長期のチームに最適なプラン。",
    features: [
      "20人までのメンバー",
      "リアルタイム同期",
      "行レベル権限管理",
      "優先サポート",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "お問い合わせ",
    description: "大規模組織や厳しいセキュリティ要件に対応したプラン。",
    features: [
      "無制限メンバー",
      "専任カスタマーサクセス",
      "専用 VPC オプション",
      "99.99% SLA",
    ],
    highlighted: false,
  },
];

export function PricingTable() {
  return (
    <section id="pricing" className="bg-slate-950 py-24">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-200">
            料金
          </h2>
          <p className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            チームの成長ステージに合わせて選べるプラン
          </p>
          <p className="mt-4 text-base text-slate-300">
            どのプランも 14 日間の無料トライアル付き。契約期間に縛りはありません。
          </p>
        </div>
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col rounded-3xl border border-white/10 bg-white/5 p-8 text-left shadow-lg shadow-black/20 transition ${
                tier.highlighted ? "ring-2 ring-indigo-400" : ""
              }`}
            >
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-white">{tier.name}</h3>
                <p className="mt-3 text-3xl font-bold text-indigo-200">{tier.price}</p>
                <p className="mt-4 text-sm text-slate-300">{tier.description}</p>
                <ul className="mt-6 space-y-3 text-sm text-slate-200">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <svg
                        className="h-5 w-5 text-indigo-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 0 1 0 1.414l-7.25 7.25a1 1 0 0 1-1.414 0l-3.5-3.5a1 1 0 1 1 1.414-1.414L8.5 11.086l6.543-6.543a1 1 0 0 1 1.664.75z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <a
                href="#cta"
                className={`mt-8 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition ${
                  tier.highlighted
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 hover:bg-indigo-400"
                    : "border border-white/20 text-slate-200 hover:border-white/40 hover:text-white"
                }`}
              >
                このプランで始める
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
