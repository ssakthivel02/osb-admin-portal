import { trustSignals } from '../data/trustSignals';
import { SectionHeading } from './SectionHeading';

export function TrustSection() {
  return (
    <section className="content-section trust-section" aria-labelledby="trust-title">
      <SectionHeading
        eyebrow="Premium means trustworthy"
        title="Energy and delight must sit on top of strong safeguards"
        description="The strongest experience is not only attractive; it is reviewable, accessible, privacy-conscious, and honest about what is implemented."
      />
      <div className="trust-grid">
        {trustSignals.map((signal) => (
          <article key={signal.id}>
            <span aria-hidden="true">{signal.icon}</span>
            <h3>{signal.title}</h3>
            <p>{signal.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
