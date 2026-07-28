import { audiences } from '../data/audiences';
import { SectionHeading } from './SectionHeading';

export function AudienceSection() {
  return (
    <section className="content-section" id="audiences" aria-labelledby="audiences-title">
      <SectionHeading
        eyebrow="One ecosystem, distinct needs"
        title="Useful every day for learners, families, and teachers"
        description="Each role receives a purposeful daily view instead of a generic dashboard filled with noise."
      />
      <div className="card-grid card-grid--audiences">
        {audiences.map((audience) => (
          <article className={`audience-card accent-${audience.accent}`} key={audience.id}>
            <div className="card-icon" aria-hidden="true">{audience.icon}</div>
            <p className="card-kicker">{audience.ageRange}</p>
            <h3>{audience.title}</h3>
            <p>{audience.description}</p>
            <p className="daily-value"><strong>Daily value:</strong> {audience.dailyValue}</p>
            <ul>
              {audience.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
