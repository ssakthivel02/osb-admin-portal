import { masteryStages } from '../data/masteryStages';
import { SectionHeading } from './SectionHeading';

export function MasteryJourneySection() {
  return (
    <section className="content-section" id="mastery" aria-labelledby="mastery-title">
      <SectionHeading
        eyebrow="Visible progress"
        title="Move from discovery to contribution"
        description="Mastery is represented as a learning journey, not a points counter. Each stage requires a more meaningful signal."
        align="centre"
      />
      <ol className="mastery-path">
        {masteryStages.map((stage, index) => (
          <li key={stage.id}>
            <span className="mastery-index" aria-hidden="true">{index + 1}</span>
            <h3>{stage.title}</h3>
            <p>{stage.description}</p>
            <strong>{stage.signal}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}
