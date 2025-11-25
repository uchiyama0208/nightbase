import Link from "next/link";

import { AuroraPage } from "@/components/layouts/AuroraPage";
import { siteContent } from "@/content/site";

export default function ContactThanksPage() {
  const { contactThanks } = siteContent;

  return (
    <AuroraPage variant="indigo" containerClassName="mx-auto max-w-2xl text-center">
      <div className="glass-panel space-y-6 p-10">
        <h1 className="text-4xl font-semibold text-[#0f172a] sm:text-5xl">{contactThanks.title}</h1>
        <p className="text-lg text-neutral-600">{contactThanks.description}</p>
        <Link href={contactThanks.actionHref} className="glass-button bg-primary text-white hover:text-white">
          {contactThanks.actionLabel}
        </Link>
      </div>
    </AuroraPage>
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
