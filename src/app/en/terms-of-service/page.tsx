export const metadata = {
  title: "Terms of Service | NightBase"
};

export default function TermsPageEn() {
  return (
    <div className="pb-24">
      <section className="container pt-20">
        <div className="glass-card space-y-6 p-10 text-sm text-white/70">
          <h1 className="section-heading">Terms of Service</h1>
          <p>These terms govern your use of the NightBase services.</p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>Agreement: a contract is formed when NightBase approves your application.</li>
            <li>Prohibited use: unlawful activity or actions that disrupt service operations.</li>
            <li>Liability: NightBase is not liable for outages caused by force majeure.</li>
            <li>Governing law: Japanese law with Tokyo District Court as exclusive jurisdiction.</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
