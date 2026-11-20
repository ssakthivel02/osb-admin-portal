import type { MasteryStage } from '../types/experience';

export const masteryStages = [
  {
    id: 'discover',
    title: 'Discover',
    description: 'Begin with curiosity, prior knowledge, and a clear reason to learn.',
    signal: 'Interest captured',
  },
  {
    id: 'learn',
    title: 'Learn',
    description: 'Use concise explanations, examples, narration, and accessible alternatives.',
    signal: 'Concept understood',
  },
  {
    id: 'practice',
    title: 'Practice',
    description: 'Mix supported attempts, hints, retrieval, and corrective feedback.',
    signal: 'Skill becoming reliable',
  },
  {
    id: 'master',
    title: 'Master',
    description: 'Demonstrate durable understanding across more than one question style.',
    signal: 'Evidence across contexts',
  },
  {
    id: 'inspire',
    title: 'Inspire',
    description: 'Create, teach, apply, or share learning responsibly with others.',
    signal: 'Knowledge transferred',
  },
] as const satisfies readonly MasteryStage[];
