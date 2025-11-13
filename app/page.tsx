import Link from "next/link";

const features = [
  {
    title: "Resilient Data Pipelines",
    description: "Stream and store mission-critical data with zero downtime using Nightbase's self-healing infrastructure."
  },
  {
    title: "Adaptive Security",
    description: "Fine-grained access controls and end-to-end encryption keep your platform compliant and protected."
  },
  {
    title: "Observability Built In",
    description: "Unified analytics help teams understand system health, customer behavior, and product momentum in real-time."
  }
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Build immersive night-life experiences with confidence.</h1>
          <p>
            Nightbase delivers a high-availability platform for entertainment brands to launch, scale,
            and monitor next-generation experiences. Deploy globally and stay online even when the
            crowd surges.
          </p>
        </div>
      </section>

      <section className="section" id="features">
        <div className="container">
          <h2>Platform Highlights</h2>
          <div className="features-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="technology">
        <div className="container">
          <h2>Powered by a modern edge</h2>
          <p>
            Built with the latest Next.js 16 runtime, Nightbase combines React Server Components,
            streaming, and a resilient edge network to deliver interactive experiences that perform
            flawlessly no matter where your fans connect from.
          </p>
        </div>
      </section>

      <section className="section" id="contact">
        <div className="container">
          <div className="callout">
            <h2>Ready to headline the night?</h2>
            <p>
              Let our team show you how Nightbase can accelerate your launch timeline and keep your
              events running smoothly.
            </p>
            <Link href="mailto:hello@nightbase.io">Book a consultation</Link>
          </div>
        </div>
      </section>
    </>
  );
}
