export type TextContrastClass = 'normal' | 'large';

export interface ContrastPair {
  readonly id: string;
  readonly foreground: `#${string}`;
  readonly background: `#${string}`;
  readonly usage: string;
  readonly textClass: TextContrastClass;
}

export interface ContrastResult extends ContrastPair {
  readonly ratio: number;
  readonly minimum: number;
  readonly passes: boolean;
}

const HEX_COLOUR_PATTERN = /^#[0-9a-f]{6}$/i;

function channelToLinear(channel: number): number {
  const normalised = channel / 255;
  return normalised <= 0.04045
    ? normalised / 12.92
    : ((normalised + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(colour: string): number {
  if (!HEX_COLOUR_PATTERN.test(colour)) {
    throw new Error(`Expected a six-digit hexadecimal colour, received: ${colour}`);
  }

  const red = Number.parseInt(colour.slice(1, 3), 16);
  const green = Number.parseInt(colour.slice(3, 5), 16);
  const blue = Number.parseInt(colour.slice(5, 7), 16);

  return (
    0.2126 * channelToLinear(red) +
    0.7152 * channelToLinear(green) +
    0.0722 * channelToLinear(blue)
  );
}

export function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

export const verifiedContrastPairs = [
  {
    id: 'primary-text-on-page',
    foreground: '#eff6ff',
    background: '#07101f',
    usage: 'Primary body and heading text on the page background',
    textClass: 'normal',
  },
  {
    id: 'muted-text-on-page',
    foreground: '#b9c8dd',
    background: '#07101f',
    usage: 'Secondary explanatory text on the page background',
    textClass: 'normal',
  },
  {
    id: 'cyan-accent-on-page',
    foreground: '#67e8f9',
    background: '#07101f',
    usage: 'Eyebrows, status values, and accent text on the page background',
    textClass: 'normal',
  },
  {
    id: 'gold-accent-on-page',
    foreground: '#f9c74f',
    background: '#07101f',
    usage: 'Warning and emphasis text on the page background',
    textClass: 'normal',
  },
  {
    id: 'dark-text-on-cyan-action',
    foreground: '#06101e',
    background: '#67e8f9',
    usage: 'Primary action text on the cyan end of the action gradient',
    textClass: 'normal',
  },
  {
    id: 'dark-text-on-gold-pill',
    foreground: '#08101f',
    background: '#f9c74f',
    usage: 'Non-production and status-pill text',
    textClass: 'normal',
  },
  {
    id: 'light-text-on-strong-surface',
    foreground: '#dbeafe',
    background: '#111f3a',
    usage: 'Light informational text on the strongest solid surface token',
    textClass: 'normal',
  },
  {
    id: 'muted-text-on-strong-surface',
    foreground: '#b9c8dd',
    background: '#111f3a',
    usage: 'Secondary text on the strongest solid surface token',
    textClass: 'normal',
  },
] as const satisfies readonly ContrastPair[];

export function evaluateContrastPair(pair: ContrastPair): ContrastResult {
  const minimum = pair.textClass === 'large' ? 3 : 4.5;
  const ratio = contrastRatio(pair.foreground, pair.background);

  return {
    ...pair,
    ratio,
    minimum,
    passes: ratio >= minimum,
  };
}

export function evaluateVerifiedContrastPairs(): readonly ContrastResult[] {
  return verifiedContrastPairs.map(evaluateContrastPair);
}
