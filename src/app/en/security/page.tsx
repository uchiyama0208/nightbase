import { securityHighlights } from "@/lib/content";

export const metadata = {
  title: "Security | NightBase",
  description: "How we protect sensitive nightlife data."
};

export default function SecurityPageEn() {
  return (
    <div className="pb-24">
      <section className="container pt-20">
        <div className="glass-card space-y-8 p-10">
          <div>
            <h1 className="section-heading">Security posture</h1>
            <p className="section-subtitle mt-4">
              NightBase runs on Supabase, Vercel, and Stripe with SOC2 and ISO27001 alignment plus dedicated monitoring.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {securityHighlights.map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold text-white">{item.title}</h2>
                <p className="mt-2 text-sm text-white/60">{item.description}</p>
              </div>
            ))}
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">Data protection</h2>
            <p className="mt-3 text-sm text-white/70">
              Role-based access controls, MFA, IP restrictions, and AES-256 encryption safeguard every interaction.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
