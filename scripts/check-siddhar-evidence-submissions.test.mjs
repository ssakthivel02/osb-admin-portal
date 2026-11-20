import { describe, expect, it } from 'vitest';
import {
  SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT,
  parseSiddharEvidenceSubmissionContract,
  validateSiddharEvidenceSubmissions,
} from './check-siddhar-evidence-submissions.mjs';

const manifest = {
  schemaVersion: 1,
  productionEligible: false,
  items: [
    {
      id: 'SID-EV-001',
      siddhar: 'Thirumoolar',
      itemTitle: 'Opening invocation',
      scope: 'ITEM',
      status: 'SUPPORTED_ASSOCIATION',
      productionEligible: false,
    },
    {
      id: 'SID-EV-002',
      siddhar: 'Bogar',
      itemTitle: 'Bogar 7000 work witness',
      scope: 'WORK',
      status: 'WORK_CATALOGUE_VERIFIED',
      productionEligible: false,
    },
    {
      id: 'SID-EV-003',
      siddhar: 'Karuvoorar',
      itemTitle: 'Contradicted attribution',
      scope: 'ITEM',
      status: 'CONTRADICTED_DO_NOT_PUBLISH',
      productionEligible: false,
    },
  ],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function review(status = 'PENDING', reviewer = 'Reviewer One', reviewedOn = null) {
  return {
    status,
    reviewer,
    reviewedOn,
    notes: status === 'COMPLETE' ? 'Reviewed against the supplied evidence.' : 'Review is pending.',
  };
}

function validPacket(overrides = {}) {
  return {
    schemaVersion: 1,
    packetId: 'SID-SUB-20260728-001',
    manifestItemId: 'SID-EV-001',
    manifestStatusObserved: 'SUPPORTED_ASSOCIATION',
    submissionStatus: 'SUBMITTED_FOR_REVIEW',
    submittedOn: '2026-07-28',
    productionEligible: false,
    source: {
      type: 'OFFICIAL_TEXT_PORTAL',
      repository: 'Tamil Virtual Academy',
      recordId: 'Tirumantiram-opening-verse',
      title: 'Tirumantiram opening verse',
      author: 'Thirumoolar',
      editor: 'Not stated on portal',
      publisher: 'Tamil Virtual Academy',
      edition: 'Official digital text portal',
      publicationYear: 'Not stated on portal',
      language: 'Tamil',
      script: 'Tamil',
      officialUrl: 'https://www.tamilvu.org/example/source',
      accessedOn: '2026-07-28',
    },
    locator: {
      bundleNumber: '',
      workNumber: '',
      accessionNumber: '',
      folioOrPage: 'Opening verse',
      verseOrLine: 'Verse 1',
      adjacentContextIncluded: true,
    },
    files: [
      {
        path: 'docs/content-intake/evidence/uploads/SID-SUB-20260728-001-page-001.pdf',
        sha256: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
      },
    ],
    review: {
      EDITORIAL: review(),
      TRANSCRIPTION: review(),
      TRANSLATION: review(),
      TRANSLITERATION: review(),
    },
    rights: {
      status: 'UNRESOLVED',
      rightsHolder: 'Tamil Virtual Academy',
      basis: 'Official portal access; reuse not yet assessed',
      permissionReference: 'No reuse approval recorded',
      reuseScope: 'NO_REUSE_APPROVED',
    },
    proposedDisposition: 'HOLD_FOR_REVIEW',
    declarations: {
      noAutomaticStatusPromotion: true,
      noProductionUse: true,
      noMedicalUse: true,
      containsNoSecretsOrPersonalData: true,
    },
    notes: 'Evidence packet for human review only.',
    ...overrides,
  };
}

function validate(packets) {
  return validateSiddharEvidenceSubmissions({
    contract: SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT,
    manifest,
    packetFiles: packets.map((value) => ({
      path: `docs/content-intake/evidence/submissions/${value.packetId}.json`,
      value,
    })),
  });
}

describe('Siddhar evidence submission contract', () => {
  it('loads a frozen, deterministic machine-readable contract', () => {
    expect(SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT.schemaVersion).toBe(1);
    expect(Object.isFrozen(SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT)).toBe(true);
    expect(Object.isFrozen(SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT.reviewRoles)).toBe(true);
    expect(SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT.reviewRoles).toEqual([
      'EDITORIAL',
      'TRANSCRIPTION',
      'TRANSLATION',
      'TRANSLITERATION',
    ]);
  });

  it('fails closed for malformed, duplicate, unsorted, or unsafe contracts', () => {
    expect(() => parseSiddharEvidenceSubmissionContract(null)).toThrow(/must be an object/i);
    expect(() =>
      parseSiddharEvidenceSubmissionContract({ schemaVersion: 2 }),
    ).toThrow(/schemaVersion must be 1/i);

    const duplicate = clone(SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT);
    duplicate.reviewRoles = ['EDITORIAL', 'EDITORIAL'];
    expect(() => parseSiddharEvidenceSubmissionContract(duplicate)).toThrow(/unique/i);

    const unsorted = clone(SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT);
    unsorted.packetStatuses = ['SUBMITTED_FOR_REVIEW', 'DRAFT'];
    expect(() => parseSiddharEvidenceSubmissionContract(unsorted)).toThrow(/sorted/i);

    const invalidSize = clone(SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT);
    invalidSize.maxFileSizeBytes = 0;
    expect(() => parseSiddharEvidenceSubmissionContract(invalidSize)).toThrow(/positive integer/i);
  });
});

describe('Siddhar evidence submission validator', () => {
  it('accepts a structurally complete non-production packet without changing manifest status', () => {
    const result = validate([validPacket()]);

    expect(result.ok).toBe(true);
    expect(result.packetCount).toBe(1);
    expect(result.linkedManifestItems).toBe(1);
    expect(result.fileCount).toBe(1);
    expect(result.automaticStatusChanges).toBe(0);
    expect(result.productionEligiblePackets).toBe(0);
    expect(result.issues).toEqual([]);
  });

  it('rejects unknown manifest links and stale status snapshots', () => {
    const unknown = validPacket({ manifestItemId: 'SID-EV-999' });
    const stale = validPacket({
      packetId: 'SID-SUB-20260728-002',
      manifestStatusObserved: 'UNRESOLVED',
      files: [
        {
          ...validPacket().files[0],
          path: 'docs/content-intake/evidence/uploads/SID-SUB-20260728-002-page-001.pdf',
          sha256: '2234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        },
      ],
    });

    const result = validate([unknown, stale]);
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'manifestItemId' }),
        expect.objectContaining({ field: 'manifestStatusObserved' }),
      ]),
    );
  });

  it('rejects production promotion fields, false declarations, and authentication claims', () => {
    const packet = validPacket({
      productionEligible: true,
      newManifestStatus: 'CANONICAL_TEXT_VERIFIED',
      notes: 'This source is authenticated and production-ready.',
      declarations: {
        ...validPacket().declarations,
        noAutomaticStatusPromotion: false,
      },
    });

    const result = validate([packet]);
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'productionEligible' }),
        expect.objectContaining({ field: 'newManifestStatus' }),
        expect.objectContaining({ field: 'noAutomaticStatusPromotion' }),
        expect.objectContaining({ field: '(packet)' }),
      ]),
    );
  });

  it('requires a real HTTPS source and a usable locator', () => {
    const packet = validPacket({
      source: { ...validPacket().source, officialUrl: 'http://localhost/source' },
      locator: {
        bundleNumber: '',
        workNumber: '',
        accessionNumber: '',
        folioOrPage: '',
        verseOrLine: '',
        adjacentContextIncluded: 'yes',
      },
    });

    const result = validate([packet]);
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'officialUrl' }),
        expect.objectContaining({ field: '(locator)' }),
        expect.objectContaining({ field: 'adjacentContextIncluded' }),
      ]),
    );
  });

  it('rejects unsafe paths, placeholder hashes, unsupported MIME types, and invalid sizes', () => {
    const packet = validPacket({
      files: [
        {
          path: '../private/secret.exe',
          sha256: '0'.repeat(64),
          mimeType: 'application/octet-stream',
          sizeBytes: 0,
        },
      ],
    });

    const result = validate([packet]);
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'path' }),
        expect.objectContaining({ field: 'sha256' }),
        expect.objectContaining({ field: 'mimeType' }),
        expect.objectContaining({ field: 'sizeBytes' }),
      ]),
    );
  });

  it('requires assigned reviewers and coherent completed review dates', () => {
    const packet = validPacket({
      review: {
        ...validPacket().review,
        EDITORIAL: review('PENDING', 'UNASSIGNED', null),
        TRANSCRIPTION: review('COMPLETE', 'Reviewer Two', null),
      },
    });

    const result = validate([packet]);
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'reviewer' }),
        expect.objectContaining({ field: 'reviewedOn' }),
      ]),
    );
  });

  it('requires real permission metadata when rights are marked granted', () => {
    const packet = validPacket({
      rights: {
        ...validPacket().rights,
        status: 'PERMISSION_GRANTED',
        rightsHolder: 'UNRESOLVED',
        permissionReference: 'UNRESOLVED',
      },
    });

    const result = validate([packet]);
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'permissionReference' }),
    );
  });

  it('preserves the contradicted Karuvoorar record as correction evidence only', () => {
    const packet = validPacket({
      manifestItemId: 'SID-EV-003',
      manifestStatusObserved: 'CONTRADICTED_DO_NOT_PUBLISH',
      proposedDisposition: 'HOLD_FOR_REVIEW',
    });

    const result = validate([packet]);
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        field: 'proposedDisposition',
        message: 'contradicted items accept correction evidence only',
      }),
    );

    packet.proposedDisposition = 'CORRECTION_EVIDENCE_ONLY';
    expect(validate([packet]).ok).toBe(true);
  });

  it('rejects duplicate packet IDs, evidence paths, and file digests', () => {
    const first = validPacket();
    const second = validPacket({
      packetId: 'SID-SUB-20260728-002',
      files: [clone(validPacket().files[0])],
    });
    const result = validate([first, second]);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'path', message: 'must be unique across all packets' }),
        expect.objectContaining({ field: 'sha256', message: 'must be unique across all packets' }),
      ]),
    );
  });
});
