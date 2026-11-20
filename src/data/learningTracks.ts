import type { LearningTrack } from '../types/experience';

export const learningTracks = [
  {
    id: 'foundations',
    title: 'Foundations',
    description: 'Reading, numeracy, memory, attention, and learning-to-learn skills.',
    modules: ['Reading confidence', 'Number sense', 'Study habits'],
    icon: '📘',
    accent: 'blue',
  },
  {
    id: 'stem',
    title: 'STEM discovery',
    description: 'Curiosity-led science, mathematics, engineering thinking, and safe experimentation.',
    modules: ['Science questions', 'Math reasoning', 'Design challenges'],
    icon: '🧪',
    accent: 'cyan',
  },
  {
    id: 'communication',
    title: 'Languages and communication',
    description: 'Vocabulary, comprehension, speaking confidence, writing, and multilingual practice.',
    modules: ['English skills', 'Tamil learning', 'Presentation practice'],
    icon: '💬',
    accent: 'violet',
  },
  {
    id: 'creative-tech',
    title: 'Creativity and coding',
    description: 'Storytelling, art, computational thinking, digital making, and responsible AI literacy.',
    modules: ['Creative projects', 'Coding logic', 'AI awareness'],
    icon: '🎨',
    accent: 'rose',
  },
  {
    id: 'heritage',
    title: 'Heritage and wisdom',
    description: 'Carefully sourced culture, philosophy, literature, and devotional knowledge with provenance controls.',
    modules: ['Verified texts', 'Language context', 'Source literacy'],
    icon: '🪷',
    accent: 'gold',
  },
  {
    id: 'wellbeing',
    title: 'Wellbeing and life skills',
    description: 'Mindful focus, communication, practical money awareness, teamwork, and healthy digital habits.',
    modules: ['Focus routines', 'Life decisions', 'Team skills'],
    icon: '🌱',
    accent: 'emerald',
  },
] as const satisfies readonly LearningTrack[];
