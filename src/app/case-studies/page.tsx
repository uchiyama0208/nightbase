import { CaseStudyCard } from "@/components/CaseStudyCard";
import { caseStudies } from "@/lib/content";

export const metadata = {
  title: "導入事例 | NightBase",
  description: "NightBaseを導入したバー・クラブの成功事例をご紹介します。"
};

export default function CaseStudiesPage() {
  return (
    <div className="space-y-16 pb-24">
      <section className="container pt-20">
        <div className="glass-card p-10 text-center">
          <h1 className="section-heading">導入事例</h1>
          <p className="section-subtitle mt-4">
            NightBaseは業態や規模を問わず、多くのナイトワーク店舗に選ばれています。売上アップや業務効率化の成功事例をご覧ください。
          </p>
        </div>
      </section>
      <section className="container">
        <div className="grid gap-6 md:grid-cols-3">
          {caseStudies.map((study) => (
            <CaseStudyCard
              key={study.slug}
              href={`/case-studies/${study.slug}`}
              title={study.title}
              industry={study.industry}
              summary={study.summary}
              ctaLabel="詳細を見る →"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
