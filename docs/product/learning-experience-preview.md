# Premium Learning Experience Preview

## Purpose

This preview demonstrates a credible visual and content architecture for an intergenerational learning ecosystem serving learners from age 5 through 100+, parents and carers, teachers, and lifelong learners.

It is intentionally implemented inside the remediation branch as a non-production experience scaffold. It is not an authentication system, learner platform, classroom product, AI tutor, content-management system, or production deployment.

## Experience principles

1. **Different roles receive different daily value.**
   - Learners receive short missions and visible progress.
   - Parents receive calm, periodic insight.
   - Teachers receive a daily class pulse and priority-action view.
   - Lifelong learners receive flexible pacing and continuity.

2. **Mastery is more than points.**
   - The journey uses Discover, Learn, Practice, Master, and Inspire.
   - Progress claims should require evidence across contexts.

3. **Assessment should vary by thinking skill.**
   - The preview includes eight patterns: quick check, scenario choice, match and sort, visual spot, audio recall, explain it, team challenge, and mastery sprint.

4. **AI remains assistive and reviewable.**
   - No AI service is connected in this change.
   - Future teacher-facing suggestions require review and override controls.
   - Personalisation requires verified identity, consent, privacy, and data contracts.

5. **Heritage content requires provenance.**
   - The Siddhar concept image is a product-direction visual only.
   - It does not authenticate devotional records or remove the repository's provenance requirements.

## Visual assets

- `public/assets/ai-learning-community-hero.svg`
  - Optimised embedded WebP visual generated for the project.
  - Represents children, parents, a teacher, and an older learner collaborating around AI-supported learning.
- `public/assets/siddhar-learning-concept.svg`
  - Optimised embedded WebP concept collage.
  - Represents a possible heritage-learning product direction.
  - Must remain labelled as a concept until functionality and content evidence exist.

## Accessibility and responsive behaviour

- Semantic landmarks, labelled sections, heading hierarchy, lists, and descriptive alternative text are used.
- Navigation uses in-page anchors rather than non-functional controls.
- Layouts collapse for tablet and mobile widths.
- Decorative motion is avoided, and smooth scrolling is disabled when reduced motion is requested.
- Colour contrast should still receive formal automated and manual verification before production use.

## Explicitly not implemented

- student, parent, teacher, or administrator authentication;
- enrolment, role claims, class rosters, assignments, scoring, streak persistence, certificates, or leaderboards;
- AI tutor inference, moderation, prompt safety, or model observability;
- API calls, databases, analytics, tracking, notifications, or personal data;
- production publishing or deployment changes.

## Recommended delivery sequence

1. Validate this visual scaffold in CI and obtain stakeholder review.
2. Add automated accessibility testing.
3. Define verified role and identity contracts.
4. Implement one vertical slice: teacher class pulse backed by synthetic data.
5. Add quiz-domain types, deterministic scoring, and test fixtures.
6. Add persistence only after privacy, retention, and consent controls are approved.
7. Add AI assistance only after safety, evaluation, cost, and human-override requirements are defined.
