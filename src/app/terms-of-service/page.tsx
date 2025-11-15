import { siteContent } from "@/content/site";

export default function TermsOfServicePage() {
  const { legal } = siteContent;

  return (
    <div className="bg-white py-20">
      <div className="container mx-auto max-w-3xl space-y-6">
        <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{legal.terms.title}</h1>
        <div className="space-y-4 text-sm text-neutral-600">
          {legal.terms.content.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
