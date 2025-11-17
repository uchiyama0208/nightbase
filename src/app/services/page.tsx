import Link from "next/link";
import { ArrowRight, Globe, Music4, PenTool, TabletSmartphone } from "lucide-react";

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const serviceCards = [
  {
    title: "デバイスレンタル",
    description:
      "NightBase専用にカスタムしたタブレットを、初期設定済みでレンタル提供します。開封してすぐにNightBaseが使えます。",
    href: "/services/device-rental",
    icon: TabletSmartphone,
  },
  {
    title: "ホームページ制作",
    description:
      "ナイトワーク専門のオリジナルサイト制作。NightBaseと連携して、出勤情報・イベント・メニューをリアルタイムに表示できます。",
    href: "/services/website",
    icon: Globe,
  },
  {
    title: "デザイン制作",
    description:
      "ロゴ・メニュー表・店舗看板・POPなど、店舗の世界観に合わせたデザインを制作。納品後もご自身で編集できるデータ形式でお渡しします。",
    href: "/services/design",
    icon: PenTool,
  },
  {
    title: "カラオケ & ダーツ",
    description:
      "業務用カラオケやダーツ機の選定・導入をサポート。NightBaseと連携して、手続きや月々の支払い、契約状況を一元管理できます。",
    href: "/services/karaoke-darts",
    icon: Music4,
  },
];

export default function ServicesPage() {
  return (
    <div className="bg-white py-20">
      <div className="container space-y-16">
        <section className="space-y-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">SERVICE</p>
          <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">NightBase関連サービス</h1>
          <p className="mx-auto max-w-3xl text-lg text-neutral-600">
            NightBaseと一緒に導入できる、4つの関連サービスをご紹介します。店舗運営をまるごとサポートするオプションとしてご利用いただけます。
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-primary/90"
            >
              お問い合わせ
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center rounded-full border border-primary px-6 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
            >
              NightBaseについて詳しく見る
            </Link>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {serviceCards.map((service) => {
            const Icon = service.icon;
            return (
              <Card key={service.title} className="flex h-full flex-col justify-between bg-slate-950/60 text-white">
                <CardHeader className="gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-2xl text-white">{service.title}</CardTitle>
                  <CardDescription className="text-base text-slate-200">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Link
                    href={service.href}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80"
                  >
                    詳しく見る
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </section>

        <section className="glass-panel space-y-4 p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">CONSULTING</p>
          <h2 className="text-3xl font-semibold text-[#111111]">NightBaseと関連サービスをまとめて導入しませんか？</h2>
          <p className="text-sm text-neutral-600">
            どのサービスから始めればいいか分からない場合も、まずはNightBaseチームにご相談ください。店舗の状況に合わせて最適な組み合わせをご提案します。
          </p>
          <div className="flex items-center justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              お問い合わせ
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
