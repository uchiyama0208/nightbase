import type { Metadata } from "next";

import { ServicePageTemplate } from "@/components/services/ServicePageTemplate";

export const metadata: Metadata = {
  title: "業務用カラオケ・ダーツ導入サポート | NightBase",
  description:
    "業務用カラオケやダーツ機の導入をNightBaseがサポート。契約や支払い状況をNightBaseで一元管理できます。",
};

export default function KaraokeDartsServicePage() {
  return (
    <ServicePageTemplate
      title="業務用カラオケ・ダーツ導入サポート"
      lead="店舗に設置する業務用カラオケやダーツ機の導入をサポート。NightBaseと連携することで、手続きや支払い状況をまとめて管理できます。"
      features={[
        {
          title: "機種選定から導入まで支援",
          description:
            "店舗の広さや客層に合わせて最適な機種をご提案。導入前の相談から設置までをワンストップでサポートします。",
        },
        {
          title: "契約・支払い状況を一元管理",
          description:
            "各社への支払い状況や契約更新時期などをNightBase上で一覧管理できるようにし、抜け漏れを防ぎます。",
        },
        {
          title: "トラブル時の窓口も一本化",
          description:
            "機器トラブルや契約まわりの相談もNightBaseが一次窓口として対応し、各社とのやり取りをサポートします。",
        },
      ]}
      integrationTitle="NightBaseとの連携イメージ"
      integrationDescription="カラオケ・ダーツを含めた店舗の固定費をNightBaseでまとめて確認し、コスト管理や契約更新の抜け漏れを防ぎます。"
    />
  );
}
