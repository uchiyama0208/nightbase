import type { Metadata } from "next";
import "../globals.css";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { mainNavEn } from "@/lib/navigation";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "NightBase | The Operating System for Nightlife Venues",
  description: "NightBase brings CRM, payroll, attendance, and QR ordering together for nightlife operators.",
  openGraph: {
    title: "NightBase Global",
    description: "Digitize your nightlife venue with the all-in-one operations cloud.",
    url: "https://nightbase.jp/en",
    siteName: "NightBase",
    locale: "en_US",
    type: "website"
  }
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-[#1A1A1A]">
        <Navbar
          items={mainNavEn}
          ctaHref="/en/contact"
          ctaLabel="Book a demo"
          homeHref="/en"
          localeSwitcher={[
            { label: "JP", href: "/" },
            { label: "EN", href: "/en" }
          ]}
        />
        <main className="pt-24">{children}</main>
        <Footer locale="en" />
      </body>
    </html>
  );
}
