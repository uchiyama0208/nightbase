import { AuroraPage } from "@/components/layouts/AuroraPage";
import { siteContent } from "@/content/site";

export default function PrivacyPolicyPage() {
  const { legal } = siteContent;

  return (
    <AuroraPage variant="indigo" containerClassName="mx-auto max-w-3xl space-y-6">
      <h1 className="text-4xl font-semibold text-[#0f172a] sm:text-5xl">{legal.privacy.title}</h1>
      <div className="glass-panel space-y-4 p-8 text-sm text-neutral-600">
        {legal.privacy.content.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </AuroraPage>
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
