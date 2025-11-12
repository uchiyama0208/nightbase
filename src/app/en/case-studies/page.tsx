import { CaseStudyCard } from "@/components/CaseStudyCard";
import { caseStudiesEn } from "@/lib/content-en";

export const metadata = {
  title: "Case Studies | NightBase",
  description: "See how leading nightlife venues scale with NightBase."
};

export default function CaseStudiesPageEn() {
  return (
    <div className="space-y-16 pb-24">
      <section className="container pt-20">
        <div className="glass-card p-10 text-center">
          <h1 className="section-heading">Case Studies</h1>
          <p className="section-subtitle mt-4">
            Explore how top venues modernize staffing, payroll, and guest experience with NightBase.
          </p>
        </div>
      </section>
      <section className="container">
        <div className="grid gap-6 md:grid-cols-3">
          {caseStudiesEn.map((study) => (
            <CaseStudyCard
              key={study.slug}
              href={`/en/case-studies/${study.slug}`}
              title={study.title}
              industry={study.industry}
              summary={study.summary}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
