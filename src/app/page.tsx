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
import { redirect } from "next/navigation";

interface HomeProps {
  searchParams: {
    code?: string;
    next?: string;
  };
}

export default async function Home({ searchParams }: HomeProps) {
  const { code, next } = await searchParams;

  // Supabase Auth redirect handling
  // If the user is redirected to the root with an auth code (e.g. due to misconfiguration),
  // forward them to the auth callback handler.
  if (code) {
    const nextParam = next ? `&next=${encodeURIComponent(next)}` : "";
    redirect(`/auth/callback?code=${code}${nextParam}`);
  }

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
