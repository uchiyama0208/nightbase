import { CaseStudyCard } from "@/components/CaseStudyCard";
import { siteContent } from "@/content/site";

export default function CaseStudiesPage() {
  const { caseStudies } = siteContent;

  return (
    <div className="bg-white py-20">
      <div className="container mx-auto max-w-3xl space-y-6 text-center">
        <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{caseStudies.title}</h1>
        <p className="text-lg text-neutral-600">{caseStudies.description}</p>
      </div>
      <div className="container mt-16 grid gap-8 lg:grid-cols-2">
        {caseStudies.items.map((caseStudy) => (
          <CaseStudyCard key={caseStudy.slug} caseStudy={caseStudy} />
        ))}
      </div>
    </div>
  );
}
