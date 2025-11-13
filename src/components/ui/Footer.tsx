import Link from "next/link";

const footerLinks = {
  product: [
    { label: "機能一覧", href: "#features" },
    { label: "料金プラン", href: "#pricing" },
    { label: "導入事例", href: "#case-studies" },
  ],
  resources: [
    { label: "ブログ", href: "/blog" },
    { label: "サポート", href: "/support" },
    { label: "API ドキュメント", href: "/docs" },
  ],
  company: [
    { label: "会社概要", href: "/company" },
    { label: "採用情報", href: "/careers" },
    { label: "お問い合わせ", href: "/contact" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <p className="text-xl font-semibold text-white">Nightbase</p>
            <p className="mt-4 text-sm text-slate-400">
              データが眠る夜を照らす、次世代のデータプラットフォーム。
            </p>
          </div>
          <nav className="grid gap-8 text-sm text-slate-300 md:grid-cols-3 md:gap-12 md:col-span-3">
            <div>
              <p className="font-semibold text-white">プロダクト</p>
              <ul className="mt-4 space-y-3">
                {footerLinks.product.map((link) => (
                  <li key={link.label}>
                    <Link className="transition hover:text-white" href={link.href}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-white">リソース</p>
              <ul className="mt-4 space-y-3">
                {footerLinks.resources.map((link) => (
                  <li key={link.label}>
                    <Link className="transition hover:text-white" href={link.href}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-white">会社情報</p>
              <ul className="mt-4 space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.label}>
                    <Link className="transition hover:text-white" href={link.href}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>
        <div className="mt-12 flex flex-col justify-between gap-4 border-t border-white/10 pt-8 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Nightbase Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/legal/privacy" className="transition hover:text-white">
              プライバシー
            </Link>
            <Link href="/legal/terms" className="transition hover:text-white">
              利用規約
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
