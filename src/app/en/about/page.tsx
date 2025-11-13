export const metadata = {
  title: "About NightBase",
  description: "Our mission, vision, and founding team."
};

export default function AboutPageEn() {
  return (
    <div className="pb-24">
      <section className="container pt-20">
        <div className="glass-card space-y-8 p-10">
          <div>
            <h1 className="section-heading">Mission</h1>
            <p className="section-subtitle mt-4">
              We build technology that creates fairness, transparency, and joy for everyone in nightlife.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Vision</h2>
            <p className="mt-3 text-sm text-slate-600">
              NightBase becomes the operating cloud that lets owners, managers, and teams speak the same data language.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Team</h2>
            <p className="mt-3 text-sm text-slate-600">
              Built by nightlife veterans and SaaS operators who obsess over product craft, data, and security.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
