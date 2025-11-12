import { PricingTable } from "@/components/PricingTable";
import { pricingPlans } from "@/lib/content";

export const metadata = {
  title: "料金プラン | NightBase",
  description: "NightBaseの料金プラン。Starter / Pro / Enterpriseから選べます。"
};

export default function PricingPage() {
  return (
    <div className="pb-24">
      <section className="container pt-20">
        <div className="glass-card p-10 text-center">
          <h1 className="section-heading">料金プラン</h1>
          <p className="section-subtitle mt-4">
            店舗の規模と成長ステージに合わせて選べる3つのプラン。トライアル期間中は専任チームがオンボーディングを支援します。
          </p>
        </div>
      </section>
      <PricingTable
        title="プランを比較する"
        subtitle="全プランでセキュリティ・バックアップ・サポートが含まれています。"
        plans={pricingPlans as unknown as any[]}
        ctaLabel="トライアルを申し込む"
        ctaHref="/contact"
      />
    </div>
  );
}
