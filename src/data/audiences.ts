import type { AudienceProfile } from '../types/experience';

export const audiences = [
  {
    id: 'learner',
    title: 'Learners',
    ageRange: 'Ages 5–18',
    description: 'Short missions, adaptive practice, encouraging feedback, and visible progress without overwhelming the learner.',
    dailyValue: 'A focused 10-minute mission every day.',
    highlights: ['Age-aware pathways', 'Streaks with healthy limits', 'Choice-led discovery'],
    icon: '🚀',
    accent: 'violet',
  },
  {
    id: 'parent',
    title: 'Parents and carers',
    ageRange: 'Family view',
    description: 'Clear progress signals, suggested support activities, and privacy-conscious visibility into learning momentum.',
    dailyValue: 'A calm weekly insight instead of constant notifications.',
    highlights: ['Progress summaries', 'Support suggestions', 'Consent-first controls'],
    icon: '🏡',
    accent: 'gold',
  },
  {
    id: 'teacher',
    title: 'Teachers',
    ageRange: 'Classroom view',
    description: 'A practical daily class pulse with assignment readiness, misconception signals, and differentiated next steps.',
    dailyValue: 'A reason to sign in daily: today’s class pulse and priority actions.',
    highlights: ['Class pulse', 'Assignment templates', 'Intervention queue'],
    icon: '🎓',
    accent: 'cyan',
  },
  {
    id: 'lifelong',
    title: 'Lifelong learners',
    ageRange: 'Ages 18–100+',
    description: 'Flexible pace, accessible presentation, practical learning goals, and pathways that respect prior knowledge.',
    dailyValue: 'Continue from the exact point you stopped.',
    highlights: ['Flexible pacing', 'Accessible display', 'Practical mastery goals'],
    icon: '🌟',
    accent: 'emerald',
  },
] as const satisfies readonly AudienceProfile[];
