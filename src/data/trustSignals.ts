import type { TrustSignal } from '../types/experience';

export const trustSignals = [
  {
    id: 'age-aware',
    title: 'Age-aware experience',
    description: 'Language, challenge, pacing, and support should change with the learner rather than forcing one interface on everyone.',
    icon: '🧠',
  },
  {
    id: 'teacher-control',
    title: 'Teacher control',
    description: 'AI suggestions remain reviewable. Teachers need clear override, assignment, and intervention controls.',
    icon: '🧑‍🏫',
  },
  {
    id: 'evidence',
    title: 'Evidence over claims',
    description: 'Progress, mastery, and heritage content must carry traceable evidence instead of unsupported confidence labels.',
    icon: '🔎',
  },
  {
    id: 'privacy',
    title: 'Privacy by design',
    description: 'The preview captures no personal data. Future identity and analytics work remains blocked until contracts are verified.',
    icon: '🛡️',
  },
] as const satisfies readonly TrustSignal[];
