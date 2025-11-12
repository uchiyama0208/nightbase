export const metadata = {
  title: "会社概要 | NightBase"
};

export default function CompanyPage() {
  return (
    <div className="pb-24">
      <section className="container pt-20">
        <div className="glass-card space-y-4 p-10 text-sm text-white/70">
          <h1 className="section-heading">会社概要</h1>
          <dl className="grid gap-3 md:grid-cols-2">
            <div>
              <dt className="text-white/40">会社名</dt>
              <dd>NightBase株式会社</dd>
            </div>
            <div>
              <dt className="text-white/40">所在地</dt>
              <dd>東京都渋谷区〇〇 1-2-3</dd>
            </div>
            <div>
              <dt className="text-white/40">代表者</dt>
              <dd>代表取締役 CEO 山田 光</dd>
            </div>
            <div>
              <dt className="text-white/40">事業内容</dt>
              <dd>ナイトワーク業界向けSaaSの開発・提供</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
