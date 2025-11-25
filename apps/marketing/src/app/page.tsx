import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { FeatureSection } from "@/components/landing/FeatureSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { ShowcaseSection } from "@/components/landing/ShowcaseSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { TestimonialSection } from "@/components/landing/TestimonialSection";
import { FlowSection } from "@/components/landing/FlowSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { CtaSection } from "@/components/landing/CtaSection";
// import { redirect } from "next/navigation";
// import { createServerClient } from "@/lib/supabaseServerClient";

interface HomeProps {
  searchParams: {
    code?: string;
    next?: string;
  };
}

export default async function Home({ searchParams }: HomeProps) {
  // Supabase Auth redirect handling and session check removed for Marketing site
  // Marketing site (nightbase.jp) and App site (app.nightbase.jp) are on different domains.
  // Cross-domain session check on server-side is not straightforward.
  // Users should click "Login" to go to the app.

  return (
    <main className="min-h-screen bg-white">
      <HeroSection />
      <ProblemSection />
      <FeatureSection />
      <SolutionSection />
      <ShowcaseSection />
      <PricingSection />
      <TestimonialSection />
      <FlowSection />
      <FaqSection />
      <CtaSection />
    </main>
  );
}
