import { describe, expect, it } from 'vitest';
import {
  SIDDHAR_NO_RIGHTS_DECISION_FINGERPRINT,
  SIDDHAR_SUBJECT_FINGERPRINT_ALGORITHM,
  canonicalJson,
  fingerprintCanonicalJson,
  isSiddharSubjectFingerprint,
} from './siddhar-subject-fingerprint.mjs';

describe('Siddhar canonical subject fingerprints', () => {
  it('uses the fixed versioned algorithm identifier', () => {
    expect(SIDDHAR_SUBJECT_FINGERPRINT_ALGORITHM).toBe('SHA256_CANONICAL_JSON_V1');
  });

  it('uses NONE only as the no-rights-decision sentinel', () => {
    expect(SIDDHAR_NO_RIGHTS_DECISION_FINGERPRINT).toBe('NONE');
    expect(isSiddharSubjectFingerprint(SIDDHAR_NO_RIGHTS_DECISION_FINGERPRINT)).toBe(false);
  });

  it('sorts object keys recursively', () => {
    expect(canonicalJson({ z: 1, a: { y: 2, b: 3 } })).toBe(
      '{"a":{"b":3,"y":2},"z":1}',
    );
  });

  it('preserves array order because array order is semantic', () => {
    expect(canonicalJson({ values: ['b', 'a'] })).toBe('{"values":["b","a"]}');
  });

  it('preserves string whitespace rather than normalising reviewed text', () => {
    expect(canonicalJson({ value: ' a ' })).toBe('{"value":" a "}');
  });

  it('preserves JSON primitive types', () => {
    expect(canonicalJson({ a: null, b: false, c: 0, d: '0' })).toBe(
      '{"a":null,"b":false,"c":0,"d":"0"}',
    );
  });

  it('produces the same fingerprint for semantically identical key order', () => {
    const left = {
      packetId: 'SID-SUB-20260701-001',
      source: { title: 'Witness', page: 1 },
    };
    const right = {
      source: { page: 1, title: 'Witness' },
      packetId: 'SID-SUB-20260701-001',
    };

    expect(fingerprintCanonicalJson(left)).toBe(fingerprintCanonicalJson(right));
  });

  it('changes the fingerprint when a nested value changes', () => {
    const left = { source: { title: 'Witness', page: 1 } };
    const right = { source: { title: 'Witness corrected', page: 1 } };

    expect(fingerprintCanonicalJson(left)).not.toBe(fingerprintCanonicalJson(right));
  });

  it('changes the fingerprint when array order changes', () => {
    expect(fingerprintCanonicalJson({ roles: ['EDITORIAL', 'TRANSLATION'] })).not.toBe(
      fingerprintCanonicalJson({ roles: ['TRANSLATION', 'EDITORIAL'] }),
    );
  });

  it('changes the fingerprint when a value type changes', () => {
    expect(fingerprintCanonicalJson({ page: 1 })).not.toBe(
      fingerprintCanonicalJson({ page: '1' }),
    );
  });

  it('changes the fingerprint when a field is added', () => {
    expect(fingerprintCanonicalJson({ a: 1 })).not.toBe(
      fingerprintCanonicalJson({ a: 1, b: null }),
    );
  });

  it('emits lowercase sha256 fingerprints only', () => {
    const fingerprint = fingerprintCanonicalJson({ packetId: 'SID-SUB-20260701-001' });

    expect(fingerprint).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(isSiddharSubjectFingerprint(fingerprint)).toBe(true);
  });

  it('rejects uppercase, short, or unprefixed fingerprints', () => {
    expect(isSiddharSubjectFingerprint('sha256:' + 'A'.repeat(64))).toBe(false);
    expect(isSiddharSubjectFingerprint('sha256:' + 'a'.repeat(63))).toBe(false);
    expect(isSiddharSubjectFingerprint('a'.repeat(64))).toBe(false);
  });

  it('supports Unicode deterministically', () => {
    const value = { title: 'அகத்தியர்', note: 'சித்தர் ஆதாரம்' };

    expect(fingerprintCanonicalJson(value)).toBe(fingerprintCanonicalJson(value));
    expect(canonicalJson(value)).toContain('அகத்தியர்');
  });

  it('rejects NaN because it is not a valid JSON number', () => {
    expect(() => canonicalJson({ value: Number.NaN })).toThrow(/finite JSON numbers/);
  });

  it('rejects Infinity because it is not a valid JSON number', () => {
    expect(() => canonicalJson({ value: Number.POSITIVE_INFINITY })).toThrow(
      /finite JSON numbers/,
    );
  });

  it('rejects undefined instead of silently deleting reviewed fields', () => {
    expect(() => canonicalJson({ value: undefined })).toThrow(/not representable/);
  });

  it('rejects functions instead of silently deleting reviewed fields', () => {
    expect(() => canonicalJson({ value: () => true })).toThrow(/not representable/);
  });

  it('rejects symbols instead of silently deleting reviewed fields', () => {
    expect(() => canonicalJson({ value: Symbol('x') })).toThrow(/not representable/);
  });

  it('rejects bigint because canonical JSON has no bigint type', () => {
    expect(() => canonicalJson({ value: 1n })).toThrow(/not representable/);
  });
});
