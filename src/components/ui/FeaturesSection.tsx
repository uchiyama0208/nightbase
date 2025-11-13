const features = [
  {
    title: "リアルタイム同期",
    description:
      "90以上のデータソースから数分で接続。変更は自動的に Nightbase にストリーミングされ、常に最新のダッシュボードを提供します。",
  },
  {
    title: "エンタープライズ級のセキュリティ",
    description:
      "SOC2 Type II に準拠し、フィールドレベルの暗号化ときめ細かなアクセス制御でチームのデータを守ります。",
  },
  {
    title: "セルフサービス分析",
    description:
      "SQL に加えてノーコードの視覚的なクエリエディタを搭載。分析担当者だけでなく、事業部門のメンバーも安心して利用できます。",
  },
  {
    title: "自動アラート",
    description:
      "異常検知と KPI 監視をワンクリックで設定。Slack や Teams にリアルタイム通知を配信して迅速な意思決定を支援します。",
  },
  {
    title: "柔軟な拡張性",
    description:
      "REST API / GraphQL / Webhook を備え、既存の業務システムやワークフローにスムーズに統合できます。",
  },
  {
    title: "サーバーレスパフォーマンス",
    description:
      "世界 12 リージョンに広がるエッジネットワークにより、どこからでも 200ms 未満の高速レスポンスを実現します。",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-slate-950 py-24">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-200">
            プロダクト
          </h2>
          <p className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            データ活用のために設計された機能群
          </p>
          <p className="mt-4 text-base text-slate-300">
            Nightbase は導入から運用までワンストップで提供し、組織全体のデータドリブンな文化を強力にサポートします。
          </p>
        </div>
        <div className="mt-16 grid gap-10 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-black/20"
            >
              <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
              <p className="mt-4 text-sm leading-6 text-slate-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
