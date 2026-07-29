import { quizFormats } from '../data/quizFormats';
import { SectionHeading } from './SectionHeading';

export function QuizStudioSection() {
  return (
    <section className="content-section quiz-studio" id="quiz-studio" aria-labelledby="quiz-title">
      <SectionHeading
        eyebrow="Assessment without boredom"
        title="A quiz studio built around different ways of thinking"
        description="The preview expands beyond multiple choice while keeping explanations, accessibility, and teacher review visible."
      />
      <div className="quiz-layout">
        <div className="quiz-formats" aria-label="Planned quiz formats">
          {quizFormats.map((format) => (
            <article className="quiz-format" key={format.id}>
              <span aria-hidden="true">{format.icon}</span>
              <div>
                <p className="card-kicker">{format.skill}</p>
                <h3>{format.title}</h3>
                <p>{format.description}</p>
              </div>
            </article>
          ))}
        </div>
        <aside className="sample-question" aria-labelledby="sample-question-title">
          <p className="eyebrow">Sample interaction pattern</p>
          <h3 id="sample-question-title">Which evidence best shows real mastery?</h3>
          <ol>
            <li>Completing one easy question</li>
            <li className="sample-question__answer">Explaining and applying the idea in a new context</li>
            <li>Collecting a badge without review</li>
            <li>Repeating the same answer from memory</li>
          </ol>
          <p className="explanation">
            <strong>Explanation:</strong> mastery requires durable understanding across contexts, not only a single correct response.
          </p>
          <p className="preview-warning">Scoring and answer submission are deliberately not wired in this branch.</p>
        </aside>
      </div>
    </section>
  );
}
