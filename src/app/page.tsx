import { CaseStudiesSection } from "@/components/ui/CaseStudiesSection";
import { CTASection } from "@/components/ui/CTASection";
import { FeaturesSection } from "@/components/ui/FeaturesSection";
import { Footer } from "@/components/ui/Footer";
import { Hero } from "@/components/ui/Hero";
import { LogosSection } from "@/components/ui/LogosSection";
import { Navbar } from "@/components/ui/Navbar";
import { PricingTable } from "@/components/ui/PricingTable";
import { TestimonialsSection } from "@/components/ui/TestimonialsSection";

export default function HomePage() {
  return (
    <div className="bg-slate-950 text-white">
      <Navbar />
      <main>
        <Hero />
        <LogosSection />
        <FeaturesSection />
        <TestimonialsSection />
        <PricingTable />
        <CaseStudiesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
