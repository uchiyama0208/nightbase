export type NavItem = {
  href: string;
  label: string;
};

export const mainNav: NavItem[] = [
  { href: "/features", label: "機能" },
  { href: "/pricing", label: "料金" },
  { href: "/case-studies", label: "導入事例" },
  { href: "/security", label: "セキュリティ" },
  { href: "/blog", label: "ブログ" },
  { href: "/contact", label: "お問い合わせ" }
];

export const mainNavEn: NavItem[] = [
  { href: "/en/features", label: "Features" },
  { href: "/en/pricing", label: "Pricing" },
  { href: "/en/case-studies", label: "Case Studies" },
  { href: "/en/security", label: "Security" },
  { href: "/en/blog", label: "Blog" },
  { href: "/en/contact", label: "Contact" }
];
