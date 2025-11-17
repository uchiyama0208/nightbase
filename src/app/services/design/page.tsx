import type { Metadata } from "next";

import { ServicePageTemplate } from "@/components/services/ServicePageTemplate";

export const metadata: Metadata = {
  title: "ロゴ・メニュー・POPのデザイン制作 | NightBase",
  description: "ナイトワークの世界観に合わせたロゴやメニュー・看板制作をNightBaseがワンストップで支援します。",
};

export default function DesignServicePage() {
  return (
    <ServicePageTemplate
      title="ロゴ・メニュー・看板・POPのデザイン制作"
      lead="ナイトワークの世界観に合わせたロゴやメニュー表、店舗看板、POPまで。NightBaseの運営チームが、現場目線で使いやすいデザインをご提案します。"
      features={[
        {
          title: "ナイトワーク特化のデザインテイスト",
          description:
            "高級感のあるラウンジからポップなコンカフェまで、業態とターゲットに合わせたデザインを作成します。",
        },
        {
          title: "納品後も自由に編集できるデータ",
          description:
            "メニューの価格変更やキャストの入れ替えなど、日々の更新を店舗側で行えるように編集可能データで納品します。",
        },
        {
          title: "Webと紙のトーンを統一",
          description:
            "ホームページやSNSのデザインと連動させることで、ブランドイメージを統一できます。",
        },
      ]}
      integrationTitle="NightBaseとの連携イメージ"
      integrationDescription="NightBaseのメニュー管理やイベント設定と連携し、紙のメニュー・POP・Web情報の内容ズレを減らします。"
    />
  );
}
