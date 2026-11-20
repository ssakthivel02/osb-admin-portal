import type { QuizFormat } from '../types/experience';

export const quizFormats = [
  {
    id: 'quick-check',
    title: 'Quick check',
    description: 'A short, low-pressure recall check with immediate explanation.',
    skill: 'Recall',
    icon: '⚡',
  },
  {
    id: 'scenario-choice',
    title: 'Scenario choice',
    description: 'Apply knowledge to a realistic situation rather than selecting a memorised phrase.',
    skill: 'Application',
    icon: '🧭',
  },
  {
    id: 'match-sort',
    title: 'Match and sort',
    description: 'Connect concepts, organise sequences, and expose structural understanding.',
    skill: 'Classification',
    icon: '🧩',
  },
  {
    id: 'visual-spot',
    title: 'Visual spot',
    description: 'Interpret diagrams, patterns, maps, artefacts, or illustrated evidence.',
    skill: 'Observation',
    icon: '👁️',
  },
  {
    id: 'audio-recall',
    title: 'Audio recall',
    description: 'Listen, identify, repeat, and reflect using accessible replay controls.',
    skill: 'Listening',
    icon: '🎧',
  },
  {
    id: 'explain-it',
    title: 'Explain it',
    description: 'Answer in the learner’s own words, supported by a transparent rubric.',
    skill: 'Explanation',
    icon: '🗣️',
  },
  {
    id: 'team-challenge',
    title: 'Team challenge',
    description: 'A cooperative classroom or family activity with shared success criteria.',
    skill: 'Collaboration',
    icon: '🤝',
  },
  {
    id: 'mastery-sprint',
    title: 'Mastery sprint',
    description: 'A mixed review that revisits weak areas without punishing mistakes.',
    skill: 'Retention',
    icon: '🏆',
  },
] as const satisfies readonly QuizFormat[];
