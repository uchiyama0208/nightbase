import { AuroraPage } from "@/components/layouts/AuroraPage";
import { siteContent } from "@/content/site";

export default function SecurityPage() {
  const { security } = siteContent;

  return (
    <AuroraPage variant="indigo" containerClassName="space-y-12">
      <header className="mx-auto max-w-3xl space-y-4 text-center">
        <h1 className="text-4xl font-semibold text-[#0f172a] sm:text-5xl">{security.title}</h1>
        <p className="text-lg text-neutral-600">{security.description}</p>
      </header>
      <section className="grid gap-8 lg:grid-cols-3">
        {security.pillars.map((pillar) => (
          <div key={pillar.title} className="glass-panel space-y-4 p-8">
            <h2 className="text-2xl font-semibold text-[#0f172a]">{pillar.title}</h2>
            <ul className="space-y-2 text-sm text-neutral-600">
              {pillar.items.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      <section className="glass-panel space-y-4 p-8">
        <h2 className="text-2xl font-semibold text-[#0f172a]">{security.compliance.title}</h2>
        <ul className="space-y-2 text-sm text-neutral-600">
          {security.compliance.items.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </section>
    </AuroraPage>
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
