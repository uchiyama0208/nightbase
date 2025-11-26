import { AuroraPage } from "@/components/layouts/AuroraPage";
import { siteContent } from "@/content/site";

export default function CompanyPage() {
  const { legal } = siteContent;

  return (
    <AuroraPage variant="indigo" containerClassName="mx-auto max-w-3xl space-y-8">
      <h1 className="text-4xl font-semibold text-[#0f172a] sm:text-5xl">{legal.company.title}</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {legal.company.facts.map((fact) => (
          <div key={fact.label} className="glass-panel space-y-2 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">{fact.label}</p>
            <p className="text-lg font-semibold text-[#0f172a]">{fact.value}</p>
          </div>
        ))}
      </div>
    </AuroraPage>
  );
}
