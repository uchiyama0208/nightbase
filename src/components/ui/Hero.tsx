import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.35),_transparent_55%)]" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 py-24 text-center lg:px-8">
        <span className="rounded-full border border-indigo-500/60 bg-indigo-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200">
          夜でも安心のデータプラットフォーム
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Nightbase でデータ活用の夜明けを迎えましょう
        </h1>
        <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
          Nightbase は高速かつ安全なモダンデータスタックを数分で構築できるクラウドプラットフォームです。
          データ収集から分析、可視化までを統合し、チームの意思決定を加速させます。
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="#cta"
            className="w-full rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 transition hover:bg-indigo-400 sm:w-auto"
          >
            14日間の無料トライアルを始める
          </Link>
          <Link
            href="/blog"
            className="w-full rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:text-white sm:w-auto"
          >
            最新の導入事例を読む
          </Link>
        </div>
        <dl className="grid w-full gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left">
            <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200">
              導入企業
            </dt>
            <dd className="mt-3 text-3xl font-semibold text-white">350+</dd>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left">
            <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200">
              平均 ROI
            </dt>
            <dd className="mt-3 text-3xl font-semibold text-white">178%</dd>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left">
            <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200">
              データ同期時間
            </dt>
            <dd className="mt-3 text-3xl font-semibold text-white">15 分未満</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
