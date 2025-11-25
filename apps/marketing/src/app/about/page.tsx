import { AuroraPage } from "@/components/layouts/AuroraPage";
import { siteContent } from "@/content/site";

export default function AboutPage() {
  const { about } = siteContent;

  return (
    <AuroraPage variant="indigo" containerClassName="space-y-16">
      <header className="glass-panel mx-auto max-w-3xl space-y-4 p-10 text-center">
        <h1 className="text-4xl font-semibold text-[#0f172a] sm:text-5xl">{about.title}</h1>
        <p className="text-lg text-neutral-600">{about.mission.description}</p>
      </header>
      <section className="grid gap-8 lg:grid-cols-2">
        <div className="glass-panel space-y-4 p-8">
          <h2 className="text-2xl font-semibold text-[#0f172a]">{about.mission.title}</h2>
          <p className="text-sm text-neutral-500">{about.mission.description}</p>
        </div>
        <div className="glass-panel space-y-4 p-8">
          <h2 className="text-2xl font-semibold text-[#0f172a]">{about.vision.title}</h2>
          <p className="text-sm text-neutral-500">{about.vision.description}</p>
        </div>
      </section>
      <section className="space-y-8">
        <h2 className="text-2xl font-semibold text-[#0f172a]">Team</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {about.team.map((member) => (
            <div key={member.name} className="glass-panel space-y-3 p-6">
              <p className="text-lg font-semibold text-[#0f172a]">{member.name}</p>
              <p className="text-sm text-primary">{member.role}</p>
              <p className="text-sm text-neutral-500">{member.bio}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-[#0f172a]">{about.company.title}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {about.company.facts.map((fact) => (
            <div key={fact.label} className="glass-panel space-y-2 p-6 text-left">
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">{fact.label}</p>
              <p className="text-lg font-semibold text-[#0f172a]">{fact.value}</p>
            </div>
          ))}
        </div>
      </section>
    </AuroraPage>
  );
}
