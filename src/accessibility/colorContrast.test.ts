import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  evaluateContrastPair,
  evaluateVerifiedContrastPairs,
  verifiedContrastPairs,
} from './colorContrast';

describe('colour contrast inventory', () => {
  it('keeps every verified normal-text pair at or above 4.5 to 1', () => {
    const results = evaluateVerifiedContrastPairs();

    expect(results).toHaveLength(verifiedContrastPairs.length);
    expect(results.every((result) => result.passes)).toBe(true);
    expect(results.every((result) => result.ratio >= 4.5)).toBe(true);
  });

  it('calculates the WCAG reference ratios deterministically', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });

  it('uses the lower large-text threshold only when declared explicitly', () => {
    const result = evaluateContrastPair({
      id: 'synthetic-large-text-example',
      foreground: '#777777',
      background: '#ffffff',
      usage: 'Synthetic threshold fixture only',
      textClass: 'large',
    });

    expect(result.minimum).toBe(3);
    expect(result.passes).toBe(true);
  });

  it('fails closed for malformed colour values', () => {
    expect(() => contrastRatio('#fff', '#000000')).toThrow(
      /six-digit hexadecimal colour/i,
    );
    expect(() => contrastRatio('transparent', '#000000')).toThrow(
      /six-digit hexadecimal colour/i,
    );
  });
});
