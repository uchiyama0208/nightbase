import { siteContent } from "@/content/site";

export default function CompanyPage() {
  const { legal } = siteContent;

  return (
    <div className="bg-white py-20">
      <div className="container mx-auto max-w-3xl space-y-6">
        <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{legal.company.title}</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          {legal.company.facts.map((fact) => (
            <div key={fact.label} className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-soft">
              <p className="text-xs text-neutral-500">{fact.label}</p>
              <p className="mt-2 text-lg font-semibold text-[#111111]">{fact.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
