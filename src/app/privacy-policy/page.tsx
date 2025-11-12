export const metadata = {
  title: "プライバシーポリシー | NightBase"
};

export default function PrivacyPolicyPage() {
  return (
    <div className="pb-24">
      <section className="container pt-20">
        <div className="glass-card space-y-6 p-10 text-sm text-white/70">
          <h1 className="section-heading">プライバシーポリシー</h1>
          <p>NightBase（以下「当社」）は、お客様の個人情報を適切に管理し、以下の方針に基づき取り扱います。</p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>利用目的：お問い合わせ対応、サービス提供、品質向上のため。</li>
            <li>第三者提供：法令で定める場合を除き、同意なく提供しません。</li>
            <li>安全管理：アクセス制御・暗号化・監査ログにより情報を保護します。</li>
            <li>開示請求：所定の手続きにより対応いたします。</li>
          </ol>
          <p>制定日: 2024年5月18日</p>
          <p>NightBase株式会社</p>
        </div>
      </section>
    </div>
  );
}
