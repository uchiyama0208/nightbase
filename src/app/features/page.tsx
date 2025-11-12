import { FeaturesSection } from "@/components/FeaturesSection";
import { featureList } from "@/lib/content";
import Link from "next/link";

export const metadata = {
  title: "NightBaseの機能 | NightBase",
  description: "キャスト・スタッフ・顧客・勤怠・給与・QRオーダーを一元管理するNightBaseの機能をご紹介。"
};

export default function FeaturesPage() {
  return (
    <div className="space-y-16 pb-24">
      <section className="container pt-16">
        <div className="glass-card p-10 text-center">
          <h1 className="section-heading">NightBaseの主要機能</h1>
          <p className="section-subtitle mt-4">
            各機能がリアルタイムに連動し、現場と本部をシームレスにつなぎます。詳細ページでは業務課題別の導入効果をご紹介。
          </p>
        </div>
      </section>
      <FeaturesSection
        title="データと現場をつなぐプロダクト群"
        subtitle="NightBaseはナイトワークに特化したSaaSとして、最適なUXと業務フローを提供します。"
        features={featureList as unknown as { title: string; description: string; icon: string }[]}
      />
      <section className="container">
        <div className="glass-card p-8">
          <h2 className="section-heading">機能詳細を見る</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              { href: "/features/dashboard", label: "店舗管理ダッシュボード" },
              { href: "/features/attendance", label: "勤怠・給与自動計算" },
              { href: "/features/order", label: "QRオーダー連携" },
              { href: "/features/crm", label: "顧客CRM & ランキング" },
              { href: "/features/payroll", label: "給与ワークフロー" }
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-3xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-white transition hover:border-accent/60 hover:text-accent"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
