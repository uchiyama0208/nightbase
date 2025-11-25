import type { Metadata } from "next";

import { ServicePageTemplate } from "@/components/services/ServicePageTemplate";

export const metadata: Metadata = {
  title: "ナイトワーク専門ホームページ制作 | NightBase",
  description:
    "ナイトワーク業態に特化したオリジナルサイト制作。NightBaseと連携し、出勤情報やイベントをリアルタイムに反映します。",
};

export default function WebsiteServicePage() {
  return (
    <ServicePageTemplate
      title="ナイトワーク専門ホームページ制作"
      lead="ナイトワーク業態に特化したオリジナルのホームページを制作。NightBaseと連携し、出勤情報・イベント・メニューをリアルタイムに反映します。"
      features={[
        {
          title: "店舗の世界観に合わせたデザイン",
          description:
            "ラウンジ・キャバクラ・コンカフェなど、業態ごとの雰囲気に合わせたデザインをご提案します。",
        },
        {
          title: "NightBaseとリアルタイム連携",
          description:
            "NightBaseで管理している出勤予定やイベント日、メニュー情報をサイトに自動反映。更新作業の手間を減らします。",
        },
        {
          title: "スマホファーストで集客をサポート",
          description:
            "スマホからの閲覧を前提に、見やすさ・問い合わせ導線・SNS連携を最適化します。",
        },
      ]}
      integrationTitle="NightBaseとの連携イメージ"
      integrationDescription="出勤情報・イベント・料金メニューなど、NightBaseで日々更新している情報をサイトにも連動させることで「更新されていないホームページ問題」を解消します。"
    />
  );
}
