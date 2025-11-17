import { CaseStudyCard } from "@/components/CaseStudyCard";
import { siteContent } from "@/content/site";
import { getPublishedCaseStudies } from "@/lib/caseStudies";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function CaseStudiesPage() {
  const { caseStudies } = siteContent;
  const studies = await getPublishedCaseStudies();

  return (
    <div className="bg-white py-20">
      <div className="container mx-auto max-w-3xl space-y-6 text-center">
        <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{caseStudies.title}</h1>
        <p className="text-lg text-neutral-600">{caseStudies.description}</p>
      </div>
      <div className="container mt-16 grid gap-8 lg:grid-cols-2">
        {studies.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-neutral-200 bg-white p-12 text-center text-sm text-neutral-500">
            現在公開中の導入事例はありません。
          </div>
        ) : (
          studies.map((caseStudy) => <CaseStudyCard key={caseStudy.id} caseStudy={caseStudy} />)
        )}
      </div>
    </div>
  );
}
