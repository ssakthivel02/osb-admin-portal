export function HeroSection() {
  return (
    <section className="hero" aria-labelledby="portal-title">
      <div className="hero__content">
        <p className="eyebrow">AI-guided learning ecosystem preview</p>
        <h1 id="portal-title">A premium learning journey for every age.</h1>
        <p className="hero__lead">
          From age 5 to 100+, learners, parents, teachers, and lifelong explorers can see a clearer path from curiosity to confident mastery.
        </p>
        <div className="hero__actions" aria-label="Experience preview actions">
          <a className="button button--primary" href="#tracks">Explore learning paths</a>
          <a className="button button--secondary" href="#quiz-studio">See quiz studio</a>
        </div>
        <p className="hero__note">
          Visual and interaction scaffold only. Sign-in, personalisation, scoring, and data capture are not connected.
        </p>
      </div>
      <figure className="hero__visual">
        <img
          src="assets/ai-learning-community-hero.svg"
          alt="Children, parents, a teacher, and an older learner using an AI-supported learning experience together"
          width="1400"
          height="788"
          fetchPriority="high"
        />
        <figcaption>Designed for energetic, collaborative, intergenerational learning.</figcaption>
      </figure>
    </section>
  );
}
