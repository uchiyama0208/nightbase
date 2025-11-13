const logos = ["Atlas Labs", "Orion Bank", "Nebula HR", "Polar Retail", "Quasar Media", "Aurora Tech"];

export function LogosSection() {
  return (
    <section className="bg-slate-950 py-12">
      <div className="mx-auto max-w-5xl px-6 text-center lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200">
          先進企業から信頼されています
        </p>
        <div className="mt-8 grid grid-cols-2 items-center gap-6 text-sm text-slate-400 sm:grid-cols-3 md:grid-cols-6">
          {logos.map((logo) => (
            <span
              key={logo}
              className="rounded-full border border-white/5 bg-white/5 px-3 py-2 font-semibold text-white/60"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
