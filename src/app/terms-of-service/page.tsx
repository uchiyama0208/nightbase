export const metadata = {
  title: "利用規約 | NightBase"
};

export default function TermsPage() {
  return (
    <div className="pb-24">
      <section className="container pt-20">
        <div className="glass-card space-y-6 p-10 text-sm text-slate-600">
          <h1 className="section-heading">利用規約</h1>
          <p>本規約は、NightBaseが提供するサービス（以下「本サービス」）の利用条件を定めるものです。</p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>契約成立：当社の承諾をもって契約が成立します。</li>
            <li>禁止事項：法令・公序良俗に反する行為、サービスの運営を妨害する行為。</li>
            <li>免責事項：不可抗力による障害について当社は責任を負いません。</li>
            <li>準拠法：本規約は日本法に準拠し、東京地方裁判所を第一審の専属的合意管轄とします。</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
