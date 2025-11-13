export const metadata = {
  title: "Company | NightBase"
};

export default function CompanyPageEn() {
  return (
    <div className="pb-24">
      <section className="container pt-20">
        <div className="glass-card space-y-4 p-10 text-sm text-slate-600">
          <h1 className="section-heading">Company</h1>
          <dl className="grid gap-3 md:grid-cols-2">
            <div>
              <dt className="text-slate-400">Name</dt>
              <dd>NightBase Inc.</dd>
            </div>
            <div>
              <dt className="text-slate-400">Headquarters</dt>
              <dd>1-2-3 Shibuya, Tokyo</dd>
            </div>
            <div>
              <dt className="text-slate-400">CEO</dt>
              <dd>Hikaru Yamada</dd>
            </div>
            <div>
              <dt className="text-slate-400">Business</dt>
              <dd>Nightlife SaaS platform development and operations</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
