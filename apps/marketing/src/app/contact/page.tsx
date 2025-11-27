import { AuroraPage } from "@/components/layouts/AuroraPage";
import { siteContent } from "@/content/site";

export default function ContactPage() {
  const { contact } = siteContent;

  return (
    <AuroraPage
      variant="indigo"
      containerClassName="max-w-3xl"
    >
      <div className="space-y-6">
        <h1 className="text-4xl font-semibold text-[#0f172a] sm:text-5xl">{contact.title}</h1>
        <p className="text-lg text-neutral-600">{contact.description}</p>
        <p className="text-sm font-medium text-amber-700 bg-amber-50 rounded-xl px-4 py-2 inline-block">
          現在クローズドテスト中のため、一部のユーザー様のみにご案内しています。
        </p>
        <div className="glass-panel space-y-3 p-6">
          <p className="text-sm font-semibold text-[#0f172a]">サポート内容</p>
          <ul className="space-y-2 text-sm text-neutral-600">
            <li>• 無料オンラインデモ</li>
            <li>• 導入シミュレーション</li>
            <li>• 価格・機能のご案内</li>
          </ul>
        </div>
      </div>
    </AuroraPage>
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
