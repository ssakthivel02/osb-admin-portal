import { describe, expect, it } from 'vitest';
import {
  loadSiddharEvidenceManifest,
  validateSiddharEvidenceManifest,
} from './check-siddhar-evidence-manifest.mjs';

function cloneManifest() {
  return JSON.parse(JSON.stringify(loadSiddharEvidenceManifest()));
}

describe('Siddhar evidence manifest policy', () => {
  it('accepts the canonical 24-control non-production evidence backlog', () => {
    const result = validateSiddharEvidenceManifest(cloneManifest());

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.summary).toEqual({
      itemCount: 24,
      officialEvidenceCount: 3,
      statusCounts: {
        SUPPORTED_ASSOCIATION: 1,
        WORK_CATALOGUE_VERIFIED: 1,
        CONTRADICTED_DO_NOT_PUBLISH: 1,
        UNRESOLVED: 21,
      },
      priorityCounts: {
        P1: 8,
        P0: 13,
        P2: 3,
      },
      productionEligibleCount: 0,
    });
  });

  it('fails closed when the manifest or an item is marked production eligible', () => {
    const manifest = cloneManifest();
    manifest.productionEligible = true;
    manifest.items[0].productionEligible = true;

    const result = validateSiddharEvidenceManifest(manifest);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'productionEligible' }),
        expect.objectContaining({ path: 'items[0].productionEligible' }),
      ]),
    );
  });

  it('rejects missing, duplicate, or non-contiguous evidence identifiers', () => {
    const manifest = cloneManifest();
    manifest.items[1].id = 'SID-EV-001';

    const result = validateSiddharEvidenceManifest(manifest);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'items' }),
        expect.objectContaining({ path: 'items[1].id' }),
      ]),
    );
  });

  it('rejects unsafe evidence hosts and malformed access dates', () => {
    const manifest = cloneManifest();
    manifest.items[0].officialEvidence[0].url = 'https://example.com/source';
    manifest.items[0].officialEvidence[0].accessedOn = '28-07-2026';

    const result = validateSiddharEvidenceManifest(manifest);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'items[0].officialEvidence[0].url' }),
        expect.objectContaining({
          path: 'items[0].officialEvidence[0].accessedOn',
        }),
      ]),
    );
  });

  it('requires official evidence for supported, verified, and contradicted states', () => {
    const manifest = cloneManifest();
    manifest.items[0].officialEvidence = [];

    const result = validateSiddharEvidenceManifest(manifest);

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      path: 'items[0].officialEvidence',
      message: 'supported, verified, or contradicted statuses require official evidence',
    });
  });

  it('preserves the work-level Bogar witness and Karuvoorar publication block', () => {
    const manifest = cloneManifest();
    manifest.items[1].status = 'UNRESOLVED';
    manifest.items[2].status = 'UNRESOLVED';

    const result = validateSiddharEvidenceManifest(manifest);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Bogar 7000 must retain its work-level catalogue-verified status',
        }),
        expect.objectContaining({
          message: 'the contradicted Karuvoorar attribution must remain blocked',
        }),
      ]),
    );
  });

  it('rejects unsupported authenticity and confidence labels', () => {
    const manifest = cloneManifest();
    manifest.items[4].blockingNote = 'PRIMARY-TEXT ATTESTED with High confidence';

    const result = validateSiddharEvidenceManifest(manifest);

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      path: 'items[4]',
      message: 'must not use unsupported authenticity or confidence labels',
    });
  });

  it('prevents silent removal of the verified 24-control baseline', () => {
    const manifest = cloneManifest();
    manifest.items = manifest.items.slice(0, 23);

    const result = validateSiddharEvidenceManifest(manifest);

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      path: 'items',
      message: 'must retain at least 24 evidence controls',
    });
  });
});
