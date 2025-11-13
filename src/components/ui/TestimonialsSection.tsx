const testimonials = [
  {
    name: "佐藤 真由美",
    role: "Beacon Analytics 取締役 CTO",
    quote:
      "Nightbase の導入により、データ統合作業に費やしていた時間が 80% 以上削減され、チームはより価値の高い分析業務に集中できるようになりました。",
  },
  {
    name: "田中 直人",
    role: "Future Supply Chain データサイエンス部 部長",
    quote:
      "わずか数週間で全社の KPI をリアルタイムでモニタリングできる体制が整い、経営会議での意思決定がスピーディーになりました。",
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-slate-950 py-24">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-200">
            お客様の声
          </h2>
          <p className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            データチームが信頼するパートナー
          </p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {testimonials.map((testimonial) => (
            <figure
              key={testimonial.name}
              className="flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-8 text-left shadow-lg shadow-black/20"
            >
              <blockquote className="text-sm leading-6 text-slate-200">“{testimonial.quote}”</blockquote>
              <figcaption className="mt-6 text-sm font-semibold text-white">
                <span className="block">{testimonial.name}</span>
                <span className="text-slate-400">{testimonial.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
