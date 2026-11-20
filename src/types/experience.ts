export type AccentTone = 'violet' | 'cyan' | 'gold' | 'emerald' | 'rose' | 'blue';

export interface AudienceProfile {
  readonly id: string;
  readonly title: string;
  readonly ageRange: string;
  readonly description: string;
  readonly dailyValue: string;
  readonly highlights: readonly string[];
  readonly icon: string;
  readonly accent: AccentTone;
}

export interface LearningTrack {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly modules: readonly string[];
  readonly icon: string;
  readonly accent: AccentTone;
}

export interface QuizFormat {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly skill: string;
  readonly icon: string;
}

export interface MasteryStage {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly signal: string;
}

export interface TrustSignal {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
}
