import { ContactForm } from "@/components/ContactForm";
import { siteContent } from "@/content/site";

export default function ContactPage() {
  const { contact } = siteContent;

  return (
    <div className="bg-white py-20">
      <div className="container grid gap-10 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{contact.title}</h1>
          <p className="text-lg text-neutral-600">{contact.description}</p>
          <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold text-[#111111]">サポート内容</p>
            <ul className="mt-4 space-y-2 text-sm text-neutral-600">
              <li>• 無料オンラインデモ</li>
              <li>• 導入シミュレーション</li>
              <li>• 価格・機能のご案内</li>
            </ul>
          </div>
        </div>
        <ContactForm content={contact} />
      </div>
    </div>
  );
}
