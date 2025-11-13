import { notFound } from "next/navigation";

import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

export default async function AboutPage({
  params
}: {
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  if (!locales.includes(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale);
  const about = dictionary.about;

  return (
    <div className="bg-white py-20">
      <div className="container space-y-16">
        <header className="mx-auto max-w-3xl space-y-4 text-center">
          <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{about.title}</h1>
          <p className="text-lg text-neutral-600">{about.mission.description}</p>
        </header>
        <section className="grid gap-8 lg:grid-cols-2">
          <div className="glass-panel space-y-4 p-8">
            <h2 className="text-2xl font-semibold text-[#111111]">{about.mission.title}</h2>
            <p className="text-sm text-neutral-500">{about.mission.description}</p>
          </div>
          <div className="glass-panel space-y-4 p-8">
            <h2 className="text-2xl font-semibold text-[#111111]">{about.vision.title}</h2>
            <p className="text-sm text-neutral-500">{about.vision.description}</p>
          </div>
        </section>
        <section className="space-y-8">
          <h2 className="text-2xl font-semibold text-[#111111]">Team</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {about.team.map((member) => (
              <div key={member.name} className="glass-panel space-y-3 p-6">
                <p className="text-lg font-semibold text-[#111111]">{member.name}</p>
                <p className="text-sm text-primary">{member.role}</p>
                <p className="text-sm text-neutral-500">{member.bio}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-[#111111]">{about.company.title}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {about.company.facts.map((fact) => (
              <div key={fact.label} className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-soft">
                <p className="text-xs text-neutral-500">{fact.label}</p>
                <p className="mt-2 text-lg font-semibold text-[#111111]">{fact.value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
