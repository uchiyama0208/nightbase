export const metadata = {
  title: "NightBaseについて | NightBase",
  description: "NightBaseの理念・ビジョン・チームについてご紹介します。"
};

export default function AboutPage() {
  return (
    <div className="pb-24">
      <section className="container pt-20">
        <div className="glass-card space-y-8 p-10">
          <div>
            <h1 className="section-heading">理念</h1>
            <p className="section-subtitle mt-4">
              ナイトワークに関わるすべての人が公平に評価され、安心して働ける世界を実現する。そのためにテクノロジーとデザインで業界の課題を解決します。
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">ビジョン</h2>
            <p className="mt-3 text-sm text-white/70">
              NightBaseは「Nightlife Operating Cloud」として、現場の肌感覚とデータの力を融合させます。経営・現場・キャストが同じ指標で会話できる未来をつくります。
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">チーム</h2>
            <p className="mt-3 text-sm text-white/70">
              ナイト業界出身のプロフェッショナルと、SaaS・デザイン・セキュリティのエキスパートで構成。現場インタビューを重ねながらプロダクトを磨いています。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
