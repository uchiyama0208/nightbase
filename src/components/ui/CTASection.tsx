import Link from "next/link";

export function CTASection() {
  return (
    <section
      id="cta"
      className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 py-20"
    >
      <div className="absolute inset-x-0 -top-24 -z-10 flex justify-center opacity-50 blur-3xl">
        <div className="h-64 w-[40rem] rounded-full bg-white/20" />
      </div>
      <div className="relative mx-auto max-w-4xl px-6 text-center lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          いますぐ Nightbase を試して、データ活用の未来を体験
        </h2>
        <p className="mt-4 text-base text-indigo-100">
          クレジットカード不要で 14 日間の無料トライアルが利用できます。導入から活用まで専任のサクセスマネージャーが伴走します。
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="w-full rounded-full bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-lg shadow-indigo-900/40 transition hover:bg-slate-100 sm:w-auto"
          >
            アカウントを作成
          </Link>
          <Link
            href="/contact"
            className="w-full rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/60 sm:w-auto"
          >
            導入の相談をする
          </Link>
        </div>
      </div>
    </section>
  );
}
