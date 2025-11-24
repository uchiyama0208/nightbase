import type { Metadata } from "next";

import { ServicePageTemplate } from "@/components/services/ServicePageTemplate";

export const metadata: Metadata = {
  title: "NightBase専用タブレット・デバイスレンタル | NightBase",
  description:
    "NightBaseがすぐに使えるタブレットをセットアップ済みでお届け。初期設定やトラブル対応もまとめてサポートします。",
};

export default function DeviceRentalPage() {
  return (
    <ServicePageTemplate
      title="NightBase専用タブレット・デバイスレンタル"
      lead="NightBaseがすぐに使えるように、店舗業務に最適化したタブレットをセットアップ済みでお届けします。難しい初期設定はすべてお任せください。"
      features={[
        {
          title: "開封してすぐにNightBase",
          description:
            "アカウント設定やアプリのインストールを済ませた状態で納品。電源を入れてWi-Fiにつなぐだけで利用開始できます。",
        },
        {
          title: "夜の店舗に最適な耐久性",
          description:
            "夜間営業の環境を想定したケース・フィルム・スタンドを選定。ホールでもバックヤードでも安心して運用できます。",
        },
        {
          title: "トラブル時も安心サポート",
          description:
            "機器故障やトラブル時も、交換や設定のやり直しをサポート。ITに詳しくない店舗でも安心です。",
        },
      ]}
      integrationTitle="NightBaseとの連携イメージ"
      integrationDescription="NightBaseの管理画面やQRオーダー画面をあらかじめ設定した状態で納品し、デバイスの準備不足で導入が止まる状況を解消します。"
    />
  );
}
