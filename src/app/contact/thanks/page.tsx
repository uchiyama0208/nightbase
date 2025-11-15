import Link from "next/link";

import { siteContent } from "@/content/site";

export default function ContactThanksPage() {
  const { contactThanks } = siteContent;

  return (
    <div className="bg-white py-20">
      <div className="container mx-auto max-w-2xl space-y-6 text-center">
        <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{contactThanks.title}</h1>
        <p className="text-lg text-neutral-600">{contactThanks.description}</p>
        <Link
          href={contactThanks.actionHref}
          className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-primary/90"
        >
          {contactThanks.actionLabel}
        </Link>
      </div>
    </div>
  );
}
