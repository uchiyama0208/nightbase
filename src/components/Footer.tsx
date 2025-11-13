import Link from "next/link";

const footerLinks = [
  { href: "/privacy-policy", label: "プライバシー" },
  { href: "/terms-of-service", label: "利用規約" },
  { href: "/company", label: "会社概要" }
];

const footerLinksEn = [
  { href: "/en/privacy-policy", label: "Privacy" },
  { href: "/en/terms-of-service", label: "Terms" },
  { href: "/en/company", label: "Company" }
];

interface FooterProps {
  locale?: "ja" | "en";
}

export function Footer({ locale = "ja" }: FooterProps) {
  const links = locale === "en" ? footerLinksEn : footerLinks;

  return (
    <footer className="border-t border-slate-200 bg-white py-10">
      <div className="container flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold text-slate-900">NightBase</p>
          <p className="text-sm text-slate-600">
            {locale === "en"
              ? "All-in-one platform for nightlife venue operations."
              : "ナイトワークの経営を、データとテクノロジーで加速するSaaS。"}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-primary">
              {link.label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} NightBase Inc.</p>
      </div>
    </footer>
  );
}
