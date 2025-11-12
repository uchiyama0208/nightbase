import { securityHighlights } from "@/lib/content";

export const metadata = {
  title: "セキュリティ | NightBase",
  description: "NightBaseのセキュリティ体制と技術基盤について。"
};

export default function SecurityPage() {
  return (
    <div className="pb-24">
      <section className="container pt-20">
        <div className="glass-card space-y-8 p-10">
          <div>
            <h1 className="section-heading">セキュリティ体制</h1>
            <p className="section-subtitle mt-4">
              Supabase・Vercel・Stripeを中心とした信頼性の高いクラウド基盤と、SOC2 / ISO27001に準拠した情報セキュリティマネジメントを運用しています。
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {securityHighlights.map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold text-white">{item.title}</h2>
                <p className="mt-2 text-sm text-white/60">{item.description}</p>
              </div>
            ))}
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">データ保護</h2>
            <p className="mt-3 text-sm text-white/70">
              役割ベースのアクセス制御、多要素認証、IP制限により重要データへのアクセスを厳格に管理。通信と保存データの両方でAES-256暗号化を採用しています。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
