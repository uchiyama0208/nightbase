import { ContactForm } from "@/components/ContactForm";
import { AuroraPage } from "@/components/layouts/AuroraPage";
import { siteContent } from "@/content/site";

export default function ContactPage() {
  const { contact } = siteContent;

  return (
    <AuroraPage variant="indigo" containerClassName="grid gap-10 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-6">
        <h1 className="text-4xl font-semibold text-[#0f172a] sm:text-5xl">{contact.title}</h1>
        <p className="text-lg text-neutral-600">{contact.description}</p>
        <div className="glass-panel space-y-3 p-6">
          <p className="text-sm font-semibold text-[#0f172a]">サポート内容</p>
          <ul className="space-y-2 text-sm text-neutral-600">
            <li>• 無料オンラインデモ</li>
            <li>• 導入シミュレーション</li>
            <li>• 価格・機能のご案内</li>
          </ul>
        </div>
      </div>
      <ContactForm content={contact} />
    </AuroraPage>
  );
}
