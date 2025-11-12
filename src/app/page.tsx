import { Hero } from "@/components/Hero";
import { FeaturesSection } from "@/components/FeaturesSection";
import { PricingTable } from "@/components/PricingTable";
import { CaseStudyCard } from "@/components/CaseStudyCard";
import { featureList, caseStudies, pricingPlans, blogPosts, securityHighlights } from "@/lib/content";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-24 pb-24">
      <Hero
        locale="ja"
        headline="ナイトワーク経営を、データで再発明する"
        subheadline="Nightlife Operating Cloud"
        description="NightBaseはキャスト・スタッフ・顧客・勤怠・給与・QRオーダーをすべて一元化。夜のビジネスを次のステージへ引き上げるクラウドOSです。"
        primaryCta={{ label: "デモを見る", href: "/contact" }}
        secondaryCta={{ label: "資料をダウンロード", href: "/contact" }}
      />

      <section className="container">
        <div className="glass-card grid gap-8 p-10 md:grid-cols-2">
          <div>
            <h2 className="section-heading">Before NightBase</h2>
            <ul className="mt-6 space-y-4 text-sm text-white/60">
              <li>・複雑な歩合計算で締め日に徹夜</li>
              <li>・キャストの稼働状況が把握できない</li>
              <li>・VIP顧客の管理がスプレッドシートに散在</li>
            </ul>
          </div>
          <div>
            <h2 className="section-heading text-accent">After NightBase</h2>
            <ul className="mt-6 space-y-4 text-sm text-white/80">
              <li>・勤怠から給与まで自動化、ミスゼロ運用</li>
              <li>・モバイルダッシュボードで現場が見える化</li>
              <li>・CRMとランキングで顧客体験を個別最適化</li>
            </ul>
          </div>
        </div>
      </section>

      <FeaturesSection
        title="NightBaseで叶えるオペレーションの未来"
        subtitle="テクノロジーがナイトワークの常識をアップデート。各機能がシームレスに連携し、店舗の価値を最大化します。"
        features={featureList as unknown as { title: string; description: string; icon: string }[]}
      />

      <section className="container">
        <div className="glass-card overflow-hidden p-8">
          <div className="grid gap-8 md:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="section-heading">UI Preview</h2>
              <p className="section-subtitle mt-4">
                店舗ダッシュボード、キャストアプリ、QRオーダーの体験をAppleライクな洗練UIで提供。リアルタイム同期と操作性で現場に愛されるプロダクトです。
              </p>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">Operations</p>
                  <p className="mt-3 text-lg font-semibold">全店舗売上</p>
                  <p className="text-3xl font-bold text-accent">¥128,400,000</p>
                  <p className="mt-2 text-xs text-emerald-400">+18% MoM</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">Talent</p>
                  <p className="mt-3 text-lg font-semibold">トップキャスト指名数</p>
                  <p className="text-3xl font-bold text-white">214</p>
                  <p className="mt-2 text-xs text-white/60">アプリで成果が可視化</p>
                </div>
              </div>
            </div>
            <div className="relative aspect-[3/4] rounded-[32px] border border-white/10 bg-deep-glow p-6 shadow-glass">
              <div className="absolute inset-x-8 inset-y-10 rounded-[26px] bg-night/80 p-6">
                <p className="text-sm text-white/60">キャスト個別の売上トラッキング、顧客メモ、自動アクションで日次の営業が驚くほどスムーズに。</p>
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-xs text-white/40">Today</p>
                    <p className="text-lg font-semibold text-white">来店予定VIP 6名</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-xs text-white/40">Action</p>
                    <p className="text-lg font-semibold text-accent">リマインド送信完了</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-xs text-white/40">Score</p>
                    <p className="text-lg font-semibold text-white">キャスト平均評価 4.8</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container">
        <div className="glass-card p-8">
          <h2 className="section-heading">For Whom</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "経営者・オーナー",
                description: "店舗横断の意思決定とKPIモニタリングをリアルタイムで。"
              },
              {
                title: "店長・マネージャー",
                description: "勤怠・シフト・給与が連動し、現場マネジメントが自動化。"
              },
              {
                title: "キャスト・スタッフ",
                description: "アプリで成果が見えるから、モチベーションと報酬がリンク。"
              }
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-white/40">{item.title}</p>
                <p className="mt-3 text-sm text-white/70">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="section-heading">Testimonials</h2>
          <p className="section-subtitle mt-4">
            NightBaseを導入した店舗では、VIPリピート率の向上、給与業務の劇的削減、キャスト満足度の向上が報告されています。
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {caseStudies.map((study) => (
            <CaseStudyCard key={study.slug} href={`/case-studies/${study.slug}`} title={study.title} industry={study.industry} summary={study.summary} />
          ))}
        </div>
      </section>

      <PricingTable
        title="料金プラン"
        subtitle="店舗規模やオペレーションに合わせて柔軟に選択。全プランでセキュアなクラウド基盤と専任サポートを提供します。"
        plans={pricingPlans as unknown as any[]}
        ctaLabel="無料トライアルを開始"
        ctaHref="/contact"
      />

      <section className="container">
        <div className="glass-card p-8">
          <h2 className="section-heading">Security</h2>
          <p className="section-subtitle mt-4">
            NightBaseは業界最高水準のセキュリティ基準を満たし、キャスト・顧客データを厳格に保護します。
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {securityHighlights.map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-white/60">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container">
        <div className="glass-card p-10 text-center">
          <h2 className="section-heading">About NightBase</h2>
          <p className="section-subtitle mt-4">
            私たちは「ナイトワークに、テクノロジーでフェアネスを」を掲げ、現場に寄り添うSaaSを追求しています。業界の未来を共に創りましょう。
          </p>
          <Link
            href="/about"
            className="mt-8 inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-accent/60 hover:text-accent"
          >
            ミッションを見る
          </Link>
        </div>
      </section>

      <section className="container">
        <div className="glass-card p-10 text-center">
          <h2 className="section-heading">最先端のナイトワークDXをキャッチアップ</h2>
          <p className="section-subtitle mt-4">
            最新のナイトワークDXニュースや経営Tipsをブログでお届け。実務に活かせる知見を厳選しています。
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {blogPosts.map((post) => (
              <div key={post.slug} className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">{post.date}</p>
                <h3 className="mt-3 text-lg font-semibold text-white">{post.title}</h3>
                <p className="mt-3 text-sm text-white/60">{post.excerpt}</p>
                <Link href={`/blog/${post.slug}`} className="mt-4 inline-flex text-sm font-semibold text-accent">
                  記事を読む →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container">
        <div className="glass-card p-10 text-center">
          <h2 className="section-heading">今すぐNightBaseで現場をアップグレード</h2>
          <p className="section-subtitle mt-4">
            デモ体験・無料トライアル・導入相談など、お気軽にお問い合わせください。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-night shadow-glow-accent transition hover:bg-accent/90"
            >
              導入相談はこちら
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-accent/60 hover:text-accent"
            >
              料金を見る
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
