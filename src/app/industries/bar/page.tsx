import type { Metadata } from "next";

import { IndustryPage } from "@/components/industries/IndustryPage";
import { getIndustryContentBySlug } from "@/content/industries";

const industry = getIndustryContentBySlug("bar");

export const metadata: Metadata = {
  title: `${industry.name} | NightBase`,
  description: industry.heroLead
};

export default function BarIndustryPage() {
  return <IndustryPage industry={industry} />;
}
