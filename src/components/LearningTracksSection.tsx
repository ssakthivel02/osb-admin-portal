import { learningTracks } from '../data/learningTracks';
import { SectionHeading } from './SectionHeading';

export function LearningTracksSection() {
  return (
    <section className="content-section" id="tracks" aria-labelledby="tracks-title">
      <SectionHeading
        eyebrow="Learning paths"
        title="Broad enough for a lifetime, structured enough for today"
        description="The content architecture separates subject discovery from mastery evidence and keeps heritage material behind provenance controls."
      />
      <div className="card-grid card-grid--tracks">
        {learningTracks.map((track) => (
          <article className={`track-card accent-${track.accent}`} key={track.id}>
            <div className="track-card__top">
              <span className="card-icon" aria-hidden="true">{track.icon}</span>
              <span className="status-chip">Preview</span>
            </div>
            <h3>{track.title}</h3>
            <p>{track.description}</p>
            <ul className="module-list" aria-label={`${track.title} example modules`}>
              {track.modules.map((module) => <li key={module}>{module}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
