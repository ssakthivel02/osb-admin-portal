import { createHash } from 'node:crypto';

export const SIDDHAR_SUBJECT_FINGERPRINT_ALGORITHM = 'SHA256_CANONICAL_JSON_V1';
export const SIDDHAR_NO_RIGHTS_DECISION_FINGERPRINT = 'NONE';
export const SIDDHAR_SUBJECT_FINGERPRINT_PATTERN = /^sha256:[a-f0-9]{64}$/;

function assertJsonValue(value, path) {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${path} must contain only finite JSON numbers`);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertJsonValue(entry, `${path}[${index}]`));
    return;
  }

  if (typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (entry === undefined || typeof entry === 'function' || typeof entry === 'symbol') {
        throw new TypeError(`${path}.${key} is not representable in canonical JSON`);
      }
      assertJsonValue(entry, `${path}.${key}`);
    }
    return;
  }

  throw new TypeError(`${path} is not representable in canonical JSON`);
}

function canonicalise(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalise(entry));
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalise(value[key])]),
    );
  }

  return value;
}

export function canonicalJson(value) {
  assertJsonValue(value, '$');
  return JSON.stringify(canonicalise(value));
}

export function fingerprintCanonicalJson(value) {
  return `sha256:${createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex')}`;
}

export function isSiddharSubjectFingerprint(value) {
  return (
    typeof value === 'string' &&
    SIDDHAR_SUBJECT_FINGERPRINT_PATTERN.test(value)
  );
}
