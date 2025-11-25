import type { Metadata } from "next";

import { IndustryPage } from "@/components/industries/IndustryPage";
import { getIndustryContentBySlug } from "@/content/industries";

const industry = getIndustryContentBySlug("lounge");

export const metadata: Metadata = {
  title: `${industry.name} | NightBase`,
  description: industry.heroLead
};

export default function LoungeIndustryPage() {
  return <IndustryPage industry={industry} />;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
