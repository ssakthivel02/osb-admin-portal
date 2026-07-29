export function ProductConceptSection() {
  return (
    <section className="concept-section" aria-labelledby="concept-title">
      <div className="concept-section__copy">
        <p className="eyebrow">Additional visual direction</p>
        <h2 id="concept-title">A future Siddhar learning experience, clearly marked as a concept</h2>
        <p>
          This supporting visual explores how a heritage-learning library, teacher hub, quizzes, achievements, and community areas could work together.
        </p>
        <p className="concept-section__guardrail">
          It does not authenticate devotional content, prove that these functions exist, or authorise production publication.
        </p>
      </div>
      <figure>
        <img
          src="assets/siddhar-learning-concept.svg"
          alt="Concept collage for a Siddhar learning portal with dashboards, quizzes, teacher tools, library, and achievements"
          width="1400"
          height="933"
          loading="lazy"
        />
        <figcaption>Concept image for product planning and stakeholder review.</figcaption>
      </figure>
    </section>
  );
}
