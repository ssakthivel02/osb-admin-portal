import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  parseSiddharEditorialDispositionGovernance,
  validateSiddharEditorialDisposition,
} from './check-siddhar-editorial-disposition.mjs';
import {
  SIDDHAR_NO_RIGHTS_DECISION_FINGERPRINT,
  SIDDHAR_SUBJECT_FINGERPRINT_ALGORITHM,
  fingerprintCanonicalJson,
} from './siddhar-subject-fingerprint.mjs';

const roots = [];
const sourcePdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');
const contract = {
  schemaVersion: 1,
  packetStatuses: ['DRAFT', 'REJECTED', 'SUBMITTED_FOR_REVIEW'],
  sourceTypes: [
    'CRITICAL_EDITION',
    'OFFICIAL_MANUSCRIPT_CATALOGUE',
    'OFFICIAL_REPOSITORY_LETTER',
    'OFFICIAL_TEMPLE_PUBLICATION',
    'OFFICIAL_TEXT_PORTAL',
    'PRIMARY_SOURCE_IMAGE',
    'PRINT_EDITION',
  ],
  reviewRoles: ['EDITORIAL', 'TRANSCRIPTION', 'TRANSLATION', 'TRANSLITERATION'],
  reviewStatuses: ['COMPLETE', 'NOT_APPLICABLE', 'PENDING'],
  rightsStatuses: [
    'PERMISSION_GRANTED',
    'PUBLIC_DOMAIN_CLAIM_UNVERIFIED',
    'RESTRICTED',
    'UNRESOLVED',
  ],
  proposedDispositions: [
    'CORRECTION_EVIDENCE_ONLY',
    'HOLD_FOR_REVIEW',
    'REJECT_EVIDENCE',
    'SOURCE_REVIEW_ONLY',
  ],
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'],
  allowedFileExtensions: ['.jpeg', '.jpg', '.pdf', '.png', '.tif', '.tiff'],
  maxFileSizeBytes: 104857600,
};
const editorialReviewerId = 'SID-REV-EDITOR1';
const preparationReviewerId = 'SID-REV-PREP01';
const reviewerGovernance = {
  schemaVersion: 1,
  reviewerIdPattern: '^SID-REV-[A-Z0-9]{6,24}$',
  attestationPattern: '^SID-REV-ATTEST-[0-9]{8}-[0-9]{3}$',
  unassignedValue: 'UNASSIGNED',
  reviewRoles: ['EDITORIAL', 'TRANSCRIPTION', 'TRANSLATION', 'TRANSLITERATION'],
  approvalRoles: ['EDITORIAL'],
  preparationRoles: ['TRANSCRIPTION', 'TRANSLATION', 'TRANSLITERATION'],
  forbiddenIdentityTerms: [
    'AI REVIEWER',
    'AUTOMATED REVIEWER',
    'CHATGPT',
    'DUMMY',
    'EXAMPLE',
    'GEMINI',
    'PLACEHOLDER',
    'REVIEW BOT',
    'SYNTHETIC',
    'TBD',
    'TEST REVIEWER',
    'TODO',
  ],
  reviewers: [
    {
      reviewerId: editorialReviewerId,
      publicLabel: 'Editorial reviewer A',
      affiliation: 'Independent editorial panel',
      approvedRoles: ['EDITORIAL'],
      active: true,
      conflictOfInterestDeclared: true,
      attestationReference: 'SID-REV-ATTEST-20260630-001',
      registeredOn: '2026-06-30',
    },
    {
      reviewerId: preparationReviewerId,
      publicLabel: 'Language reviewer A',
      affiliation: 'Independent language panel',
      approvedRoles: ['TRANSCRIPTION', 'TRANSLATION', 'TRANSLITERATION'],
      active: true,
      conflictOfInterestDeclared: true,
      attestationReference: 'SID-REV-ATTEST-20260630-002',
      registeredOn: '2026-06-30',
    },
  ],
};
const rightsGovernance = {
  schemaVersion: 1,
  decisionIdPattern: '^SID-RGT-DEC-[0-9]{8}-[0-9]{3}$',
  permissionRecordIdPattern: '^SID-RGT-PERM-[0-9]{8}-[0-9]{3}$',
  decisionPathPrefix: 'docs/content-intake/evidence/rights/decisions/',
  permissionEvidencePathPrefix: 'docs/content-intake/evidence/uploads/rights/',
  authoritativeStatuses: ['PERMISSION_GRANTED', 'RESTRICTED'],
  nonAuthoritativeStatuses: ['PUBLIC_DOMAIN_CLAIM_UNVERIFIED', 'UNRESOLVED'],
  allowedReuseScopes: {
    PERMISSION_GRANTED: [
      'DISPLAY_AND_DISTRIBUTION',
      'DISPLAY_ONLY',
      'INTERNAL_REVIEW_ONLY',
      'NO_REUSE_APPROVED',
    ],
    PUBLIC_DOMAIN_CLAIM_UNVERIFIED: ['NO_REUSE_APPROVED'],
    RESTRICTED: ['INTERNAL_REVIEW_ONLY', 'NO_REUSE_APPROVED'],
    UNRESOLVED: ['NO_REUSE_APPROVED'],
  },
  authorisedReviewerIds: [editorialReviewerId],
  forbiddenBroadAssertions: [
    'ALL ANCIENT TEXTS ARE PUBLIC DOMAIN',
    'COPYRIGHT FREE',
    'FREE TO USE',
    'NO COPYRIGHT',
    'PUBLIC DOMAIN WORLDWIDE',
    'ROYALTY FREE',
  ],
};
const editorialGovernance = {
  schemaVersion: 1,
  decisionIdPattern: '^SID-ED-DEC-[0-9]{8}-[0-9]{3}
    'CORRECTION_EVIDENCE_ONLY',
    'HOLD_FOR_REVIEW',
    'REJECT_EVIDENCE',
    'SOURCE_REVIEW_ONLY',
  ],
  releaseCandidateDispositions: ['SOURCE_REVIEW_ONLY'],
  contradictedManifestStatus: 'CONTRADICTED_DO_NOT_PUBLISH',
  contradictedAllowedDispositions: [
    'CORRECTION_EVIDENCE_ONLY',
    'HOLD_FOR_REVIEW',
    'REJECT_EVIDENCE',
  ],
  requiredReviewRolesByDisposition: {
    CORRECTION_EVIDENCE_ONLY: ['EDITORIAL'],
    HOLD_FOR_REVIEW: ['EDITORIAL'],
    REJECT_EVIDENCE: ['EDITORIAL'],
    SOURCE_REVIEW_ONLY: ['EDITORIAL', 'TRANSCRIPTION', 'TRANSLATION', 'TRANSLITERATION'],
  },
  allowedRightsStatesByDisposition: {
    CORRECTION_EVIDENCE_ONLY: [
      'PERMISSION_GRANTED_REVIEWED',
      'PUBLIC_DOMAIN_UNVERIFIED',
      'RESTRICTED_REVIEWED',
      'UNRESOLVED',
    ],
    HOLD_FOR_REVIEW: [
      'PERMISSION_GRANTED_REVIEWED',
      'PUBLIC_DOMAIN_UNVERIFIED',
      'RESTRICTED_REVIEWED',
      'UNRESOLVED',
    ],
    REJECT_EVIDENCE: [
      'PERMISSION_GRANTED_REVIEWED',
      'PUBLIC_DOMAIN_UNVERIFIED',
      'RESTRICTED_REVIEWED',
      'UNRESOLVED',
    ],
    SOURCE_REVIEW_ONLY: ['PERMISSION_GRANTED_REVIEWED', 'RESTRICTED_REVIEWED'],
  },
  requiredPacketSubmissionStatus: 'SUBMITTED_FOR_REVIEW',
  requiredDeclarations: [
    'contradictionBlockAcknowledged',
    'noAutomaticManifestChange',
    'noProductionApproval',
    'noPublicationClaim',
  ],
  forbiddenDecisionFields: [
    'approvedEditorialStatus',
    'authenticatedStatus',
    'newManifestStatus',
    'productionApproved',
    'productionEligible',
    'productionStatus',
    'publishApproved',
    'releaseApproved',
  ],
};
const manifest = {
  schemaVersion: 1,
  productionEligible: false,
  items: [
    {
      id: 'SID-EV-001',
      siddhar: 'Agastiyar',
      itemTitle: 'Reviewed source witness',
      priority: 'P0',
      status: 'UNRESOLVED',
      productionEligible: false,
    },
    {
      id: 'SID-EV-002',
      siddhar: 'Karuvoorar',
      itemTitle: 'Contradicted attribution',
      priority: 'P0',
      status: 'CONTRADICTED_DO_NOT_PUBLISH',
      productionEligible: false,
    },
  ],
};
const packetId = 'SID-SUB-20260701-001';
const rightsDecisionId = 'SID-RGT-DEC-20260704-001';
const editorialDecisionId = 'SID-ED-DEC-20260705-001';

function createRoot() {
  const value = mkdtempSync(join(tmpdir(), 'siddhar-editorial-disposition-'));
  roots.push(value);
  return value;
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function writeSource(root, id = packetId) {
  const path = `docs/content-intake/evidence/uploads/source-${id}.pdf`;
  const absolute = join(root, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, sourcePdf);
  return { path, sha256: sha256(sourcePdf), mimeType: 'application/pdf', sizeBytes: sourcePdf.length };
}

function review(status, reviewer, reviewedOn, notes) {
  return { status, reviewer, reviewedOn, notes };
}

function reviews(mode = 'editorial-only') {
  const result = {
    EDITORIAL: review(
      'COMPLETE',
      editorialReviewerId,
      '2026-07-03',
      'Editorial review completed against the submitted source packet.',
    ),
    TRANSCRIPTION: review(
      'NOT_APPLICABLE',
      'UNASSIGNED',
      null,
      'Not required for this non-release disposition.',
    ),
    TRANSLATION: review(
      'NOT_APPLICABLE',
      'UNASSIGNED',
      null,
      'Not required for this non-release disposition.',
    ),
    TRANSLITERATION: review(
      'NOT_APPLICABLE',
      'UNASSIGNED',
      null,
      'Not required for this non-release disposition.',
    ),
  };
  if (mode === 'full') {
    for (const role of ['TRANSCRIPTION', 'TRANSLATION', 'TRANSLITERATION']) {
      result[role] = review(
        'COMPLETE',
        preparationReviewerId,
        '2026-07-03',
        `${role} review completed against the submitted evidence.`,
      );
    }
  }
  return result;
}

function unresolvedRights() {
  return {
    status: 'UNRESOLVED',
    rightsHolder: 'UNRESOLVED',
    basis: 'UNRESOLVED',
    permissionReference: 'UNRESOLVED',
    reuseScope: 'NO_REUSE_APPROVED',
    decisionId: 'UNRESOLVED',
    decisionRecordPath: 'UNRESOLVED',
    rightsReviewerId: 'UNASSIGNED',
    decidedOn: null,
  };
}

function restrictedRights() {
  return {
    status: 'RESTRICTED',
    rightsHolder: 'Source Repository',
    basis: 'Repository terms restrict redistribution while permitting internal review.',
    permissionReference: rightsDecisionId,
    reuseScope: 'NO_REUSE_APPROVED',
    decisionId: rightsDecisionId,
    decisionRecordPath: `docs/content-intake/evidence/rights/decisions/${rightsDecisionId}.json`,
    rightsReviewerId: editorialReviewerId,
    decidedOn: '2026-07-04',
  };
}

function packet({
  root,
  manifestItemId = 'SID-EV-001',
  manifestStatusObserved = 'UNRESOLVED',
  proposedDisposition = 'REJECT_EVIDENCE',
  reviewMode = 'editorial-only',
  rights = unresolvedRights(),
  id = packetId,
  submittedOn = '2026-07-01',
  sourceFile = null,
  submissionStatus = 'SUBMITTED_FOR_REVIEW',
  reviewValue = null,
  productionEligible = false,
} = {}) {
  const file = sourceFile ?? writeSource(root, id);
  return {
    schemaVersion: 1,
    packetId: id,
    manifestItemId,
    manifestStatusObserved,
    submissionStatus,
    submittedOn,
    productionEligible,
    source: {
      type: 'PRIMARY_SOURCE_IMAGE',
      repository: 'Documented Repository',
      recordId: 'REC-001',
      title: 'Documented source witness',
      author: 'Documented Author',
      editor: 'Documented Editor',
      publisher: 'Documented Publisher',
      edition: 'Documented Edition',
      publicationYear: '1900',
      language: 'Tamil',
      script: 'Tamil',
      officialUrl: 'https://example.org/source-record',
      accessedOn: '2026-07-01',
    },
    locator: {
      bundleNumber: '',
      workNumber: '',
      accessionNumber: 'ACC-001',
      folioOrPage: 'p. 1',
      verseOrLine: 'line 1',
      adjacentContextIncluded: true,
    },
    files: [file],
    review: reviewValue ?? reviews(reviewMode),
    rights,
    proposedDisposition,
    declarations: {
      noAutomaticStatusPromotion: true,
      noProductionUse: true,
      noMedicalUse: true,
      containsNoSecretsOrPersonalData: true,
    },
    notes: 'Controlled non-production evidence packet for editorial review.',
  };
}

function packetFile(value) {
  return {
    path: `docs/content-intake/evidence/submissions/${value.packetId}.json`,
    value,
  };
}

function restrictedDecision({
  packetValue,
  manifestItemId = packetValue.manifestItemId,
  id = rightsDecisionId,
} = {}) {
  return {
    path: `docs/content-intake/evidence/rights/decisions/${id}.json`,
    value: {
      schemaVersion: 1,
      decisionId: id,
      packetId: packetValue.packetId,
      manifestItemId,
      rightsStatus: 'RESTRICTED',
      rightsReviewerId: editorialReviewerId,
      decidedOn: '2026-07-04',
      rightsHolder: 'Source Repository',
      basis: 'Repository terms restrict redistribution while permitting internal review.',
      reuseScope: 'NO_REUSE_APPROVED',
      permission: null,
      declarations: {
        noAutomaticStatusPromotion: true,
        noProductionUse: true,
        containsNoSecretsOrPersonalData: true,
        privateCorrespondenceStoredOutsideRepository: true,
      },
    },
  };
}

function completedRoles(packetValue) {
  return contract.reviewRoles.filter((role) => packetValue.review[role].status === 'COMPLETE');
}

function editorialDecision({
  packetValue,
  id = editorialDecisionId,
  finalDisposition = 'REJECT_EVIDENCE',
  manifestItemId = packetValue.manifestItemId,
  decidedOn = '2026-07-05',
  reviewerId = editorialReviewerId,
  basis = 'The evidence packet is rejected because the source claim remains insufficiently supported.',
  rightsDecisionValue = packetValue.rights.decisionId === 'UNRESOLVED'
    ? null
    : restrictedDecision({ packetValue }).value,
  overrides = {},
} = {}) {
  return {
    path: `docs/content-intake/evidence/editorial/decisions/${id}.json`,
    value: {
      schemaVersion: 1,
      decisionId: id,
      packetId: packetValue.packetId,
      manifestItemId,
      finalDisposition,
      editorialReviewerId: reviewerId,
      decidedOn,
      subjectFingerprintAlgorithm: SIDDHAR_SUBJECT_FINGERPRINT_ALGORITHM,
      packetFingerprint: fingerprintCanonicalJson(packetValue),
      rightsDecisionFingerprint:
        rightsDecisionValue === null
          ? SIDDHAR_NO_RIGHTS_DECISION_FINGERPRINT
          : fingerprintCanonicalJson(rightsDecisionValue),
      manifestStatusObserved: packetValue.manifestStatusObserved,
      packetSubmissionStatusObserved: packetValue.submissionStatus,
      packetProposedDispositionObserved: packetValue.proposedDisposition,
      rightsStatusObserved: packetValue.rights.status,
      rightsDecisionIdObserved: packetValue.rights.decisionId,
      completedReviewRolesObserved: completedRoles(packetValue),
      basis,
      declarations: {
        contradictionBlockAcknowledged: true,
        noAutomaticManifestChange: true,
        noProductionApproval: true,
        noPublicationClaim: true,
      },
      ...overrides,
    },
  };
}

function validate({
  root = createRoot(),
  governanceDocument = editorialGovernance,
  reviewerDocument = reviewerGovernance,
  rightsDocument = rightsGovernance,
  manifestDocument = manifest,
  packets = [],
  rightsDecisions = [],
  editorialDecisions = [],
  today = '2026-07-29',
} = {}) {
  return validateSiddharEditorialDisposition({
    governanceDocument,
    reviewerGovernance: reviewerDocument,
    rightsGovernance: rightsDocument,
    manifest: manifestDocument,
    packetFiles: packets,
    rightsDecisionFiles: rightsDecisions,
    editorialDecisionFiles: editorialDecisions,
    repositoryRootPath: root,
    submissionContract: contract,
    today,
  });
}

afterEach(() => {
  for (const value of roots.splice(0)) {
    rmSync(value, { recursive: true, force: true });
  }
});

describe('Siddhar editorial disposition provenance', () => {
  it('passes the truthful zero-packet baseline without inventing decisions', () => {
    const result = validate();

    expect(result.ok).toBe(true);
    expect(result.manifestItemCount).toBe(2);
    expect(result.packetFileCount).toBe(0);
    expect(result.editorialDecisionFileCount).toBe(0);
    expect(result.validEditorialDecisionCount).toBe(0);
    expect(result.noPacketManifestItems).toBe(2);
    expect(result.fingerprintCounts).toEqual({
      FRESH: 0,
      STALE: 0,
      INVALID: 0,
      NO_DECISION: 2,
    });
    expect(result.noDecisionFingerprintManifestItems).toBe(2);
    expect(result.productionEligibleItems).toBe(0);
    expect(result.publicationApprovals).toBe(0);
    expect(result.automaticManifestChanges).toBe(0);
  });

  it('accepts a controlled reject-evidence decision with unresolved rights', () => {
    const root = createRoot();
    const value = packet({ root, proposedDisposition: 'REJECT_EVIDENCE' });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(true);
    expect(result.validEditorialDecisionCount).toBe(1);
    expect(result.readinessCounts.REJECTED).toBe(1);
  });

  it('accepts a controlled hold decision with unresolved rights', () => {
    const root = createRoot();
    const value = packet({ root, proposedDisposition: 'HOLD_FOR_REVIEW' });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'HOLD_FOR_REVIEW',
          basis: 'The packet remains on hold while additional source context is obtained.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.readinessCounts.HOLD).toBe(1);
  });

  it('accepts non-production source-review readiness only after all reviews and authoritative rights', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      reviewMode: 'full',
      rights: restrictedRights(),
    });
    const rightsDecision = restrictedDecision({ packetValue: value });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [rightsDecision],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'All required reviews are complete and the restricted rights state permits internal source review only.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.nonProductionReadyManifestItems).toBe(1);
    expect(result.readinessCounts.NONPRODUCTION_READY).toBe(1);
    expect(result.productionEligibleItems).toBe(0);
    expect(result.publicationApprovals).toBe(0);
  });

  it('accepts correction-only handling for a contradicted manifest item without releasing it', () => {
    const root = createRoot();
    const value = packet({
      root,
      manifestItemId: 'SID-EV-002',
      manifestStatusObserved: 'CONTRADICTED_DO_NOT_PUBLISH',
      proposedDisposition: 'CORRECTION_EVIDENCE_ONLY',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'CORRECTION_EVIDENCE_ONLY',
          basis: 'The packet may be retained only as correction evidence; the contradicted attribution remains blocked.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.readinessCounts.CORRECTION_ONLY).toBe(1);
    expect(result.nonProductionReadyManifestItems).toBe(0);
  });

  it('keeps a contradicted item blocked when no editorial decision exists', () => {
    const root = createRoot();
    const value = packet({
      root,
      manifestItemId: 'SID-EV-002',
      manifestStatusObserved: 'CONTRADICTED_DO_NOT_PUBLISH',
      proposedDisposition: 'CORRECTION_EVIDENCE_ONLY',
    });
    const result = validate({ root, packets: [packetFile(value)] });

    expect(result.ok).toBe(true);
    expect(result.readinessCounts.BLOCKED_CONTRADICTION).toBe(1);
  });

  it('rejects release-candidate disposition for a contradicted item', () => {
    const root = createRoot();
    const value = packet({
      root,
      manifestItemId: 'SID-EV-002',
      manifestStatusObserved: 'CONTRADICTED_DO_NOT_PUBLISH',
      proposedDisposition: 'CORRECTION_EVIDENCE_ONLY',
      reviewMode: 'full',
      rights: restrictedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value, manifestItemId: 'SID-EV-002' })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'Attempted source-review disposition for contradicted content.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.contradictionBlockCount).toBeGreaterThan(0);
  });

  it('requires every review role for SOURCE_REVIEW_ONLY', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      rights: restrictedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'Attempted source-review disposition before all language reviews were complete.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.incompleteRequiredReviewCount).toBe(3);
  });

  it('requires authoritative rights for SOURCE_REVIEW_ONLY', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      reviewMode: 'full',
      rights: unresolvedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'Attempted source-review disposition while rights remained unresolved.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.rightsDispositionConflictCount).toBe(1);
  });

  it('requires the editorial decision reviewer to match the completed packet editorial reviewer', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          reviewerId: preparationReviewerId,
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'editorialReviewerId' }),
      ]),
    );
  });

  it('rejects inactive editorial decision reviewers', () => {
    const root = createRoot();
    const value = packet({ root });
    const reviewerDocument = {
      ...reviewerGovernance,
      reviewers: reviewerGovernance.reviewers.map((reviewer) =>
        reviewer.reviewerId === editorialReviewerId
          ? { ...reviewer, active: false }
          : reviewer,
      ),
    };
    const result = validate({
      root,
      reviewerDocument,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.unauthorisedEditorialReviewerCount).toBeGreaterThan(0);
  });

  it('rejects editorial decisions dated before packet submission', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value, decidedOn: '2026-06-30' }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decidedOn', message: 'must not predate packet submission' }),
    );
  });

  it('rejects editorial decisions dated before required reviews', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value, decidedOn: '2026-07-02' }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decidedOn', message: 'must not predate required EDITORIAL review' }),
    );
  });

  it('rejects future editorial decision dates', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value, decidedOn: '2026-07-30' }),
      ],
      today: '2026-07-29',
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decidedOn', message: 'must not be in the future' }),
    );
  });

  it('rejects editorial decision filenames that do not match their ID', () => {
    const root = createRoot();
    const value = packet({ root });
    const decision = editorialDecision({ packetValue: value });
    decision.path = 'docs/content-intake/evidence/editorial/decisions/wrong.json';
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [decision],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decisionId', message: expect.stringContaining('file path must be') }),
    );
  });

  it('rejects multiple current editorial decisions for one packet', () => {
    const root = createRoot();
    const value = packet({ root });
    const second = editorialDecision({
      packetValue: value,
      id: 'SID-ED-DEC-20260705-002',
      finalDisposition: 'HOLD_FOR_REVIEW',
      basis: 'A second current decision for the same packet is not permitted.',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value }),
        second,
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.duplicatePacketDecisionCount).toBe(1);
  });

  it('rejects duplicate editorial decision IDs', () => {
    const root = createRoot();
    const firstPacket = packet({ root });
    const secondPacket = packet({
      root,
      id: 'SID-SUB-20260701-002',
      sourceFile: writeSource(root, 'SID-SUB-20260701-002'),
    });
    const duplicate = editorialDecision({ packetValue: secondPacket });
    duplicate.path = 'docs/content-intake/evidence/editorial/decisions/duplicate.json';
    const result = validate({
      root,
      packets: [packetFile(firstPacket), packetFile(secondPacket)],
      editorialDecisions: [
        editorialDecision({ packetValue: firstPacket }),
        duplicate,
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decisionId', message: 'must be unique' }),
    );
  });

  it('rejects editorial decisions that reference missing packets', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.missingPacketReferenceCount).toBe(1);
  });

  it('rejects editorial decisions with a mismatched manifest item', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value, manifestItemId: 'SID-EV-002' }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'manifestItemId' }),
    );
  });

  it('rejects stale manifest-status snapshots', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { manifestStatusObserved: 'SUPPORTED_ASSOCIATION' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'manifestStatusObserved' }),
    );
  });

  it('rejects stale packet-status snapshots', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { packetSubmissionStatusObserved: 'DRAFT' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'packetSubmissionStatusObserved' }),
    );
  });

  it('rejects stale proposed-disposition snapshots', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { packetProposedDispositionObserved: 'HOLD_FOR_REVIEW' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'packetProposedDispositionObserved' }),
    );
  });

  it('rejects stale rights snapshots', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { rightsStatusObserved: 'RESTRICTED' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'rightsStatusObserved' }),
    );
  });

  it('rejects stale completed-review-role snapshots', () => {
    const root = createRoot();
    const value = packet({ root, reviewMode: 'full', rights: restrictedRights() });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          overrides: { completedReviewRolesObserved: ['EDITORIAL'] },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'completedReviewRolesObserved' }),
    );
  });

  it('reports a matching editorial subject fingerprint as fresh', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(true);
    expect(result.freshFingerprintDecisionCount).toBe(1);
    expect(result.staleFingerprintDecisionCount).toBe(0);
    expect(result.fingerprintCoverageByManifestItem).toContainEqual(
      expect.objectContaining({
        manifestItemId: 'SID-EV-001',
        fingerprintState: 'FRESH',
        freshDecisionCount: 1,
      }),
    );
  });

  it('rejects an editorial decision when the packet changes after sign-off', () => {
    const root = createRoot();
    const value = packet({ root });
    const decision = editorialDecision({ packetValue: value });
    value.notes = 'Packet text changed after the editorial decision was signed.';

    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [decision],
    });

    expect(result.ok).toBe(false);
    expect(result.stalePacketFingerprintCount).toBe(1);
    expect(result.staleFingerprintDecisionCount).toBe(1);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        field: 'packetFingerprint',
        message: expect.stringContaining('canonical evidence packet changed'),
      }),
    );
  });

  it('rejects a packet mutation even when semantic snapshot fields remain unchanged', () => {
    const root = createRoot();
    const value = packet({ root });
    const decision = editorialDecision({ packetValue: value });
    value.source.title = 'Documented source witness — corrected catalogue title';

    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [decision],
    });

    expect(result.ok).toBe(false);
    expect(result.stalePacketFingerprintCount).toBe(1);
    expect(result.issues.some((issue) => issue.field === 'manifestStatusObserved')).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'packetSubmissionStatusObserved')).toBe(false);
  });

  it('rejects a source-file declaration mutation after editorial sign-off', () => {
    const root = createRoot();
    const value = packet({ root });
    const decision = editorialDecision({ packetValue: value });
    value.files[0].sizeBytes += 1;

    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [decision],
    });

    expect(result.ok).toBe(false);
    expect(result.stalePacketFingerprintCount).toBe(1);
  });

  it('rejects a review-note mutation after editorial sign-off', () => {
    const root = createRoot();
    const value = packet({ root });
    const decision = editorialDecision({ packetValue: value });
    value.review.EDITORIAL.notes = 'Editorial note amended after sign-off.';

    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [decision],
    });

    expect(result.ok).toBe(false);
    expect(result.stalePacketFingerprintCount).toBe(1);
  });

  it('rejects a malformed packet fingerprint', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { packetFingerprint: 'sha256:ABCDEF' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.malformedFingerprintCount).toBeGreaterThan(0);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'packetFingerprint' }),
    );
  });

  it('rejects an unsupported subject fingerprint algorithm', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { subjectFingerprintAlgorithm: 'SHA512_JSON' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.malformedFingerprintCount).toBeGreaterThan(0);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'subjectFingerprintAlgorithm' }),
    );
  });

  it('requires NONE when there is no referenced rights decision', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { rightsDecisionFingerprint: fingerprintCanonicalJson({ decision: 'invented' }) },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.staleRightsDecisionFingerprintCount).toBe(1);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'rightsDecisionFingerprint' }),
    );
  });

  it('requires a rights-decision fingerprint when a rights decision exists', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      reviewMode: 'full',
      rights: restrictedRights(),
    });
    const rightsDecision = restrictedDecision({ packetValue: value });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [rightsDecision],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          rightsDecisionValue: rightsDecision.value,
          overrides: { rightsDecisionFingerprint: 'NONE' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.staleRightsDecisionFingerprintCount).toBe(1);
  });

  it('rejects an editorial decision when the referenced rights decision changes after sign-off', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      reviewMode: 'full',
      rights: restrictedRights(),
    });
    const rightsDecision = restrictedDecision({ packetValue: value });
    const decision = editorialDecision({
      packetValue: value,
      finalDisposition: 'SOURCE_REVIEW_ONLY',
      rightsDecisionValue: rightsDecision.value,
    });
    rightsDecision.value.basis =
      'Repository terms were amended after editorial sign-off and require renewed review.';

    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [rightsDecision],
      editorialDecisions: [decision],
    });

    expect(result.ok).toBe(false);
    expect(result.staleRightsDecisionFingerprintCount).toBe(1);
    expect(result.staleFingerprintDecisionCount).toBe(1);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        field: 'rightsDecisionFingerprint',
        message: expect.stringContaining('rights decision changed'),
      }),
    );
  });

  it('keeps a fresh rights decision fingerprint valid for SOURCE_REVIEW_ONLY', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      reviewMode: 'full',
      rights: restrictedRights(),
    });
    const rightsDecision = restrictedDecision({ packetValue: value });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [rightsDecision],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          rightsDecisionValue: rightsDecision.value,
          basis: 'All review and rights subjects remain unchanged since editorial sign-off.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.freshFingerprintDecisionCount).toBe(1);
    expect(result.staleRightsDecisionFingerprintCount).toBe(0);
  });

  it('reports NO_DECISION fingerprint state for manifest items without decisions', () => {
    const result = validate();

    expect(result.fingerprintCoverageByManifestItem).toEqual([
      expect.objectContaining({
        manifestItemId: 'SID-EV-001',
        fingerprintState: 'NO_DECISION',
      }),
      expect.objectContaining({
        manifestItemId: 'SID-EV-002',
        fingerprintState: 'NO_DECISION',
      }),
    ]);
  });

  it('sorts fingerprint coverage deterministically by manifest ID', () => {
    const reversed = { ...manifest, items: [...manifest.items].reverse() };
    const result = validate({ manifestDocument: reversed });

    expect(result.fingerprintCoverageByManifestItem.map((item) => item.manifestItemId)).toEqual([
      'SID-EV-001',
      'SID-EV-002',
    ]);
  });

  it('preserves the contradiction block even with a fresh subject fingerprint', () => {
    const root = createRoot();
    const value = packet({
      root,
      manifestItemId: 'SID-EV-002',
      manifestStatusObserved: 'CONTRADICTED_DO_NOT_PUBLISH',
      proposedDisposition: 'CORRECTION_EVIDENCE_ONLY',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'CORRECTION_EVIDENCE_ONLY',
          basis: 'Fresh fingerprints do not change the existing contradicted publication block.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.freshFingerprintDecisionCount).toBe(1);
    expect(result.nonProductionReadyManifestItems).toBe(0);
    expect(result.productionEligibleItems).toBe(0);
    expect(result.publicationApprovals).toBe(0);
  });

  it('rejects governance drift in the fingerprint algorithm', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        fingerprintAlgorithm: 'SHA512_JSON',
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ field: 'fingerprintAlgorithm' }),
    );
  });

  it('rejects governance drift in the fingerprint pattern', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        fingerprintPattern: '^.*
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          basis: 'REPLACE_WITH_DECISION',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'basis' }),
    );
  });

  it('rejects authentication or publication-approval language in decision basis', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          basis: 'This item is authenticated and approved for publication based on the packet.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.forbiddenApprovalLanguageCount).toBe(1);
  });

  it('requires every protected editorial declaration to remain true', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: {
            declarations: {
              contradictionBlockAcknowledged: true,
              noAutomaticManifestChange: true,
              noProductionApproval: false,
              noPublicationClaim: true,
            },
          },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'noProductionApproval' }),
    );
  });

  it('rejects production or manifest-promotion fields in decision records', () => {
    const root = createRoot();
    const value = packet({ root });
    const decision = editorialDecision({ packetValue: value });
    decision.value.productionApproved = true;
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [decision],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'productionApproved' }),
    );
  });

  it('requires packets to be submitted for review before a decision is recorded', () => {
    const root = createRoot();
    const value = packet({ root, submissionStatus: 'DRAFT' });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        field: 'packetSubmissionStatusObserved',
        message: expect.stringContaining('SUBMITTED_FOR_REVIEW'),
      }),
    );
  });

  it('blocks editorial disposition when source evidence bytes are missing', () => {
    const root = createRoot();
    const file = {
      path: 'docs/content-intake/evidence/uploads/missing.pdf',
      sha256: sha256(sourcePdf),
      mimeType: 'application/pdf',
      sizeBytes: sourcePdf.length,
    };
    const value = packet({ root, sourceFile: file });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.sourceFileIntegrityOk).toBe(false);
    expect(result.upstream.sourceCoverageOk).toBe(false);
  });

  it('blocks editorial disposition when a normal source upload is orphaned', () => {
    const root = createRoot();
    const value = packet({ root });
    const orphan = join(root, 'docs/content-intake/evidence/uploads/orphan.pdf');
    mkdirSync(dirname(orphan), { recursive: true });
    writeFileSync(orphan, sourcePdf);
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.sourceCoverageOk).toBe(false);
  });

  it('blocks editorial disposition when reviewer separation of duties is violated', () => {
    const root = createRoot();
    const badReviews = reviews('full');
    badReviews.TRANSCRIPTION = {
      ...badReviews.TRANSCRIPTION,
      reviewer: editorialReviewerId,
    };
    const value = packet({
      root,
      reviewMode: 'full',
      reviewValue: badReviews,
      rights: restrictedRights(),
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.reviewerGovernanceOk).toBe(false);
  });

  it('blocks editorial disposition when authoritative rights provenance is invalid', () => {
    const root = createRoot();
    const value = packet({
      root,
      reviewMode: 'full',
      rights: restrictedRights(),
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.rightsProvenanceOk).toBe(false);
  });

  it('allows explicit UNASSIGNED in legitimate fail-closed not-applicable and unresolved states', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.upstream.submissionsOk).toBe(true);
    expect(result.upstream.reviewerGovernanceOk).toBe(true);
    expect(result.upstream.rightsProvenanceOk).toBe(true);
  });

  it('keeps readiness output deterministically sorted by manifest ID', () => {
    const reversed = { ...manifest, items: [...manifest.items].reverse() };
    const result = validate({ manifestDocument: reversed });

    expect(result.ok).toBe(true);
    expect(result.readinessByManifestItem.map((item) => item.manifestItemId)).toEqual([
      'SID-EV-001',
      'SID-EV-002',
    ]);
  });

  it('rejects manifest-level or item-level production eligibility', () => {
    const root = createRoot();
    const unsafeManifest = {
      ...manifest,
      productionEligible: true,
      items: manifest.items.map((item, index) =>
        index === 0 ? { ...item, productionEligible: true } : item,
      ),
    };
    const result = validate({ root, manifestDocument: unsafeManifest });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'productionEligible' }),
      ]),
    );
  });

  it('rejects malformed editorial decision JSON results', () => {
    const result = validate({
      editorialDecisions: [
        {
          path: 'docs/content-intake/evidence/editorial/decisions/bad.json',
          value: null,
          parseError: 'Unexpected token',
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.malformedDecisionCount).toBe(1);
  });

  it('rejects governance drift in canonical dispositions', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        finalDispositions: ['HOLD_FOR_REVIEW'],
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ field: 'finalDispositions' }),
    );
  });

  it('rejects governance that weakens SOURCE_REVIEW_ONLY review requirements', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        requiredReviewRolesByDisposition: {
          ...editorialGovernance.requiredReviewRolesByDisposition,
          SOURCE_REVIEW_ONLY: ['EDITORIAL'],
        },
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        field: 'requiredReviewRolesByDisposition.SOURCE_REVIEW_ONLY',
      }),
    );
  });

  it('rejects governance that weakens SOURCE_REVIEW_ONLY rights requirements', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        allowedRightsStatesByDisposition: {
          ...editorialGovernance.allowedRightsStatesByDisposition,
          SOURCE_REVIEW_ONLY: [
            'PERMISSION_GRANTED_REVIEWED',
            'RESTRICTED_REVIEWED',
            'UNRESOLVED',
          ],
        },
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        field: 'allowedRightsStatesByDisposition.SOURCE_REVIEW_ONLY',
      }),
    );
  });

  it('rejects governance that permits a release candidate for contradicted content', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        contradictedAllowedDispositions: [
          'CORRECTION_EVIDENCE_ONLY',
          'HOLD_FOR_REVIEW',
          'REJECT_EVIDENCE',
          'SOURCE_REVIEW_ONLY',
        ],
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ field: 'contradictedAllowedDispositions' }),
    );
  });

  it('never reports automatic manifest changes, production eligibility, or publication approvals', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      reviewMode: 'full',
      rights: restrictedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'All required reviews are complete for non-production source review only.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.automaticManifestChanges).toBe(0);
    expect(result.productionEligibleItems).toBe(0);
    expect(result.publicationApprovals).toBe(0);
  });
});
,
  decisionPathPrefix: 'docs/content-intake/evidence/editorial/decisions/',
  fingerprintAlgorithm: 'SHA256_CANONICAL_JSON_V1',
  fingerprintPattern: '^sha256:[a-f0-9]{64}
    'CORRECTION_EVIDENCE_ONLY',
    'HOLD_FOR_REVIEW',
    'REJECT_EVIDENCE',
    'SOURCE_REVIEW_ONLY',
  ],
  releaseCandidateDispositions: ['SOURCE_REVIEW_ONLY'],
  contradictedManifestStatus: 'CONTRADICTED_DO_NOT_PUBLISH',
  contradictedAllowedDispositions: [
    'CORRECTION_EVIDENCE_ONLY',
    'HOLD_FOR_REVIEW',
    'REJECT_EVIDENCE',
  ],
  requiredReviewRolesByDisposition: {
    CORRECTION_EVIDENCE_ONLY: ['EDITORIAL'],
    HOLD_FOR_REVIEW: ['EDITORIAL'],
    REJECT_EVIDENCE: ['EDITORIAL'],
    SOURCE_REVIEW_ONLY: ['EDITORIAL', 'TRANSCRIPTION', 'TRANSLATION', 'TRANSLITERATION'],
  },
  allowedRightsStatesByDisposition: {
    CORRECTION_EVIDENCE_ONLY: [
      'PERMISSION_GRANTED_REVIEWED',
      'PUBLIC_DOMAIN_UNVERIFIED',
      'RESTRICTED_REVIEWED',
      'UNRESOLVED',
    ],
    HOLD_FOR_REVIEW: [
      'PERMISSION_GRANTED_REVIEWED',
      'PUBLIC_DOMAIN_UNVERIFIED',
      'RESTRICTED_REVIEWED',
      'UNRESOLVED',
    ],
    REJECT_EVIDENCE: [
      'PERMISSION_GRANTED_REVIEWED',
      'PUBLIC_DOMAIN_UNVERIFIED',
      'RESTRICTED_REVIEWED',
      'UNRESOLVED',
    ],
    SOURCE_REVIEW_ONLY: ['PERMISSION_GRANTED_REVIEWED', 'RESTRICTED_REVIEWED'],
  },
  requiredPacketSubmissionStatus: 'SUBMITTED_FOR_REVIEW',
  requiredDeclarations: [
    'contradictionBlockAcknowledged',
    'noAutomaticManifestChange',
    'noProductionApproval',
    'noPublicationClaim',
  ],
  forbiddenDecisionFields: [
    'approvedEditorialStatus',
    'authenticatedStatus',
    'newManifestStatus',
    'productionApproved',
    'productionEligible',
    'productionStatus',
    'publishApproved',
    'releaseApproved',
  ],
};
const manifest = {
  schemaVersion: 1,
  productionEligible: false,
  items: [
    {
      id: 'SID-EV-001',
      siddhar: 'Agastiyar',
      itemTitle: 'Reviewed source witness',
      priority: 'P0',
      status: 'UNRESOLVED',
      productionEligible: false,
    },
    {
      id: 'SID-EV-002',
      siddhar: 'Karuvoorar',
      itemTitle: 'Contradicted attribution',
      priority: 'P0',
      status: 'CONTRADICTED_DO_NOT_PUBLISH',
      productionEligible: false,
    },
  ],
};
const packetId = 'SID-SUB-20260701-001';
const rightsDecisionId = 'SID-RGT-DEC-20260704-001';
const editorialDecisionId = 'SID-ED-DEC-20260705-001';

function createRoot() {
  const value = mkdtempSync(join(tmpdir(), 'siddhar-editorial-disposition-'));
  roots.push(value);
  return value;
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function writeSource(root, id = packetId) {
  const path = `docs/content-intake/evidence/uploads/source-${id}.pdf`;
  const absolute = join(root, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, sourcePdf);
  return { path, sha256: sha256(sourcePdf), mimeType: 'application/pdf', sizeBytes: sourcePdf.length };
}

function review(status, reviewer, reviewedOn, notes) {
  return { status, reviewer, reviewedOn, notes };
}

function reviews(mode = 'editorial-only') {
  const result = {
    EDITORIAL: review(
      'COMPLETE',
      editorialReviewerId,
      '2026-07-03',
      'Editorial review completed against the submitted source packet.',
    ),
    TRANSCRIPTION: review(
      'NOT_APPLICABLE',
      'UNASSIGNED',
      null,
      'Not required for this non-release disposition.',
    ),
    TRANSLATION: review(
      'NOT_APPLICABLE',
      'UNASSIGNED',
      null,
      'Not required for this non-release disposition.',
    ),
    TRANSLITERATION: review(
      'NOT_APPLICABLE',
      'UNASSIGNED',
      null,
      'Not required for this non-release disposition.',
    ),
  };
  if (mode === 'full') {
    for (const role of ['TRANSCRIPTION', 'TRANSLATION', 'TRANSLITERATION']) {
      result[role] = review(
        'COMPLETE',
        preparationReviewerId,
        '2026-07-03',
        `${role} review completed against the submitted evidence.`,
      );
    }
  }
  return result;
}

function unresolvedRights() {
  return {
    status: 'UNRESOLVED',
    rightsHolder: 'UNRESOLVED',
    basis: 'UNRESOLVED',
    permissionReference: 'UNRESOLVED',
    reuseScope: 'NO_REUSE_APPROVED',
    decisionId: 'UNRESOLVED',
    decisionRecordPath: 'UNRESOLVED',
    rightsReviewerId: 'UNASSIGNED',
    decidedOn: null,
  };
}

function restrictedRights() {
  return {
    status: 'RESTRICTED',
    rightsHolder: 'Source Repository',
    basis: 'Repository terms restrict redistribution while permitting internal review.',
    permissionReference: rightsDecisionId,
    reuseScope: 'NO_REUSE_APPROVED',
    decisionId: rightsDecisionId,
    decisionRecordPath: `docs/content-intake/evidence/rights/decisions/${rightsDecisionId}.json`,
    rightsReviewerId: editorialReviewerId,
    decidedOn: '2026-07-04',
  };
}

function packet({
  root,
  manifestItemId = 'SID-EV-001',
  manifestStatusObserved = 'UNRESOLVED',
  proposedDisposition = 'REJECT_EVIDENCE',
  reviewMode = 'editorial-only',
  rights = unresolvedRights(),
  id = packetId,
  submittedOn = '2026-07-01',
  sourceFile = null,
  submissionStatus = 'SUBMITTED_FOR_REVIEW',
  reviewValue = null,
  productionEligible = false,
} = {}) {
  const file = sourceFile ?? writeSource(root, id);
  return {
    schemaVersion: 1,
    packetId: id,
    manifestItemId,
    manifestStatusObserved,
    submissionStatus,
    submittedOn,
    productionEligible,
    source: {
      type: 'PRIMARY_SOURCE_IMAGE',
      repository: 'Documented Repository',
      recordId: 'REC-001',
      title: 'Documented source witness',
      author: 'Documented Author',
      editor: 'Documented Editor',
      publisher: 'Documented Publisher',
      edition: 'Documented Edition',
      publicationYear: '1900',
      language: 'Tamil',
      script: 'Tamil',
      officialUrl: 'https://example.org/source-record',
      accessedOn: '2026-07-01',
    },
    locator: {
      bundleNumber: '',
      workNumber: '',
      accessionNumber: 'ACC-001',
      folioOrPage: 'p. 1',
      verseOrLine: 'line 1',
      adjacentContextIncluded: true,
    },
    files: [file],
    review: reviewValue ?? reviews(reviewMode),
    rights,
    proposedDisposition,
    declarations: {
      noAutomaticStatusPromotion: true,
      noProductionUse: true,
      noMedicalUse: true,
      containsNoSecretsOrPersonalData: true,
    },
    notes: 'Controlled non-production evidence packet for editorial review.',
  };
}

function packetFile(value) {
  return {
    path: `docs/content-intake/evidence/submissions/${value.packetId}.json`,
    value,
  };
}

function restrictedDecision({
  packetValue,
  manifestItemId = packetValue.manifestItemId,
  id = rightsDecisionId,
} = {}) {
  return {
    path: `docs/content-intake/evidence/rights/decisions/${id}.json`,
    value: {
      schemaVersion: 1,
      decisionId: id,
      packetId: packetValue.packetId,
      manifestItemId,
      rightsStatus: 'RESTRICTED',
      rightsReviewerId: editorialReviewerId,
      decidedOn: '2026-07-04',
      rightsHolder: 'Source Repository',
      basis: 'Repository terms restrict redistribution while permitting internal review.',
      reuseScope: 'NO_REUSE_APPROVED',
      permission: null,
      declarations: {
        noAutomaticStatusPromotion: true,
        noProductionUse: true,
        containsNoSecretsOrPersonalData: true,
        privateCorrespondenceStoredOutsideRepository: true,
      },
    },
  };
}

function completedRoles(packetValue) {
  return contract.reviewRoles.filter((role) => packetValue.review[role].status === 'COMPLETE');
}

function editorialDecision({
  packetValue,
  id = editorialDecisionId,
  finalDisposition = 'REJECT_EVIDENCE',
  manifestItemId = packetValue.manifestItemId,
  decidedOn = '2026-07-05',
  reviewerId = editorialReviewerId,
  basis = 'The evidence packet is rejected because the source claim remains insufficiently supported.',
  overrides = {},
} = {}) {
  return {
    path: `docs/content-intake/evidence/editorial/decisions/${id}.json`,
    value: {
      schemaVersion: 1,
      decisionId: id,
      packetId: packetValue.packetId,
      manifestItemId,
      finalDisposition,
      editorialReviewerId: reviewerId,
      decidedOn,
      manifestStatusObserved: packetValue.manifestStatusObserved,
      packetSubmissionStatusObserved: packetValue.submissionStatus,
      packetProposedDispositionObserved: packetValue.proposedDisposition,
      rightsStatusObserved: packetValue.rights.status,
      rightsDecisionIdObserved: packetValue.rights.decisionId,
      completedReviewRolesObserved: completedRoles(packetValue),
      basis,
      declarations: {
        contradictionBlockAcknowledged: true,
        noAutomaticManifestChange: true,
        noProductionApproval: true,
        noPublicationClaim: true,
      },
      ...overrides,
    },
  };
}

function validate({
  root = createRoot(),
  governanceDocument = editorialGovernance,
  reviewerDocument = reviewerGovernance,
  rightsDocument = rightsGovernance,
  manifestDocument = manifest,
  packets = [],
  rightsDecisions = [],
  editorialDecisions = [],
  today = '2026-07-29',
} = {}) {
  return validateSiddharEditorialDisposition({
    governanceDocument,
    reviewerGovernance: reviewerDocument,
    rightsGovernance: rightsDocument,
    manifest: manifestDocument,
    packetFiles: packets,
    rightsDecisionFiles: rightsDecisions,
    editorialDecisionFiles: editorialDecisions,
    repositoryRootPath: root,
    submissionContract: contract,
    today,
  });
}

afterEach(() => {
  for (const value of roots.splice(0)) {
    rmSync(value, { recursive: true, force: true });
  }
});

describe('Siddhar editorial disposition provenance', () => {
  it('passes the truthful zero-packet baseline without inventing decisions', () => {
    const result = validate();

    expect(result.ok).toBe(true);
    expect(result.manifestItemCount).toBe(2);
    expect(result.packetFileCount).toBe(0);
    expect(result.editorialDecisionFileCount).toBe(0);
    expect(result.validEditorialDecisionCount).toBe(0);
    expect(result.noPacketManifestItems).toBe(2);
    expect(result.productionEligibleItems).toBe(0);
    expect(result.publicationApprovals).toBe(0);
    expect(result.automaticManifestChanges).toBe(0);
  });

  it('accepts a controlled reject-evidence decision with unresolved rights', () => {
    const root = createRoot();
    const value = packet({ root, proposedDisposition: 'REJECT_EVIDENCE' });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(true);
    expect(result.validEditorialDecisionCount).toBe(1);
    expect(result.readinessCounts.REJECTED).toBe(1);
  });

  it('accepts a controlled hold decision with unresolved rights', () => {
    const root = createRoot();
    const value = packet({ root, proposedDisposition: 'HOLD_FOR_REVIEW' });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'HOLD_FOR_REVIEW',
          basis: 'The packet remains on hold while additional source context is obtained.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.readinessCounts.HOLD).toBe(1);
  });

  it('accepts non-production source-review readiness only after all reviews and authoritative rights', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      reviewMode: 'full',
      rights: restrictedRights(),
    });
    const rightsDecision = restrictedDecision({ packetValue: value });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [rightsDecision],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'All required reviews are complete and the restricted rights state permits internal source review only.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.nonProductionReadyManifestItems).toBe(1);
    expect(result.readinessCounts.NONPRODUCTION_READY).toBe(1);
    expect(result.productionEligibleItems).toBe(0);
    expect(result.publicationApprovals).toBe(0);
  });

  it('accepts correction-only handling for a contradicted manifest item without releasing it', () => {
    const root = createRoot();
    const value = packet({
      root,
      manifestItemId: 'SID-EV-002',
      manifestStatusObserved: 'CONTRADICTED_DO_NOT_PUBLISH',
      proposedDisposition: 'CORRECTION_EVIDENCE_ONLY',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'CORRECTION_EVIDENCE_ONLY',
          basis: 'The packet may be retained only as correction evidence; the contradicted attribution remains blocked.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.readinessCounts.CORRECTION_ONLY).toBe(1);
    expect(result.nonProductionReadyManifestItems).toBe(0);
  });

  it('keeps a contradicted item blocked when no editorial decision exists', () => {
    const root = createRoot();
    const value = packet({
      root,
      manifestItemId: 'SID-EV-002',
      manifestStatusObserved: 'CONTRADICTED_DO_NOT_PUBLISH',
      proposedDisposition: 'CORRECTION_EVIDENCE_ONLY',
    });
    const result = validate({ root, packets: [packetFile(value)] });

    expect(result.ok).toBe(true);
    expect(result.readinessCounts.BLOCKED_CONTRADICTION).toBe(1);
  });

  it('rejects release-candidate disposition for a contradicted item', () => {
    const root = createRoot();
    const value = packet({
      root,
      manifestItemId: 'SID-EV-002',
      manifestStatusObserved: 'CONTRADICTED_DO_NOT_PUBLISH',
      proposedDisposition: 'CORRECTION_EVIDENCE_ONLY',
      reviewMode: 'full',
      rights: restrictedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value, manifestItemId: 'SID-EV-002' })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'Attempted source-review disposition for contradicted content.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.contradictionBlockCount).toBeGreaterThan(0);
  });

  it('requires every review role for SOURCE_REVIEW_ONLY', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      rights: restrictedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'Attempted source-review disposition before all language reviews were complete.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.incompleteRequiredReviewCount).toBe(3);
  });

  it('requires authoritative rights for SOURCE_REVIEW_ONLY', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      reviewMode: 'full',
      rights: unresolvedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'Attempted source-review disposition while rights remained unresolved.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.rightsDispositionConflictCount).toBe(1);
  });

  it('requires the editorial decision reviewer to match the completed packet editorial reviewer', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          reviewerId: preparationReviewerId,
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'editorialReviewerId' }),
      ]),
    );
  });

  it('rejects inactive editorial decision reviewers', () => {
    const root = createRoot();
    const value = packet({ root });
    const reviewerDocument = {
      ...reviewerGovernance,
      reviewers: reviewerGovernance.reviewers.map((reviewer) =>
        reviewer.reviewerId === editorialReviewerId
          ? { ...reviewer, active: false }
          : reviewer,
      ),
    };
    const result = validate({
      root,
      reviewerDocument,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.unauthorisedEditorialReviewerCount).toBeGreaterThan(0);
  });

  it('rejects editorial decisions dated before packet submission', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value, decidedOn: '2026-06-30' }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decidedOn', message: 'must not predate packet submission' }),
    );
  });

  it('rejects editorial decisions dated before required reviews', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value, decidedOn: '2026-07-02' }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decidedOn', message: 'must not predate required EDITORIAL review' }),
    );
  });

  it('rejects future editorial decision dates', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value, decidedOn: '2026-07-30' }),
      ],
      today: '2026-07-29',
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decidedOn', message: 'must not be in the future' }),
    );
  });

  it('rejects editorial decision filenames that do not match their ID', () => {
    const root = createRoot();
    const value = packet({ root });
    const decision = editorialDecision({ packetValue: value });
    decision.path = 'docs/content-intake/evidence/editorial/decisions/wrong.json';
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [decision],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decisionId', message: expect.stringContaining('file path must be') }),
    );
  });

  it('rejects multiple current editorial decisions for one packet', () => {
    const root = createRoot();
    const value = packet({ root });
    const second = editorialDecision({
      packetValue: value,
      id: 'SID-ED-DEC-20260705-002',
      finalDisposition: 'HOLD_FOR_REVIEW',
      basis: 'A second current decision for the same packet is not permitted.',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value }),
        second,
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.duplicatePacketDecisionCount).toBe(1);
  });

  it('rejects duplicate editorial decision IDs', () => {
    const root = createRoot();
    const firstPacket = packet({ root });
    const secondPacket = packet({
      root,
      id: 'SID-SUB-20260701-002',
      sourceFile: writeSource(root, 'SID-SUB-20260701-002'),
    });
    const duplicate = editorialDecision({ packetValue: secondPacket });
    duplicate.path = 'docs/content-intake/evidence/editorial/decisions/duplicate.json';
    const result = validate({
      root,
      packets: [packetFile(firstPacket), packetFile(secondPacket)],
      editorialDecisions: [
        editorialDecision({ packetValue: firstPacket }),
        duplicate,
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decisionId', message: 'must be unique' }),
    );
  });

  it('rejects editorial decisions that reference missing packets', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.missingPacketReferenceCount).toBe(1);
  });

  it('rejects editorial decisions with a mismatched manifest item', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value, manifestItemId: 'SID-EV-002' }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'manifestItemId' }),
    );
  });

  it('rejects stale manifest-status snapshots', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { manifestStatusObserved: 'SUPPORTED_ASSOCIATION' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'manifestStatusObserved' }),
    );
  });

  it('rejects stale packet-status snapshots', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { packetSubmissionStatusObserved: 'DRAFT' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'packetSubmissionStatusObserved' }),
    );
  });

  it('rejects stale proposed-disposition snapshots', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { packetProposedDispositionObserved: 'HOLD_FOR_REVIEW' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'packetProposedDispositionObserved' }),
    );
  });

  it('rejects stale rights snapshots', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { rightsStatusObserved: 'RESTRICTED' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'rightsStatusObserved' }),
    );
  });

  it('rejects stale completed-review-role snapshots', () => {
    const root = createRoot();
    const value = packet({ root, reviewMode: 'full', rights: restrictedRights() });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          overrides: { completedReviewRolesObserved: ['EDITORIAL'] },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'completedReviewRolesObserved' }),
    );
  });

  it('rejects placeholder or trivial editorial basis text', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          basis: 'REPLACE_WITH_DECISION',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'basis' }),
    );
  });

  it('rejects authentication or publication-approval language in decision basis', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          basis: 'This item is authenticated and approved for publication based on the packet.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.forbiddenApprovalLanguageCount).toBe(1);
  });

  it('requires every protected editorial declaration to remain true', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: {
            declarations: {
              contradictionBlockAcknowledged: true,
              noAutomaticManifestChange: true,
              noProductionApproval: false,
              noPublicationClaim: true,
            },
          },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'noProductionApproval' }),
    );
  });

  it('rejects production or manifest-promotion fields in decision records', () => {
    const root = createRoot();
    const value = packet({ root });
    const decision = editorialDecision({ packetValue: value });
    decision.value.productionApproved = true;
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [decision],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'productionApproved' }),
    );
  });

  it('requires packets to be submitted for review before a decision is recorded', () => {
    const root = createRoot();
    const value = packet({ root, submissionStatus: 'DRAFT' });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        field: 'packetSubmissionStatusObserved',
        message: expect.stringContaining('SUBMITTED_FOR_REVIEW'),
      }),
    );
  });

  it('blocks editorial disposition when source evidence bytes are missing', () => {
    const root = createRoot();
    const file = {
      path: 'docs/content-intake/evidence/uploads/missing.pdf',
      sha256: sha256(sourcePdf),
      mimeType: 'application/pdf',
      sizeBytes: sourcePdf.length,
    };
    const value = packet({ root, sourceFile: file });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.sourceFileIntegrityOk).toBe(false);
    expect(result.upstream.sourceCoverageOk).toBe(false);
  });

  it('blocks editorial disposition when a normal source upload is orphaned', () => {
    const root = createRoot();
    const value = packet({ root });
    const orphan = join(root, 'docs/content-intake/evidence/uploads/orphan.pdf');
    mkdirSync(dirname(orphan), { recursive: true });
    writeFileSync(orphan, sourcePdf);
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.sourceCoverageOk).toBe(false);
  });

  it('blocks editorial disposition when reviewer separation of duties is violated', () => {
    const root = createRoot();
    const badReviews = reviews('full');
    badReviews.TRANSCRIPTION = {
      ...badReviews.TRANSCRIPTION,
      reviewer: editorialReviewerId,
    };
    const value = packet({
      root,
      reviewMode: 'full',
      reviewValue: badReviews,
      rights: restrictedRights(),
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.reviewerGovernanceOk).toBe(false);
  });

  it('blocks editorial disposition when authoritative rights provenance is invalid', () => {
    const root = createRoot();
    const value = packet({
      root,
      reviewMode: 'full',
      rights: restrictedRights(),
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.rightsProvenanceOk).toBe(false);
  });

  it('allows explicit UNASSIGNED in legitimate fail-closed not-applicable and unresolved states', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.upstream.submissionsOk).toBe(true);
    expect(result.upstream.reviewerGovernanceOk).toBe(true);
    expect(result.upstream.rightsProvenanceOk).toBe(true);
  });

  it('keeps readiness output deterministically sorted by manifest ID', () => {
    const reversed = { ...manifest, items: [...manifest.items].reverse() };
    const result = validate({ manifestDocument: reversed });

    expect(result.ok).toBe(true);
    expect(result.readinessByManifestItem.map((item) => item.manifestItemId)).toEqual([
      'SID-EV-001',
      'SID-EV-002',
    ]);
  });

  it('rejects manifest-level or item-level production eligibility', () => {
    const root = createRoot();
    const unsafeManifest = {
      ...manifest,
      productionEligible: true,
      items: manifest.items.map((item, index) =>
        index === 0 ? { ...item, productionEligible: true } : item,
      ),
    };
    const result = validate({ root, manifestDocument: unsafeManifest });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'productionEligible' }),
      ]),
    );
  });

  it('rejects malformed editorial decision JSON results', () => {
    const result = validate({
      editorialDecisions: [
        {
          path: 'docs/content-intake/evidence/editorial/decisions/bad.json',
          value: null,
          parseError: 'Unexpected token',
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.malformedDecisionCount).toBe(1);
  });

  it('rejects governance drift in canonical dispositions', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        finalDispositions: ['HOLD_FOR_REVIEW'],
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ field: 'finalDispositions' }),
    );
  });

  it('rejects governance that weakens SOURCE_REVIEW_ONLY review requirements', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        requiredReviewRolesByDisposition: {
          ...editorialGovernance.requiredReviewRolesByDisposition,
          SOURCE_REVIEW_ONLY: ['EDITORIAL'],
        },
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        field: 'requiredReviewRolesByDisposition.SOURCE_REVIEW_ONLY',
      }),
    );
  });

  it('rejects governance that weakens SOURCE_REVIEW_ONLY rights requirements', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        allowedRightsStatesByDisposition: {
          ...editorialGovernance.allowedRightsStatesByDisposition,
          SOURCE_REVIEW_ONLY: [
            'PERMISSION_GRANTED_REVIEWED',
            'RESTRICTED_REVIEWED',
            'UNRESOLVED',
          ],
        },
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        field: 'allowedRightsStatesByDisposition.SOURCE_REVIEW_ONLY',
      }),
    );
  });

  it('rejects governance that permits a release candidate for contradicted content', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        contradictedAllowedDispositions: [
          'CORRECTION_EVIDENCE_ONLY',
          'HOLD_FOR_REVIEW',
          'REJECT_EVIDENCE',
          'SOURCE_REVIEW_ONLY',
        ],
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ field: 'contradictedAllowedDispositions' }),
    );
  });

  it('never reports automatic manifest changes, production eligibility, or publication approvals', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      reviewMode: 'full',
      rights: restrictedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'All required reviews are complete for non-production source review only.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.automaticManifestChanges).toBe(0);
    expect(result.productionEligibleItems).toBe(0);
    expect(result.publicationApprovals).toBe(0);
  });
});
,
  noRightsDecisionFingerprint: 'NONE',
  finalDispositions: [
    'CORRECTION_EVIDENCE_ONLY',
    'HOLD_FOR_REVIEW',
    'REJECT_EVIDENCE',
    'SOURCE_REVIEW_ONLY',
  ],
  releaseCandidateDispositions: ['SOURCE_REVIEW_ONLY'],
  contradictedManifestStatus: 'CONTRADICTED_DO_NOT_PUBLISH',
  contradictedAllowedDispositions: [
    'CORRECTION_EVIDENCE_ONLY',
    'HOLD_FOR_REVIEW',
    'REJECT_EVIDENCE',
  ],
  requiredReviewRolesByDisposition: {
    CORRECTION_EVIDENCE_ONLY: ['EDITORIAL'],
    HOLD_FOR_REVIEW: ['EDITORIAL'],
    REJECT_EVIDENCE: ['EDITORIAL'],
    SOURCE_REVIEW_ONLY: ['EDITORIAL', 'TRANSCRIPTION', 'TRANSLATION', 'TRANSLITERATION'],
  },
  allowedRightsStatesByDisposition: {
    CORRECTION_EVIDENCE_ONLY: [
      'PERMISSION_GRANTED_REVIEWED',
      'PUBLIC_DOMAIN_UNVERIFIED',
      'RESTRICTED_REVIEWED',
      'UNRESOLVED',
    ],
    HOLD_FOR_REVIEW: [
      'PERMISSION_GRANTED_REVIEWED',
      'PUBLIC_DOMAIN_UNVERIFIED',
      'RESTRICTED_REVIEWED',
      'UNRESOLVED',
    ],
    REJECT_EVIDENCE: [
      'PERMISSION_GRANTED_REVIEWED',
      'PUBLIC_DOMAIN_UNVERIFIED',
      'RESTRICTED_REVIEWED',
      'UNRESOLVED',
    ],
    SOURCE_REVIEW_ONLY: ['PERMISSION_GRANTED_REVIEWED', 'RESTRICTED_REVIEWED'],
  },
  requiredPacketSubmissionStatus: 'SUBMITTED_FOR_REVIEW',
  requiredDeclarations: [
    'contradictionBlockAcknowledged',
    'noAutomaticManifestChange',
    'noProductionApproval',
    'noPublicationClaim',
  ],
  forbiddenDecisionFields: [
    'approvedEditorialStatus',
    'authenticatedStatus',
    'newManifestStatus',
    'productionApproved',
    'productionEligible',
    'productionStatus',
    'publishApproved',
    'releaseApproved',
  ],
};
const manifest = {
  schemaVersion: 1,
  productionEligible: false,
  items: [
    {
      id: 'SID-EV-001',
      siddhar: 'Agastiyar',
      itemTitle: 'Reviewed source witness',
      priority: 'P0',
      status: 'UNRESOLVED',
      productionEligible: false,
    },
    {
      id: 'SID-EV-002',
      siddhar: 'Karuvoorar',
      itemTitle: 'Contradicted attribution',
      priority: 'P0',
      status: 'CONTRADICTED_DO_NOT_PUBLISH',
      productionEligible: false,
    },
  ],
};
const packetId = 'SID-SUB-20260701-001';
const rightsDecisionId = 'SID-RGT-DEC-20260704-001';
const editorialDecisionId = 'SID-ED-DEC-20260705-001';

function createRoot() {
  const value = mkdtempSync(join(tmpdir(), 'siddhar-editorial-disposition-'));
  roots.push(value);
  return value;
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function writeSource(root, id = packetId) {
  const path = `docs/content-intake/evidence/uploads/source-${id}.pdf`;
  const absolute = join(root, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, sourcePdf);
  return { path, sha256: sha256(sourcePdf), mimeType: 'application/pdf', sizeBytes: sourcePdf.length };
}

function review(status, reviewer, reviewedOn, notes) {
  return { status, reviewer, reviewedOn, notes };
}

function reviews(mode = 'editorial-only') {
  const result = {
    EDITORIAL: review(
      'COMPLETE',
      editorialReviewerId,
      '2026-07-03',
      'Editorial review completed against the submitted source packet.',
    ),
    TRANSCRIPTION: review(
      'NOT_APPLICABLE',
      'UNASSIGNED',
      null,
      'Not required for this non-release disposition.',
    ),
    TRANSLATION: review(
      'NOT_APPLICABLE',
      'UNASSIGNED',
      null,
      'Not required for this non-release disposition.',
    ),
    TRANSLITERATION: review(
      'NOT_APPLICABLE',
      'UNASSIGNED',
      null,
      'Not required for this non-release disposition.',
    ),
  };
  if (mode === 'full') {
    for (const role of ['TRANSCRIPTION', 'TRANSLATION', 'TRANSLITERATION']) {
      result[role] = review(
        'COMPLETE',
        preparationReviewerId,
        '2026-07-03',
        `${role} review completed against the submitted evidence.`,
      );
    }
  }
  return result;
}

function unresolvedRights() {
  return {
    status: 'UNRESOLVED',
    rightsHolder: 'UNRESOLVED',
    basis: 'UNRESOLVED',
    permissionReference: 'UNRESOLVED',
    reuseScope: 'NO_REUSE_APPROVED',
    decisionId: 'UNRESOLVED',
    decisionRecordPath: 'UNRESOLVED',
    rightsReviewerId: 'UNASSIGNED',
    decidedOn: null,
  };
}

function restrictedRights() {
  return {
    status: 'RESTRICTED',
    rightsHolder: 'Source Repository',
    basis: 'Repository terms restrict redistribution while permitting internal review.',
    permissionReference: rightsDecisionId,
    reuseScope: 'NO_REUSE_APPROVED',
    decisionId: rightsDecisionId,
    decisionRecordPath: `docs/content-intake/evidence/rights/decisions/${rightsDecisionId}.json`,
    rightsReviewerId: editorialReviewerId,
    decidedOn: '2026-07-04',
  };
}

function packet({
  root,
  manifestItemId = 'SID-EV-001',
  manifestStatusObserved = 'UNRESOLVED',
  proposedDisposition = 'REJECT_EVIDENCE',
  reviewMode = 'editorial-only',
  rights = unresolvedRights(),
  id = packetId,
  submittedOn = '2026-07-01',
  sourceFile = null,
  submissionStatus = 'SUBMITTED_FOR_REVIEW',
  reviewValue = null,
  productionEligible = false,
} = {}) {
  const file = sourceFile ?? writeSource(root, id);
  return {
    schemaVersion: 1,
    packetId: id,
    manifestItemId,
    manifestStatusObserved,
    submissionStatus,
    submittedOn,
    productionEligible,
    source: {
      type: 'PRIMARY_SOURCE_IMAGE',
      repository: 'Documented Repository',
      recordId: 'REC-001',
      title: 'Documented source witness',
      author: 'Documented Author',
      editor: 'Documented Editor',
      publisher: 'Documented Publisher',
      edition: 'Documented Edition',
      publicationYear: '1900',
      language: 'Tamil',
      script: 'Tamil',
      officialUrl: 'https://example.org/source-record',
      accessedOn: '2026-07-01',
    },
    locator: {
      bundleNumber: '',
      workNumber: '',
      accessionNumber: 'ACC-001',
      folioOrPage: 'p. 1',
      verseOrLine: 'line 1',
      adjacentContextIncluded: true,
    },
    files: [file],
    review: reviewValue ?? reviews(reviewMode),
    rights,
    proposedDisposition,
    declarations: {
      noAutomaticStatusPromotion: true,
      noProductionUse: true,
      noMedicalUse: true,
      containsNoSecretsOrPersonalData: true,
    },
    notes: 'Controlled non-production evidence packet for editorial review.',
  };
}

function packetFile(value) {
  return {
    path: `docs/content-intake/evidence/submissions/${value.packetId}.json`,
    value,
  };
}

function restrictedDecision({
  packetValue,
  manifestItemId = packetValue.manifestItemId,
  id = rightsDecisionId,
} = {}) {
  return {
    path: `docs/content-intake/evidence/rights/decisions/${id}.json`,
    value: {
      schemaVersion: 1,
      decisionId: id,
      packetId: packetValue.packetId,
      manifestItemId,
      rightsStatus: 'RESTRICTED',
      rightsReviewerId: editorialReviewerId,
      decidedOn: '2026-07-04',
      rightsHolder: 'Source Repository',
      basis: 'Repository terms restrict redistribution while permitting internal review.',
      reuseScope: 'NO_REUSE_APPROVED',
      permission: null,
      declarations: {
        noAutomaticStatusPromotion: true,
        noProductionUse: true,
        containsNoSecretsOrPersonalData: true,
        privateCorrespondenceStoredOutsideRepository: true,
      },
    },
  };
}

function completedRoles(packetValue) {
  return contract.reviewRoles.filter((role) => packetValue.review[role].status === 'COMPLETE');
}

function editorialDecision({
  packetValue,
  id = editorialDecisionId,
  finalDisposition = 'REJECT_EVIDENCE',
  manifestItemId = packetValue.manifestItemId,
  decidedOn = '2026-07-05',
  reviewerId = editorialReviewerId,
  basis = 'The evidence packet is rejected because the source claim remains insufficiently supported.',
  overrides = {},
} = {}) {
  return {
    path: `docs/content-intake/evidence/editorial/decisions/${id}.json`,
    value: {
      schemaVersion: 1,
      decisionId: id,
      packetId: packetValue.packetId,
      manifestItemId,
      finalDisposition,
      editorialReviewerId: reviewerId,
      decidedOn,
      manifestStatusObserved: packetValue.manifestStatusObserved,
      packetSubmissionStatusObserved: packetValue.submissionStatus,
      packetProposedDispositionObserved: packetValue.proposedDisposition,
      rightsStatusObserved: packetValue.rights.status,
      rightsDecisionIdObserved: packetValue.rights.decisionId,
      completedReviewRolesObserved: completedRoles(packetValue),
      basis,
      declarations: {
        contradictionBlockAcknowledged: true,
        noAutomaticManifestChange: true,
        noProductionApproval: true,
        noPublicationClaim: true,
      },
      ...overrides,
    },
  };
}

function validate({
  root = createRoot(),
  governanceDocument = editorialGovernance,
  reviewerDocument = reviewerGovernance,
  rightsDocument = rightsGovernance,
  manifestDocument = manifest,
  packets = [],
  rightsDecisions = [],
  editorialDecisions = [],
  today = '2026-07-29',
} = {}) {
  return validateSiddharEditorialDisposition({
    governanceDocument,
    reviewerGovernance: reviewerDocument,
    rightsGovernance: rightsDocument,
    manifest: manifestDocument,
    packetFiles: packets,
    rightsDecisionFiles: rightsDecisions,
    editorialDecisionFiles: editorialDecisions,
    repositoryRootPath: root,
    submissionContract: contract,
    today,
  });
}

afterEach(() => {
  for (const value of roots.splice(0)) {
    rmSync(value, { recursive: true, force: true });
  }
});

describe('Siddhar editorial disposition provenance', () => {
  it('passes the truthful zero-packet baseline without inventing decisions', () => {
    const result = validate();

    expect(result.ok).toBe(true);
    expect(result.manifestItemCount).toBe(2);
    expect(result.packetFileCount).toBe(0);
    expect(result.editorialDecisionFileCount).toBe(0);
    expect(result.validEditorialDecisionCount).toBe(0);
    expect(result.noPacketManifestItems).toBe(2);
    expect(result.productionEligibleItems).toBe(0);
    expect(result.publicationApprovals).toBe(0);
    expect(result.automaticManifestChanges).toBe(0);
  });

  it('accepts a controlled reject-evidence decision with unresolved rights', () => {
    const root = createRoot();
    const value = packet({ root, proposedDisposition: 'REJECT_EVIDENCE' });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(true);
    expect(result.validEditorialDecisionCount).toBe(1);
    expect(result.readinessCounts.REJECTED).toBe(1);
  });

  it('accepts a controlled hold decision with unresolved rights', () => {
    const root = createRoot();
    const value = packet({ root, proposedDisposition: 'HOLD_FOR_REVIEW' });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'HOLD_FOR_REVIEW',
          basis: 'The packet remains on hold while additional source context is obtained.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.readinessCounts.HOLD).toBe(1);
  });

  it('accepts non-production source-review readiness only after all reviews and authoritative rights', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      reviewMode: 'full',
      rights: restrictedRights(),
    });
    const rightsDecision = restrictedDecision({ packetValue: value });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [rightsDecision],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'All required reviews are complete and the restricted rights state permits internal source review only.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.nonProductionReadyManifestItems).toBe(1);
    expect(result.readinessCounts.NONPRODUCTION_READY).toBe(1);
    expect(result.productionEligibleItems).toBe(0);
    expect(result.publicationApprovals).toBe(0);
  });

  it('accepts correction-only handling for a contradicted manifest item without releasing it', () => {
    const root = createRoot();
    const value = packet({
      root,
      manifestItemId: 'SID-EV-002',
      manifestStatusObserved: 'CONTRADICTED_DO_NOT_PUBLISH',
      proposedDisposition: 'CORRECTION_EVIDENCE_ONLY',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'CORRECTION_EVIDENCE_ONLY',
          basis: 'The packet may be retained only as correction evidence; the contradicted attribution remains blocked.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.readinessCounts.CORRECTION_ONLY).toBe(1);
    expect(result.nonProductionReadyManifestItems).toBe(0);
  });

  it('keeps a contradicted item blocked when no editorial decision exists', () => {
    const root = createRoot();
    const value = packet({
      root,
      manifestItemId: 'SID-EV-002',
      manifestStatusObserved: 'CONTRADICTED_DO_NOT_PUBLISH',
      proposedDisposition: 'CORRECTION_EVIDENCE_ONLY',
    });
    const result = validate({ root, packets: [packetFile(value)] });

    expect(result.ok).toBe(true);
    expect(result.readinessCounts.BLOCKED_CONTRADICTION).toBe(1);
  });

  it('rejects release-candidate disposition for a contradicted item', () => {
    const root = createRoot();
    const value = packet({
      root,
      manifestItemId: 'SID-EV-002',
      manifestStatusObserved: 'CONTRADICTED_DO_NOT_PUBLISH',
      proposedDisposition: 'CORRECTION_EVIDENCE_ONLY',
      reviewMode: 'full',
      rights: restrictedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value, manifestItemId: 'SID-EV-002' })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'Attempted source-review disposition for contradicted content.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.contradictionBlockCount).toBeGreaterThan(0);
  });

  it('requires every review role for SOURCE_REVIEW_ONLY', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      rights: restrictedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'Attempted source-review disposition before all language reviews were complete.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.incompleteRequiredReviewCount).toBe(3);
  });

  it('requires authoritative rights for SOURCE_REVIEW_ONLY', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      reviewMode: 'full',
      rights: unresolvedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'Attempted source-review disposition while rights remained unresolved.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.rightsDispositionConflictCount).toBe(1);
  });

  it('requires the editorial decision reviewer to match the completed packet editorial reviewer', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          reviewerId: preparationReviewerId,
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'editorialReviewerId' }),
      ]),
    );
  });

  it('rejects inactive editorial decision reviewers', () => {
    const root = createRoot();
    const value = packet({ root });
    const reviewerDocument = {
      ...reviewerGovernance,
      reviewers: reviewerGovernance.reviewers.map((reviewer) =>
        reviewer.reviewerId === editorialReviewerId
          ? { ...reviewer, active: false }
          : reviewer,
      ),
    };
    const result = validate({
      root,
      reviewerDocument,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.unauthorisedEditorialReviewerCount).toBeGreaterThan(0);
  });

  it('rejects editorial decisions dated before packet submission', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value, decidedOn: '2026-06-30' }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decidedOn', message: 'must not predate packet submission' }),
    );
  });

  it('rejects editorial decisions dated before required reviews', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value, decidedOn: '2026-07-02' }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decidedOn', message: 'must not predate required EDITORIAL review' }),
    );
  });

  it('rejects future editorial decision dates', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value, decidedOn: '2026-07-30' }),
      ],
      today: '2026-07-29',
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decidedOn', message: 'must not be in the future' }),
    );
  });

  it('rejects editorial decision filenames that do not match their ID', () => {
    const root = createRoot();
    const value = packet({ root });
    const decision = editorialDecision({ packetValue: value });
    decision.path = 'docs/content-intake/evidence/editorial/decisions/wrong.json';
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [decision],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decisionId', message: expect.stringContaining('file path must be') }),
    );
  });

  it('rejects multiple current editorial decisions for one packet', () => {
    const root = createRoot();
    const value = packet({ root });
    const second = editorialDecision({
      packetValue: value,
      id: 'SID-ED-DEC-20260705-002',
      finalDisposition: 'HOLD_FOR_REVIEW',
      basis: 'A second current decision for the same packet is not permitted.',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value }),
        second,
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.duplicatePacketDecisionCount).toBe(1);
  });

  it('rejects duplicate editorial decision IDs', () => {
    const root = createRoot();
    const firstPacket = packet({ root });
    const secondPacket = packet({
      root,
      id: 'SID-SUB-20260701-002',
      sourceFile: writeSource(root, 'SID-SUB-20260701-002'),
    });
    const duplicate = editorialDecision({ packetValue: secondPacket });
    duplicate.path = 'docs/content-intake/evidence/editorial/decisions/duplicate.json';
    const result = validate({
      root,
      packets: [packetFile(firstPacket), packetFile(secondPacket)],
      editorialDecisions: [
        editorialDecision({ packetValue: firstPacket }),
        duplicate,
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decisionId', message: 'must be unique' }),
    );
  });

  it('rejects editorial decisions that reference missing packets', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.missingPacketReferenceCount).toBe(1);
  });

  it('rejects editorial decisions with a mismatched manifest item', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value, manifestItemId: 'SID-EV-002' }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'manifestItemId' }),
    );
  });

  it('rejects stale manifest-status snapshots', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { manifestStatusObserved: 'SUPPORTED_ASSOCIATION' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'manifestStatusObserved' }),
    );
  });

  it('rejects stale packet-status snapshots', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { packetSubmissionStatusObserved: 'DRAFT' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'packetSubmissionStatusObserved' }),
    );
  });

  it('rejects stale proposed-disposition snapshots', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { packetProposedDispositionObserved: 'HOLD_FOR_REVIEW' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'packetProposedDispositionObserved' }),
    );
  });

  it('rejects stale rights snapshots', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { rightsStatusObserved: 'RESTRICTED' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'rightsStatusObserved' }),
    );
  });

  it('rejects stale completed-review-role snapshots', () => {
    const root = createRoot();
    const value = packet({ root, reviewMode: 'full', rights: restrictedRights() });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          overrides: { completedReviewRolesObserved: ['EDITORIAL'] },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'completedReviewRolesObserved' }),
    );
  });

  it('rejects placeholder or trivial editorial basis text', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          basis: 'REPLACE_WITH_DECISION',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'basis' }),
    );
  });

  it('rejects authentication or publication-approval language in decision basis', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          basis: 'This item is authenticated and approved for publication based on the packet.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.forbiddenApprovalLanguageCount).toBe(1);
  });

  it('requires every protected editorial declaration to remain true', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: {
            declarations: {
              contradictionBlockAcknowledged: true,
              noAutomaticManifestChange: true,
              noProductionApproval: false,
              noPublicationClaim: true,
            },
          },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'noProductionApproval' }),
    );
  });

  it('rejects production or manifest-promotion fields in decision records', () => {
    const root = createRoot();
    const value = packet({ root });
    const decision = editorialDecision({ packetValue: value });
    decision.value.productionApproved = true;
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [decision],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'productionApproved' }),
    );
  });

  it('requires packets to be submitted for review before a decision is recorded', () => {
    const root = createRoot();
    const value = packet({ root, submissionStatus: 'DRAFT' });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        field: 'packetSubmissionStatusObserved',
        message: expect.stringContaining('SUBMITTED_FOR_REVIEW'),
      }),
    );
  });

  it('blocks editorial disposition when source evidence bytes are missing', () => {
    const root = createRoot();
    const file = {
      path: 'docs/content-intake/evidence/uploads/missing.pdf',
      sha256: sha256(sourcePdf),
      mimeType: 'application/pdf',
      sizeBytes: sourcePdf.length,
    };
    const value = packet({ root, sourceFile: file });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.sourceFileIntegrityOk).toBe(false);
    expect(result.upstream.sourceCoverageOk).toBe(false);
  });

  it('blocks editorial disposition when a normal source upload is orphaned', () => {
    const root = createRoot();
    const value = packet({ root });
    const orphan = join(root, 'docs/content-intake/evidence/uploads/orphan.pdf');
    mkdirSync(dirname(orphan), { recursive: true });
    writeFileSync(orphan, sourcePdf);
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.sourceCoverageOk).toBe(false);
  });

  it('blocks editorial disposition when reviewer separation of duties is violated', () => {
    const root = createRoot();
    const badReviews = reviews('full');
    badReviews.TRANSCRIPTION = {
      ...badReviews.TRANSCRIPTION,
      reviewer: editorialReviewerId,
    };
    const value = packet({
      root,
      reviewMode: 'full',
      reviewValue: badReviews,
      rights: restrictedRights(),
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.reviewerGovernanceOk).toBe(false);
  });

  it('blocks editorial disposition when authoritative rights provenance is invalid', () => {
    const root = createRoot();
    const value = packet({
      root,
      reviewMode: 'full',
      rights: restrictedRights(),
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.rightsProvenanceOk).toBe(false);
  });

  it('allows explicit UNASSIGNED in legitimate fail-closed not-applicable and unresolved states', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.upstream.submissionsOk).toBe(true);
    expect(result.upstream.reviewerGovernanceOk).toBe(true);
    expect(result.upstream.rightsProvenanceOk).toBe(true);
  });

  it('keeps readiness output deterministically sorted by manifest ID', () => {
    const reversed = { ...manifest, items: [...manifest.items].reverse() };
    const result = validate({ manifestDocument: reversed });

    expect(result.ok).toBe(true);
    expect(result.readinessByManifestItem.map((item) => item.manifestItemId)).toEqual([
      'SID-EV-001',
      'SID-EV-002',
    ]);
  });

  it('rejects manifest-level or item-level production eligibility', () => {
    const root = createRoot();
    const unsafeManifest = {
      ...manifest,
      productionEligible: true,
      items: manifest.items.map((item, index) =>
        index === 0 ? { ...item, productionEligible: true } : item,
      ),
    };
    const result = validate({ root, manifestDocument: unsafeManifest });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'productionEligible' }),
      ]),
    );
  });

  it('rejects malformed editorial decision JSON results', () => {
    const result = validate({
      editorialDecisions: [
        {
          path: 'docs/content-intake/evidence/editorial/decisions/bad.json',
          value: null,
          parseError: 'Unexpected token',
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.malformedDecisionCount).toBe(1);
  });

  it('rejects governance drift in canonical dispositions', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        finalDispositions: ['HOLD_FOR_REVIEW'],
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ field: 'finalDispositions' }),
    );
  });

  it('rejects governance that weakens SOURCE_REVIEW_ONLY review requirements', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        requiredReviewRolesByDisposition: {
          ...editorialGovernance.requiredReviewRolesByDisposition,
          SOURCE_REVIEW_ONLY: ['EDITORIAL'],
        },
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        field: 'requiredReviewRolesByDisposition.SOURCE_REVIEW_ONLY',
      }),
    );
  });

  it('rejects governance that weakens SOURCE_REVIEW_ONLY rights requirements', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        allowedRightsStatesByDisposition: {
          ...editorialGovernance.allowedRightsStatesByDisposition,
          SOURCE_REVIEW_ONLY: [
            'PERMISSION_GRANTED_REVIEWED',
            'RESTRICTED_REVIEWED',
            'UNRESOLVED',
          ],
        },
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        field: 'allowedRightsStatesByDisposition.SOURCE_REVIEW_ONLY',
      }),
    );
  });

  it('rejects governance that permits a release candidate for contradicted content', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        contradictedAllowedDispositions: [
          'CORRECTION_EVIDENCE_ONLY',
          'HOLD_FOR_REVIEW',
          'REJECT_EVIDENCE',
          'SOURCE_REVIEW_ONLY',
        ],
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ field: 'contradictedAllowedDispositions' }),
    );
  });

  it('never reports automatic manifest changes, production eligibility, or publication approvals', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      reviewMode: 'full',
      rights: restrictedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'All required reviews are complete for non-production source review only.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.automaticManifestChanges).toBe(0);
    expect(result.productionEligibleItems).toBe(0);
    expect(result.publicationApprovals).toBe(0);
  });
});
,
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ field: 'fingerprintPattern' }),
    );
  });

  it('rejects governance drift in the no-rights sentinel', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        noRightsDecisionFingerprint: 'UNRESOLVED',
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ field: 'noRightsDecisionFingerprint' }),
    );
  });

  it('rejects placeholder or trivial editorial basis text', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          basis: 'REPLACE_WITH_DECISION',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'basis' }),
    );
  });

  it('rejects authentication or publication-approval language in decision basis', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          basis: 'This item is authenticated and approved for publication based on the packet.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.forbiddenApprovalLanguageCount).toBe(1);
  });

  it('requires every protected editorial declaration to remain true', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: {
            declarations: {
              contradictionBlockAcknowledged: true,
              noAutomaticManifestChange: true,
              noProductionApproval: false,
              noPublicationClaim: true,
            },
          },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'noProductionApproval' }),
    );
  });

  it('rejects production or manifest-promotion fields in decision records', () => {
    const root = createRoot();
    const value = packet({ root });
    const decision = editorialDecision({ packetValue: value });
    decision.value.productionApproved = true;
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [decision],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'productionApproved' }),
    );
  });

  it('requires packets to be submitted for review before a decision is recorded', () => {
    const root = createRoot();
    const value = packet({ root, submissionStatus: 'DRAFT' });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        field: 'packetSubmissionStatusObserved',
        message: expect.stringContaining('SUBMITTED_FOR_REVIEW'),
      }),
    );
  });

  it('blocks editorial disposition when source evidence bytes are missing', () => {
    const root = createRoot();
    const file = {
      path: 'docs/content-intake/evidence/uploads/missing.pdf',
      sha256: sha256(sourcePdf),
      mimeType: 'application/pdf',
      sizeBytes: sourcePdf.length,
    };
    const value = packet({ root, sourceFile: file });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.sourceFileIntegrityOk).toBe(false);
    expect(result.upstream.sourceCoverageOk).toBe(false);
  });

  it('blocks editorial disposition when a normal source upload is orphaned', () => {
    const root = createRoot();
    const value = packet({ root });
    const orphan = join(root, 'docs/content-intake/evidence/uploads/orphan.pdf');
    mkdirSync(dirname(orphan), { recursive: true });
    writeFileSync(orphan, sourcePdf);
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.sourceCoverageOk).toBe(false);
  });

  it('blocks editorial disposition when reviewer separation of duties is violated', () => {
    const root = createRoot();
    const badReviews = reviews('full');
    badReviews.TRANSCRIPTION = {
      ...badReviews.TRANSCRIPTION,
      reviewer: editorialReviewerId,
    };
    const value = packet({
      root,
      reviewMode: 'full',
      reviewValue: badReviews,
      rights: restrictedRights(),
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.reviewerGovernanceOk).toBe(false);
  });

  it('blocks editorial disposition when authoritative rights provenance is invalid', () => {
    const root = createRoot();
    const value = packet({
      root,
      reviewMode: 'full',
      rights: restrictedRights(),
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.rightsProvenanceOk).toBe(false);
  });

  it('allows explicit UNASSIGNED in legitimate fail-closed not-applicable and unresolved states', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.upstream.submissionsOk).toBe(true);
    expect(result.upstream.reviewerGovernanceOk).toBe(true);
    expect(result.upstream.rightsProvenanceOk).toBe(true);
  });

  it('keeps readiness output deterministically sorted by manifest ID', () => {
    const reversed = { ...manifest, items: [...manifest.items].reverse() };
    const result = validate({ manifestDocument: reversed });

    expect(result.ok).toBe(true);
    expect(result.readinessByManifestItem.map((item) => item.manifestItemId)).toEqual([
      'SID-EV-001',
      'SID-EV-002',
    ]);
  });

  it('rejects manifest-level or item-level production eligibility', () => {
    const root = createRoot();
    const unsafeManifest = {
      ...manifest,
      productionEligible: true,
      items: manifest.items.map((item, index) =>
        index === 0 ? { ...item, productionEligible: true } : item,
      ),
    };
    const result = validate({ root, manifestDocument: unsafeManifest });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'productionEligible' }),
      ]),
    );
  });

  it('rejects malformed editorial decision JSON results', () => {
    const result = validate({
      editorialDecisions: [
        {
          path: 'docs/content-intake/evidence/editorial/decisions/bad.json',
          value: null,
          parseError: 'Unexpected token',
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.malformedDecisionCount).toBe(1);
  });

  it('rejects governance drift in canonical dispositions', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        finalDispositions: ['HOLD_FOR_REVIEW'],
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ field: 'finalDispositions' }),
    );
  });

  it('rejects governance that weakens SOURCE_REVIEW_ONLY review requirements', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        requiredReviewRolesByDisposition: {
          ...editorialGovernance.requiredReviewRolesByDisposition,
          SOURCE_REVIEW_ONLY: ['EDITORIAL'],
        },
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        field: 'requiredReviewRolesByDisposition.SOURCE_REVIEW_ONLY',
      }),
    );
  });

  it('rejects governance that weakens SOURCE_REVIEW_ONLY rights requirements', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        allowedRightsStatesByDisposition: {
          ...editorialGovernance.allowedRightsStatesByDisposition,
          SOURCE_REVIEW_ONLY: [
            'PERMISSION_GRANTED_REVIEWED',
            'RESTRICTED_REVIEWED',
            'UNRESOLVED',
          ],
        },
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        field: 'allowedRightsStatesByDisposition.SOURCE_REVIEW_ONLY',
      }),
    );
  });

  it('rejects governance that permits a release candidate for contradicted content', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        contradictedAllowedDispositions: [
          'CORRECTION_EVIDENCE_ONLY',
          'HOLD_FOR_REVIEW',
          'REJECT_EVIDENCE',
          'SOURCE_REVIEW_ONLY',
        ],
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ field: 'contradictedAllowedDispositions' }),
    );
  });

  it('never reports automatic manifest changes, production eligibility, or publication approvals', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      reviewMode: 'full',
      rights: restrictedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'All required reviews are complete for non-production source review only.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.automaticManifestChanges).toBe(0);
    expect(result.productionEligibleItems).toBe(0);
    expect(result.publicationApprovals).toBe(0);
  });
});
,
  decisionPathPrefix: 'docs/content-intake/evidence/editorial/decisions/',
  fingerprintAlgorithm: 'SHA256_CANONICAL_JSON_V1',
  fingerprintPattern: '^sha256:[a-f0-9]{64}
    'CORRECTION_EVIDENCE_ONLY',
    'HOLD_FOR_REVIEW',
    'REJECT_EVIDENCE',
    'SOURCE_REVIEW_ONLY',
  ],
  releaseCandidateDispositions: ['SOURCE_REVIEW_ONLY'],
  contradictedManifestStatus: 'CONTRADICTED_DO_NOT_PUBLISH',
  contradictedAllowedDispositions: [
    'CORRECTION_EVIDENCE_ONLY',
    'HOLD_FOR_REVIEW',
    'REJECT_EVIDENCE',
  ],
  requiredReviewRolesByDisposition: {
    CORRECTION_EVIDENCE_ONLY: ['EDITORIAL'],
    HOLD_FOR_REVIEW: ['EDITORIAL'],
    REJECT_EVIDENCE: ['EDITORIAL'],
    SOURCE_REVIEW_ONLY: ['EDITORIAL', 'TRANSCRIPTION', 'TRANSLATION', 'TRANSLITERATION'],
  },
  allowedRightsStatesByDisposition: {
    CORRECTION_EVIDENCE_ONLY: [
      'PERMISSION_GRANTED_REVIEWED',
      'PUBLIC_DOMAIN_UNVERIFIED',
      'RESTRICTED_REVIEWED',
      'UNRESOLVED',
    ],
    HOLD_FOR_REVIEW: [
      'PERMISSION_GRANTED_REVIEWED',
      'PUBLIC_DOMAIN_UNVERIFIED',
      'RESTRICTED_REVIEWED',
      'UNRESOLVED',
    ],
    REJECT_EVIDENCE: [
      'PERMISSION_GRANTED_REVIEWED',
      'PUBLIC_DOMAIN_UNVERIFIED',
      'RESTRICTED_REVIEWED',
      'UNRESOLVED',
    ],
    SOURCE_REVIEW_ONLY: ['PERMISSION_GRANTED_REVIEWED', 'RESTRICTED_REVIEWED'],
  },
  requiredPacketSubmissionStatus: 'SUBMITTED_FOR_REVIEW',
  requiredDeclarations: [
    'contradictionBlockAcknowledged',
    'noAutomaticManifestChange',
    'noProductionApproval',
    'noPublicationClaim',
  ],
  forbiddenDecisionFields: [
    'approvedEditorialStatus',
    'authenticatedStatus',
    'newManifestStatus',
    'productionApproved',
    'productionEligible',
    'productionStatus',
    'publishApproved',
    'releaseApproved',
  ],
};
const manifest = {
  schemaVersion: 1,
  productionEligible: false,
  items: [
    {
      id: 'SID-EV-001',
      siddhar: 'Agastiyar',
      itemTitle: 'Reviewed source witness',
      priority: 'P0',
      status: 'UNRESOLVED',
      productionEligible: false,
    },
    {
      id: 'SID-EV-002',
      siddhar: 'Karuvoorar',
      itemTitle: 'Contradicted attribution',
      priority: 'P0',
      status: 'CONTRADICTED_DO_NOT_PUBLISH',
      productionEligible: false,
    },
  ],
};
const packetId = 'SID-SUB-20260701-001';
const rightsDecisionId = 'SID-RGT-DEC-20260704-001';
const editorialDecisionId = 'SID-ED-DEC-20260705-001';

function createRoot() {
  const value = mkdtempSync(join(tmpdir(), 'siddhar-editorial-disposition-'));
  roots.push(value);
  return value;
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function writeSource(root, id = packetId) {
  const path = `docs/content-intake/evidence/uploads/source-${id}.pdf`;
  const absolute = join(root, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, sourcePdf);
  return { path, sha256: sha256(sourcePdf), mimeType: 'application/pdf', sizeBytes: sourcePdf.length };
}

function review(status, reviewer, reviewedOn, notes) {
  return { status, reviewer, reviewedOn, notes };
}

function reviews(mode = 'editorial-only') {
  const result = {
    EDITORIAL: review(
      'COMPLETE',
      editorialReviewerId,
      '2026-07-03',
      'Editorial review completed against the submitted source packet.',
    ),
    TRANSCRIPTION: review(
      'NOT_APPLICABLE',
      'UNASSIGNED',
      null,
      'Not required for this non-release disposition.',
    ),
    TRANSLATION: review(
      'NOT_APPLICABLE',
      'UNASSIGNED',
      null,
      'Not required for this non-release disposition.',
    ),
    TRANSLITERATION: review(
      'NOT_APPLICABLE',
      'UNASSIGNED',
      null,
      'Not required for this non-release disposition.',
    ),
  };
  if (mode === 'full') {
    for (const role of ['TRANSCRIPTION', 'TRANSLATION', 'TRANSLITERATION']) {
      result[role] = review(
        'COMPLETE',
        preparationReviewerId,
        '2026-07-03',
        `${role} review completed against the submitted evidence.`,
      );
    }
  }
  return result;
}

function unresolvedRights() {
  return {
    status: 'UNRESOLVED',
    rightsHolder: 'UNRESOLVED',
    basis: 'UNRESOLVED',
    permissionReference: 'UNRESOLVED',
    reuseScope: 'NO_REUSE_APPROVED',
    decisionId: 'UNRESOLVED',
    decisionRecordPath: 'UNRESOLVED',
    rightsReviewerId: 'UNASSIGNED',
    decidedOn: null,
  };
}

function restrictedRights() {
  return {
    status: 'RESTRICTED',
    rightsHolder: 'Source Repository',
    basis: 'Repository terms restrict redistribution while permitting internal review.',
    permissionReference: rightsDecisionId,
    reuseScope: 'NO_REUSE_APPROVED',
    decisionId: rightsDecisionId,
    decisionRecordPath: `docs/content-intake/evidence/rights/decisions/${rightsDecisionId}.json`,
    rightsReviewerId: editorialReviewerId,
    decidedOn: '2026-07-04',
  };
}

function packet({
  root,
  manifestItemId = 'SID-EV-001',
  manifestStatusObserved = 'UNRESOLVED',
  proposedDisposition = 'REJECT_EVIDENCE',
  reviewMode = 'editorial-only',
  rights = unresolvedRights(),
  id = packetId,
  submittedOn = '2026-07-01',
  sourceFile = null,
  submissionStatus = 'SUBMITTED_FOR_REVIEW',
  reviewValue = null,
  productionEligible = false,
} = {}) {
  const file = sourceFile ?? writeSource(root, id);
  return {
    schemaVersion: 1,
    packetId: id,
    manifestItemId,
    manifestStatusObserved,
    submissionStatus,
    submittedOn,
    productionEligible,
    source: {
      type: 'PRIMARY_SOURCE_IMAGE',
      repository: 'Documented Repository',
      recordId: 'REC-001',
      title: 'Documented source witness',
      author: 'Documented Author',
      editor: 'Documented Editor',
      publisher: 'Documented Publisher',
      edition: 'Documented Edition',
      publicationYear: '1900',
      language: 'Tamil',
      script: 'Tamil',
      officialUrl: 'https://example.org/source-record',
      accessedOn: '2026-07-01',
    },
    locator: {
      bundleNumber: '',
      workNumber: '',
      accessionNumber: 'ACC-001',
      folioOrPage: 'p. 1',
      verseOrLine: 'line 1',
      adjacentContextIncluded: true,
    },
    files: [file],
    review: reviewValue ?? reviews(reviewMode),
    rights,
    proposedDisposition,
    declarations: {
      noAutomaticStatusPromotion: true,
      noProductionUse: true,
      noMedicalUse: true,
      containsNoSecretsOrPersonalData: true,
    },
    notes: 'Controlled non-production evidence packet for editorial review.',
  };
}

function packetFile(value) {
  return {
    path: `docs/content-intake/evidence/submissions/${value.packetId}.json`,
    value,
  };
}

function restrictedDecision({
  packetValue,
  manifestItemId = packetValue.manifestItemId,
  id = rightsDecisionId,
} = {}) {
  return {
    path: `docs/content-intake/evidence/rights/decisions/${id}.json`,
    value: {
      schemaVersion: 1,
      decisionId: id,
      packetId: packetValue.packetId,
      manifestItemId,
      rightsStatus: 'RESTRICTED',
      rightsReviewerId: editorialReviewerId,
      decidedOn: '2026-07-04',
      rightsHolder: 'Source Repository',
      basis: 'Repository terms restrict redistribution while permitting internal review.',
      reuseScope: 'NO_REUSE_APPROVED',
      permission: null,
      declarations: {
        noAutomaticStatusPromotion: true,
        noProductionUse: true,
        containsNoSecretsOrPersonalData: true,
        privateCorrespondenceStoredOutsideRepository: true,
      },
    },
  };
}

function completedRoles(packetValue) {
  return contract.reviewRoles.filter((role) => packetValue.review[role].status === 'COMPLETE');
}

function editorialDecision({
  packetValue,
  id = editorialDecisionId,
  finalDisposition = 'REJECT_EVIDENCE',
  manifestItemId = packetValue.manifestItemId,
  decidedOn = '2026-07-05',
  reviewerId = editorialReviewerId,
  basis = 'The evidence packet is rejected because the source claim remains insufficiently supported.',
  overrides = {},
} = {}) {
  return {
    path: `docs/content-intake/evidence/editorial/decisions/${id}.json`,
    value: {
      schemaVersion: 1,
      decisionId: id,
      packetId: packetValue.packetId,
      manifestItemId,
      finalDisposition,
      editorialReviewerId: reviewerId,
      decidedOn,
      manifestStatusObserved: packetValue.manifestStatusObserved,
      packetSubmissionStatusObserved: packetValue.submissionStatus,
      packetProposedDispositionObserved: packetValue.proposedDisposition,
      rightsStatusObserved: packetValue.rights.status,
      rightsDecisionIdObserved: packetValue.rights.decisionId,
      completedReviewRolesObserved: completedRoles(packetValue),
      basis,
      declarations: {
        contradictionBlockAcknowledged: true,
        noAutomaticManifestChange: true,
        noProductionApproval: true,
        noPublicationClaim: true,
      },
      ...overrides,
    },
  };
}

function validate({
  root = createRoot(),
  governanceDocument = editorialGovernance,
  reviewerDocument = reviewerGovernance,
  rightsDocument = rightsGovernance,
  manifestDocument = manifest,
  packets = [],
  rightsDecisions = [],
  editorialDecisions = [],
  today = '2026-07-29',
} = {}) {
  return validateSiddharEditorialDisposition({
    governanceDocument,
    reviewerGovernance: reviewerDocument,
    rightsGovernance: rightsDocument,
    manifest: manifestDocument,
    packetFiles: packets,
    rightsDecisionFiles: rightsDecisions,
    editorialDecisionFiles: editorialDecisions,
    repositoryRootPath: root,
    submissionContract: contract,
    today,
  });
}

afterEach(() => {
  for (const value of roots.splice(0)) {
    rmSync(value, { recursive: true, force: true });
  }
});

describe('Siddhar editorial disposition provenance', () => {
  it('passes the truthful zero-packet baseline without inventing decisions', () => {
    const result = validate();

    expect(result.ok).toBe(true);
    expect(result.manifestItemCount).toBe(2);
    expect(result.packetFileCount).toBe(0);
    expect(result.editorialDecisionFileCount).toBe(0);
    expect(result.validEditorialDecisionCount).toBe(0);
    expect(result.noPacketManifestItems).toBe(2);
    expect(result.productionEligibleItems).toBe(0);
    expect(result.publicationApprovals).toBe(0);
    expect(result.automaticManifestChanges).toBe(0);
  });

  it('accepts a controlled reject-evidence decision with unresolved rights', () => {
    const root = createRoot();
    const value = packet({ root, proposedDisposition: 'REJECT_EVIDENCE' });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(true);
    expect(result.validEditorialDecisionCount).toBe(1);
    expect(result.readinessCounts.REJECTED).toBe(1);
  });

  it('accepts a controlled hold decision with unresolved rights', () => {
    const root = createRoot();
    const value = packet({ root, proposedDisposition: 'HOLD_FOR_REVIEW' });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'HOLD_FOR_REVIEW',
          basis: 'The packet remains on hold while additional source context is obtained.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.readinessCounts.HOLD).toBe(1);
  });

  it('accepts non-production source-review readiness only after all reviews and authoritative rights', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      reviewMode: 'full',
      rights: restrictedRights(),
    });
    const rightsDecision = restrictedDecision({ packetValue: value });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [rightsDecision],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'All required reviews are complete and the restricted rights state permits internal source review only.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.nonProductionReadyManifestItems).toBe(1);
    expect(result.readinessCounts.NONPRODUCTION_READY).toBe(1);
    expect(result.productionEligibleItems).toBe(0);
    expect(result.publicationApprovals).toBe(0);
  });

  it('accepts correction-only handling for a contradicted manifest item without releasing it', () => {
    const root = createRoot();
    const value = packet({
      root,
      manifestItemId: 'SID-EV-002',
      manifestStatusObserved: 'CONTRADICTED_DO_NOT_PUBLISH',
      proposedDisposition: 'CORRECTION_EVIDENCE_ONLY',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'CORRECTION_EVIDENCE_ONLY',
          basis: 'The packet may be retained only as correction evidence; the contradicted attribution remains blocked.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.readinessCounts.CORRECTION_ONLY).toBe(1);
    expect(result.nonProductionReadyManifestItems).toBe(0);
  });

  it('keeps a contradicted item blocked when no editorial decision exists', () => {
    const root = createRoot();
    const value = packet({
      root,
      manifestItemId: 'SID-EV-002',
      manifestStatusObserved: 'CONTRADICTED_DO_NOT_PUBLISH',
      proposedDisposition: 'CORRECTION_EVIDENCE_ONLY',
    });
    const result = validate({ root, packets: [packetFile(value)] });

    expect(result.ok).toBe(true);
    expect(result.readinessCounts.BLOCKED_CONTRADICTION).toBe(1);
  });

  it('rejects release-candidate disposition for a contradicted item', () => {
    const root = createRoot();
    const value = packet({
      root,
      manifestItemId: 'SID-EV-002',
      manifestStatusObserved: 'CONTRADICTED_DO_NOT_PUBLISH',
      proposedDisposition: 'CORRECTION_EVIDENCE_ONLY',
      reviewMode: 'full',
      rights: restrictedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value, manifestItemId: 'SID-EV-002' })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'Attempted source-review disposition for contradicted content.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.contradictionBlockCount).toBeGreaterThan(0);
  });

  it('requires every review role for SOURCE_REVIEW_ONLY', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      rights: restrictedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'Attempted source-review disposition before all language reviews were complete.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.incompleteRequiredReviewCount).toBe(3);
  });

  it('requires authoritative rights for SOURCE_REVIEW_ONLY', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      reviewMode: 'full',
      rights: unresolvedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'Attempted source-review disposition while rights remained unresolved.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.rightsDispositionConflictCount).toBe(1);
  });

  it('requires the editorial decision reviewer to match the completed packet editorial reviewer', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          reviewerId: preparationReviewerId,
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'editorialReviewerId' }),
      ]),
    );
  });

  it('rejects inactive editorial decision reviewers', () => {
    const root = createRoot();
    const value = packet({ root });
    const reviewerDocument = {
      ...reviewerGovernance,
      reviewers: reviewerGovernance.reviewers.map((reviewer) =>
        reviewer.reviewerId === editorialReviewerId
          ? { ...reviewer, active: false }
          : reviewer,
      ),
    };
    const result = validate({
      root,
      reviewerDocument,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.unauthorisedEditorialReviewerCount).toBeGreaterThan(0);
  });

  it('rejects editorial decisions dated before packet submission', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value, decidedOn: '2026-06-30' }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decidedOn', message: 'must not predate packet submission' }),
    );
  });

  it('rejects editorial decisions dated before required reviews', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value, decidedOn: '2026-07-02' }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decidedOn', message: 'must not predate required EDITORIAL review' }),
    );
  });

  it('rejects future editorial decision dates', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value, decidedOn: '2026-07-30' }),
      ],
      today: '2026-07-29',
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decidedOn', message: 'must not be in the future' }),
    );
  });

  it('rejects editorial decision filenames that do not match their ID', () => {
    const root = createRoot();
    const value = packet({ root });
    const decision = editorialDecision({ packetValue: value });
    decision.path = 'docs/content-intake/evidence/editorial/decisions/wrong.json';
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [decision],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decisionId', message: expect.stringContaining('file path must be') }),
    );
  });

  it('rejects multiple current editorial decisions for one packet', () => {
    const root = createRoot();
    const value = packet({ root });
    const second = editorialDecision({
      packetValue: value,
      id: 'SID-ED-DEC-20260705-002',
      finalDisposition: 'HOLD_FOR_REVIEW',
      basis: 'A second current decision for the same packet is not permitted.',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value }),
        second,
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.duplicatePacketDecisionCount).toBe(1);
  });

  it('rejects duplicate editorial decision IDs', () => {
    const root = createRoot();
    const firstPacket = packet({ root });
    const secondPacket = packet({
      root,
      id: 'SID-SUB-20260701-002',
      sourceFile: writeSource(root, 'SID-SUB-20260701-002'),
    });
    const duplicate = editorialDecision({ packetValue: secondPacket });
    duplicate.path = 'docs/content-intake/evidence/editorial/decisions/duplicate.json';
    const result = validate({
      root,
      packets: [packetFile(firstPacket), packetFile(secondPacket)],
      editorialDecisions: [
        editorialDecision({ packetValue: firstPacket }),
        duplicate,
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decisionId', message: 'must be unique' }),
    );
  });

  it('rejects editorial decisions that reference missing packets', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.missingPacketReferenceCount).toBe(1);
  });

  it('rejects editorial decisions with a mismatched manifest item', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value, manifestItemId: 'SID-EV-002' }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'manifestItemId' }),
    );
  });

  it('rejects stale manifest-status snapshots', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { manifestStatusObserved: 'SUPPORTED_ASSOCIATION' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'manifestStatusObserved' }),
    );
  });

  it('rejects stale packet-status snapshots', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { packetSubmissionStatusObserved: 'DRAFT' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'packetSubmissionStatusObserved' }),
    );
  });

  it('rejects stale proposed-disposition snapshots', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { packetProposedDispositionObserved: 'HOLD_FOR_REVIEW' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'packetProposedDispositionObserved' }),
    );
  });

  it('rejects stale rights snapshots', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { rightsStatusObserved: 'RESTRICTED' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'rightsStatusObserved' }),
    );
  });

  it('rejects stale completed-review-role snapshots', () => {
    const root = createRoot();
    const value = packet({ root, reviewMode: 'full', rights: restrictedRights() });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          overrides: { completedReviewRolesObserved: ['EDITORIAL'] },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'completedReviewRolesObserved' }),
    );
  });

  it('rejects placeholder or trivial editorial basis text', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          basis: 'REPLACE_WITH_DECISION',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'basis' }),
    );
  });

  it('rejects authentication or publication-approval language in decision basis', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          basis: 'This item is authenticated and approved for publication based on the packet.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.forbiddenApprovalLanguageCount).toBe(1);
  });

  it('requires every protected editorial declaration to remain true', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: {
            declarations: {
              contradictionBlockAcknowledged: true,
              noAutomaticManifestChange: true,
              noProductionApproval: false,
              noPublicationClaim: true,
            },
          },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'noProductionApproval' }),
    );
  });

  it('rejects production or manifest-promotion fields in decision records', () => {
    const root = createRoot();
    const value = packet({ root });
    const decision = editorialDecision({ packetValue: value });
    decision.value.productionApproved = true;
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [decision],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'productionApproved' }),
    );
  });

  it('requires packets to be submitted for review before a decision is recorded', () => {
    const root = createRoot();
    const value = packet({ root, submissionStatus: 'DRAFT' });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        field: 'packetSubmissionStatusObserved',
        message: expect.stringContaining('SUBMITTED_FOR_REVIEW'),
      }),
    );
  });

  it('blocks editorial disposition when source evidence bytes are missing', () => {
    const root = createRoot();
    const file = {
      path: 'docs/content-intake/evidence/uploads/missing.pdf',
      sha256: sha256(sourcePdf),
      mimeType: 'application/pdf',
      sizeBytes: sourcePdf.length,
    };
    const value = packet({ root, sourceFile: file });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.sourceFileIntegrityOk).toBe(false);
    expect(result.upstream.sourceCoverageOk).toBe(false);
  });

  it('blocks editorial disposition when a normal source upload is orphaned', () => {
    const root = createRoot();
    const value = packet({ root });
    const orphan = join(root, 'docs/content-intake/evidence/uploads/orphan.pdf');
    mkdirSync(dirname(orphan), { recursive: true });
    writeFileSync(orphan, sourcePdf);
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.sourceCoverageOk).toBe(false);
  });

  it('blocks editorial disposition when reviewer separation of duties is violated', () => {
    const root = createRoot();
    const badReviews = reviews('full');
    badReviews.TRANSCRIPTION = {
      ...badReviews.TRANSCRIPTION,
      reviewer: editorialReviewerId,
    };
    const value = packet({
      root,
      reviewMode: 'full',
      reviewValue: badReviews,
      rights: restrictedRights(),
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.reviewerGovernanceOk).toBe(false);
  });

  it('blocks editorial disposition when authoritative rights provenance is invalid', () => {
    const root = createRoot();
    const value = packet({
      root,
      reviewMode: 'full',
      rights: restrictedRights(),
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.rightsProvenanceOk).toBe(false);
  });

  it('allows explicit UNASSIGNED in legitimate fail-closed not-applicable and unresolved states', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.upstream.submissionsOk).toBe(true);
    expect(result.upstream.reviewerGovernanceOk).toBe(true);
    expect(result.upstream.rightsProvenanceOk).toBe(true);
  });

  it('keeps readiness output deterministically sorted by manifest ID', () => {
    const reversed = { ...manifest, items: [...manifest.items].reverse() };
    const result = validate({ manifestDocument: reversed });

    expect(result.ok).toBe(true);
    expect(result.readinessByManifestItem.map((item) => item.manifestItemId)).toEqual([
      'SID-EV-001',
      'SID-EV-002',
    ]);
  });

  it('rejects manifest-level or item-level production eligibility', () => {
    const root = createRoot();
    const unsafeManifest = {
      ...manifest,
      productionEligible: true,
      items: manifest.items.map((item, index) =>
        index === 0 ? { ...item, productionEligible: true } : item,
      ),
    };
    const result = validate({ root, manifestDocument: unsafeManifest });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'productionEligible' }),
      ]),
    );
  });

  it('rejects malformed editorial decision JSON results', () => {
    const result = validate({
      editorialDecisions: [
        {
          path: 'docs/content-intake/evidence/editorial/decisions/bad.json',
          value: null,
          parseError: 'Unexpected token',
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.malformedDecisionCount).toBe(1);
  });

  it('rejects governance drift in canonical dispositions', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        finalDispositions: ['HOLD_FOR_REVIEW'],
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ field: 'finalDispositions' }),
    );
  });

  it('rejects governance that weakens SOURCE_REVIEW_ONLY review requirements', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        requiredReviewRolesByDisposition: {
          ...editorialGovernance.requiredReviewRolesByDisposition,
          SOURCE_REVIEW_ONLY: ['EDITORIAL'],
        },
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        field: 'requiredReviewRolesByDisposition.SOURCE_REVIEW_ONLY',
      }),
    );
  });

  it('rejects governance that weakens SOURCE_REVIEW_ONLY rights requirements', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        allowedRightsStatesByDisposition: {
          ...editorialGovernance.allowedRightsStatesByDisposition,
          SOURCE_REVIEW_ONLY: [
            'PERMISSION_GRANTED_REVIEWED',
            'RESTRICTED_REVIEWED',
            'UNRESOLVED',
          ],
        },
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        field: 'allowedRightsStatesByDisposition.SOURCE_REVIEW_ONLY',
      }),
    );
  });

  it('rejects governance that permits a release candidate for contradicted content', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        contradictedAllowedDispositions: [
          'CORRECTION_EVIDENCE_ONLY',
          'HOLD_FOR_REVIEW',
          'REJECT_EVIDENCE',
          'SOURCE_REVIEW_ONLY',
        ],
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ field: 'contradictedAllowedDispositions' }),
    );
  });

  it('never reports automatic manifest changes, production eligibility, or publication approvals', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      reviewMode: 'full',
      rights: restrictedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'All required reviews are complete for non-production source review only.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.automaticManifestChanges).toBe(0);
    expect(result.productionEligibleItems).toBe(0);
    expect(result.publicationApprovals).toBe(0);
  });
});
,
  noRightsDecisionFingerprint: 'NONE',
  finalDispositions: [
    'CORRECTION_EVIDENCE_ONLY',
    'HOLD_FOR_REVIEW',
    'REJECT_EVIDENCE',
    'SOURCE_REVIEW_ONLY',
  ],
  releaseCandidateDispositions: ['SOURCE_REVIEW_ONLY'],
  contradictedManifestStatus: 'CONTRADICTED_DO_NOT_PUBLISH',
  contradictedAllowedDispositions: [
    'CORRECTION_EVIDENCE_ONLY',
    'HOLD_FOR_REVIEW',
    'REJECT_EVIDENCE',
  ],
  requiredReviewRolesByDisposition: {
    CORRECTION_EVIDENCE_ONLY: ['EDITORIAL'],
    HOLD_FOR_REVIEW: ['EDITORIAL'],
    REJECT_EVIDENCE: ['EDITORIAL'],
    SOURCE_REVIEW_ONLY: ['EDITORIAL', 'TRANSCRIPTION', 'TRANSLATION', 'TRANSLITERATION'],
  },
  allowedRightsStatesByDisposition: {
    CORRECTION_EVIDENCE_ONLY: [
      'PERMISSION_GRANTED_REVIEWED',
      'PUBLIC_DOMAIN_UNVERIFIED',
      'RESTRICTED_REVIEWED',
      'UNRESOLVED',
    ],
    HOLD_FOR_REVIEW: [
      'PERMISSION_GRANTED_REVIEWED',
      'PUBLIC_DOMAIN_UNVERIFIED',
      'RESTRICTED_REVIEWED',
      'UNRESOLVED',
    ],
    REJECT_EVIDENCE: [
      'PERMISSION_GRANTED_REVIEWED',
      'PUBLIC_DOMAIN_UNVERIFIED',
      'RESTRICTED_REVIEWED',
      'UNRESOLVED',
    ],
    SOURCE_REVIEW_ONLY: ['PERMISSION_GRANTED_REVIEWED', 'RESTRICTED_REVIEWED'],
  },
  requiredPacketSubmissionStatus: 'SUBMITTED_FOR_REVIEW',
  requiredDeclarations: [
    'contradictionBlockAcknowledged',
    'noAutomaticManifestChange',
    'noProductionApproval',
    'noPublicationClaim',
  ],
  forbiddenDecisionFields: [
    'approvedEditorialStatus',
    'authenticatedStatus',
    'newManifestStatus',
    'productionApproved',
    'productionEligible',
    'productionStatus',
    'publishApproved',
    'releaseApproved',
  ],
};
const manifest = {
  schemaVersion: 1,
  productionEligible: false,
  items: [
    {
      id: 'SID-EV-001',
      siddhar: 'Agastiyar',
      itemTitle: 'Reviewed source witness',
      priority: 'P0',
      status: 'UNRESOLVED',
      productionEligible: false,
    },
    {
      id: 'SID-EV-002',
      siddhar: 'Karuvoorar',
      itemTitle: 'Contradicted attribution',
      priority: 'P0',
      status: 'CONTRADICTED_DO_NOT_PUBLISH',
      productionEligible: false,
    },
  ],
};
const packetId = 'SID-SUB-20260701-001';
const rightsDecisionId = 'SID-RGT-DEC-20260704-001';
const editorialDecisionId = 'SID-ED-DEC-20260705-001';

function createRoot() {
  const value = mkdtempSync(join(tmpdir(), 'siddhar-editorial-disposition-'));
  roots.push(value);
  return value;
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function writeSource(root, id = packetId) {
  const path = `docs/content-intake/evidence/uploads/source-${id}.pdf`;
  const absolute = join(root, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, sourcePdf);
  return { path, sha256: sha256(sourcePdf), mimeType: 'application/pdf', sizeBytes: sourcePdf.length };
}

function review(status, reviewer, reviewedOn, notes) {
  return { status, reviewer, reviewedOn, notes };
}

function reviews(mode = 'editorial-only') {
  const result = {
    EDITORIAL: review(
      'COMPLETE',
      editorialReviewerId,
      '2026-07-03',
      'Editorial review completed against the submitted source packet.',
    ),
    TRANSCRIPTION: review(
      'NOT_APPLICABLE',
      'UNASSIGNED',
      null,
      'Not required for this non-release disposition.',
    ),
    TRANSLATION: review(
      'NOT_APPLICABLE',
      'UNASSIGNED',
      null,
      'Not required for this non-release disposition.',
    ),
    TRANSLITERATION: review(
      'NOT_APPLICABLE',
      'UNASSIGNED',
      null,
      'Not required for this non-release disposition.',
    ),
  };
  if (mode === 'full') {
    for (const role of ['TRANSCRIPTION', 'TRANSLATION', 'TRANSLITERATION']) {
      result[role] = review(
        'COMPLETE',
        preparationReviewerId,
        '2026-07-03',
        `${role} review completed against the submitted evidence.`,
      );
    }
  }
  return result;
}

function unresolvedRights() {
  return {
    status: 'UNRESOLVED',
    rightsHolder: 'UNRESOLVED',
    basis: 'UNRESOLVED',
    permissionReference: 'UNRESOLVED',
    reuseScope: 'NO_REUSE_APPROVED',
    decisionId: 'UNRESOLVED',
    decisionRecordPath: 'UNRESOLVED',
    rightsReviewerId: 'UNASSIGNED',
    decidedOn: null,
  };
}

function restrictedRights() {
  return {
    status: 'RESTRICTED',
    rightsHolder: 'Source Repository',
    basis: 'Repository terms restrict redistribution while permitting internal review.',
    permissionReference: rightsDecisionId,
    reuseScope: 'NO_REUSE_APPROVED',
    decisionId: rightsDecisionId,
    decisionRecordPath: `docs/content-intake/evidence/rights/decisions/${rightsDecisionId}.json`,
    rightsReviewerId: editorialReviewerId,
    decidedOn: '2026-07-04',
  };
}

function packet({
  root,
  manifestItemId = 'SID-EV-001',
  manifestStatusObserved = 'UNRESOLVED',
  proposedDisposition = 'REJECT_EVIDENCE',
  reviewMode = 'editorial-only',
  rights = unresolvedRights(),
  id = packetId,
  submittedOn = '2026-07-01',
  sourceFile = null,
  submissionStatus = 'SUBMITTED_FOR_REVIEW',
  reviewValue = null,
  productionEligible = false,
} = {}) {
  const file = sourceFile ?? writeSource(root, id);
  return {
    schemaVersion: 1,
    packetId: id,
    manifestItemId,
    manifestStatusObserved,
    submissionStatus,
    submittedOn,
    productionEligible,
    source: {
      type: 'PRIMARY_SOURCE_IMAGE',
      repository: 'Documented Repository',
      recordId: 'REC-001',
      title: 'Documented source witness',
      author: 'Documented Author',
      editor: 'Documented Editor',
      publisher: 'Documented Publisher',
      edition: 'Documented Edition',
      publicationYear: '1900',
      language: 'Tamil',
      script: 'Tamil',
      officialUrl: 'https://example.org/source-record',
      accessedOn: '2026-07-01',
    },
    locator: {
      bundleNumber: '',
      workNumber: '',
      accessionNumber: 'ACC-001',
      folioOrPage: 'p. 1',
      verseOrLine: 'line 1',
      adjacentContextIncluded: true,
    },
    files: [file],
    review: reviewValue ?? reviews(reviewMode),
    rights,
    proposedDisposition,
    declarations: {
      noAutomaticStatusPromotion: true,
      noProductionUse: true,
      noMedicalUse: true,
      containsNoSecretsOrPersonalData: true,
    },
    notes: 'Controlled non-production evidence packet for editorial review.',
  };
}

function packetFile(value) {
  return {
    path: `docs/content-intake/evidence/submissions/${value.packetId}.json`,
    value,
  };
}

function restrictedDecision({
  packetValue,
  manifestItemId = packetValue.manifestItemId,
  id = rightsDecisionId,
} = {}) {
  return {
    path: `docs/content-intake/evidence/rights/decisions/${id}.json`,
    value: {
      schemaVersion: 1,
      decisionId: id,
      packetId: packetValue.packetId,
      manifestItemId,
      rightsStatus: 'RESTRICTED',
      rightsReviewerId: editorialReviewerId,
      decidedOn: '2026-07-04',
      rightsHolder: 'Source Repository',
      basis: 'Repository terms restrict redistribution while permitting internal review.',
      reuseScope: 'NO_REUSE_APPROVED',
      permission: null,
      declarations: {
        noAutomaticStatusPromotion: true,
        noProductionUse: true,
        containsNoSecretsOrPersonalData: true,
        privateCorrespondenceStoredOutsideRepository: true,
      },
    },
  };
}

function completedRoles(packetValue) {
  return contract.reviewRoles.filter((role) => packetValue.review[role].status === 'COMPLETE');
}

function editorialDecision({
  packetValue,
  id = editorialDecisionId,
  finalDisposition = 'REJECT_EVIDENCE',
  manifestItemId = packetValue.manifestItemId,
  decidedOn = '2026-07-05',
  reviewerId = editorialReviewerId,
  basis = 'The evidence packet is rejected because the source claim remains insufficiently supported.',
  overrides = {},
} = {}) {
  return {
    path: `docs/content-intake/evidence/editorial/decisions/${id}.json`,
    value: {
      schemaVersion: 1,
      decisionId: id,
      packetId: packetValue.packetId,
      manifestItemId,
      finalDisposition,
      editorialReviewerId: reviewerId,
      decidedOn,
      manifestStatusObserved: packetValue.manifestStatusObserved,
      packetSubmissionStatusObserved: packetValue.submissionStatus,
      packetProposedDispositionObserved: packetValue.proposedDisposition,
      rightsStatusObserved: packetValue.rights.status,
      rightsDecisionIdObserved: packetValue.rights.decisionId,
      completedReviewRolesObserved: completedRoles(packetValue),
      basis,
      declarations: {
        contradictionBlockAcknowledged: true,
        noAutomaticManifestChange: true,
        noProductionApproval: true,
        noPublicationClaim: true,
      },
      ...overrides,
    },
  };
}

function validate({
  root = createRoot(),
  governanceDocument = editorialGovernance,
  reviewerDocument = reviewerGovernance,
  rightsDocument = rightsGovernance,
  manifestDocument = manifest,
  packets = [],
  rightsDecisions = [],
  editorialDecisions = [],
  today = '2026-07-29',
} = {}) {
  return validateSiddharEditorialDisposition({
    governanceDocument,
    reviewerGovernance: reviewerDocument,
    rightsGovernance: rightsDocument,
    manifest: manifestDocument,
    packetFiles: packets,
    rightsDecisionFiles: rightsDecisions,
    editorialDecisionFiles: editorialDecisions,
    repositoryRootPath: root,
    submissionContract: contract,
    today,
  });
}

afterEach(() => {
  for (const value of roots.splice(0)) {
    rmSync(value, { recursive: true, force: true });
  }
});

describe('Siddhar editorial disposition provenance', () => {
  it('passes the truthful zero-packet baseline without inventing decisions', () => {
    const result = validate();

    expect(result.ok).toBe(true);
    expect(result.manifestItemCount).toBe(2);
    expect(result.packetFileCount).toBe(0);
    expect(result.editorialDecisionFileCount).toBe(0);
    expect(result.validEditorialDecisionCount).toBe(0);
    expect(result.noPacketManifestItems).toBe(2);
    expect(result.productionEligibleItems).toBe(0);
    expect(result.publicationApprovals).toBe(0);
    expect(result.automaticManifestChanges).toBe(0);
  });

  it('accepts a controlled reject-evidence decision with unresolved rights', () => {
    const root = createRoot();
    const value = packet({ root, proposedDisposition: 'REJECT_EVIDENCE' });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(true);
    expect(result.validEditorialDecisionCount).toBe(1);
    expect(result.readinessCounts.REJECTED).toBe(1);
  });

  it('accepts a controlled hold decision with unresolved rights', () => {
    const root = createRoot();
    const value = packet({ root, proposedDisposition: 'HOLD_FOR_REVIEW' });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'HOLD_FOR_REVIEW',
          basis: 'The packet remains on hold while additional source context is obtained.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.readinessCounts.HOLD).toBe(1);
  });

  it('accepts non-production source-review readiness only after all reviews and authoritative rights', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      reviewMode: 'full',
      rights: restrictedRights(),
    });
    const rightsDecision = restrictedDecision({ packetValue: value });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [rightsDecision],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'All required reviews are complete and the restricted rights state permits internal source review only.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.nonProductionReadyManifestItems).toBe(1);
    expect(result.readinessCounts.NONPRODUCTION_READY).toBe(1);
    expect(result.productionEligibleItems).toBe(0);
    expect(result.publicationApprovals).toBe(0);
  });

  it('accepts correction-only handling for a contradicted manifest item without releasing it', () => {
    const root = createRoot();
    const value = packet({
      root,
      manifestItemId: 'SID-EV-002',
      manifestStatusObserved: 'CONTRADICTED_DO_NOT_PUBLISH',
      proposedDisposition: 'CORRECTION_EVIDENCE_ONLY',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'CORRECTION_EVIDENCE_ONLY',
          basis: 'The packet may be retained only as correction evidence; the contradicted attribution remains blocked.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.readinessCounts.CORRECTION_ONLY).toBe(1);
    expect(result.nonProductionReadyManifestItems).toBe(0);
  });

  it('keeps a contradicted item blocked when no editorial decision exists', () => {
    const root = createRoot();
    const value = packet({
      root,
      manifestItemId: 'SID-EV-002',
      manifestStatusObserved: 'CONTRADICTED_DO_NOT_PUBLISH',
      proposedDisposition: 'CORRECTION_EVIDENCE_ONLY',
    });
    const result = validate({ root, packets: [packetFile(value)] });

    expect(result.ok).toBe(true);
    expect(result.readinessCounts.BLOCKED_CONTRADICTION).toBe(1);
  });

  it('rejects release-candidate disposition for a contradicted item', () => {
    const root = createRoot();
    const value = packet({
      root,
      manifestItemId: 'SID-EV-002',
      manifestStatusObserved: 'CONTRADICTED_DO_NOT_PUBLISH',
      proposedDisposition: 'CORRECTION_EVIDENCE_ONLY',
      reviewMode: 'full',
      rights: restrictedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value, manifestItemId: 'SID-EV-002' })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'Attempted source-review disposition for contradicted content.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.contradictionBlockCount).toBeGreaterThan(0);
  });

  it('requires every review role for SOURCE_REVIEW_ONLY', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      rights: restrictedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'Attempted source-review disposition before all language reviews were complete.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.incompleteRequiredReviewCount).toBe(3);
  });

  it('requires authoritative rights for SOURCE_REVIEW_ONLY', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      reviewMode: 'full',
      rights: unresolvedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'Attempted source-review disposition while rights remained unresolved.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.rightsDispositionConflictCount).toBe(1);
  });

  it('requires the editorial decision reviewer to match the completed packet editorial reviewer', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          reviewerId: preparationReviewerId,
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'editorialReviewerId' }),
      ]),
    );
  });

  it('rejects inactive editorial decision reviewers', () => {
    const root = createRoot();
    const value = packet({ root });
    const reviewerDocument = {
      ...reviewerGovernance,
      reviewers: reviewerGovernance.reviewers.map((reviewer) =>
        reviewer.reviewerId === editorialReviewerId
          ? { ...reviewer, active: false }
          : reviewer,
      ),
    };
    const result = validate({
      root,
      reviewerDocument,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.unauthorisedEditorialReviewerCount).toBeGreaterThan(0);
  });

  it('rejects editorial decisions dated before packet submission', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value, decidedOn: '2026-06-30' }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decidedOn', message: 'must not predate packet submission' }),
    );
  });

  it('rejects editorial decisions dated before required reviews', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value, decidedOn: '2026-07-02' }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decidedOn', message: 'must not predate required EDITORIAL review' }),
    );
  });

  it('rejects future editorial decision dates', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value, decidedOn: '2026-07-30' }),
      ],
      today: '2026-07-29',
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decidedOn', message: 'must not be in the future' }),
    );
  });

  it('rejects editorial decision filenames that do not match their ID', () => {
    const root = createRoot();
    const value = packet({ root });
    const decision = editorialDecision({ packetValue: value });
    decision.path = 'docs/content-intake/evidence/editorial/decisions/wrong.json';
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [decision],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decisionId', message: expect.stringContaining('file path must be') }),
    );
  });

  it('rejects multiple current editorial decisions for one packet', () => {
    const root = createRoot();
    const value = packet({ root });
    const second = editorialDecision({
      packetValue: value,
      id: 'SID-ED-DEC-20260705-002',
      finalDisposition: 'HOLD_FOR_REVIEW',
      basis: 'A second current decision for the same packet is not permitted.',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value }),
        second,
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.duplicatePacketDecisionCount).toBe(1);
  });

  it('rejects duplicate editorial decision IDs', () => {
    const root = createRoot();
    const firstPacket = packet({ root });
    const secondPacket = packet({
      root,
      id: 'SID-SUB-20260701-002',
      sourceFile: writeSource(root, 'SID-SUB-20260701-002'),
    });
    const duplicate = editorialDecision({ packetValue: secondPacket });
    duplicate.path = 'docs/content-intake/evidence/editorial/decisions/duplicate.json';
    const result = validate({
      root,
      packets: [packetFile(firstPacket), packetFile(secondPacket)],
      editorialDecisions: [
        editorialDecision({ packetValue: firstPacket }),
        duplicate,
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decisionId', message: 'must be unique' }),
    );
  });

  it('rejects editorial decisions that reference missing packets', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.missingPacketReferenceCount).toBe(1);
  });

  it('rejects editorial decisions with a mismatched manifest item', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({ packetValue: value, manifestItemId: 'SID-EV-002' }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'manifestItemId' }),
    );
  });

  it('rejects stale manifest-status snapshots', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { manifestStatusObserved: 'SUPPORTED_ASSOCIATION' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'manifestStatusObserved' }),
    );
  });

  it('rejects stale packet-status snapshots', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { packetSubmissionStatusObserved: 'DRAFT' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'packetSubmissionStatusObserved' }),
    );
  });

  it('rejects stale proposed-disposition snapshots', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { packetProposedDispositionObserved: 'HOLD_FOR_REVIEW' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'packetProposedDispositionObserved' }),
    );
  });

  it('rejects stale rights snapshots', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: { rightsStatusObserved: 'RESTRICTED' },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'rightsStatusObserved' }),
    );
  });

  it('rejects stale completed-review-role snapshots', () => {
    const root = createRoot();
    const value = packet({ root, reviewMode: 'full', rights: restrictedRights() });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          overrides: { completedReviewRolesObserved: ['EDITORIAL'] },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'completedReviewRolesObserved' }),
    );
  });

  it('rejects placeholder or trivial editorial basis text', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          basis: 'REPLACE_WITH_DECISION',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'basis' }),
    );
  });

  it('rejects authentication or publication-approval language in decision basis', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          basis: 'This item is authenticated and approved for publication based on the packet.',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.forbiddenApprovalLanguageCount).toBe(1);
  });

  it('requires every protected editorial declaration to remain true', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          overrides: {
            declarations: {
              contradictionBlockAcknowledged: true,
              noAutomaticManifestChange: true,
              noProductionApproval: false,
              noPublicationClaim: true,
            },
          },
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'noProductionApproval' }),
    );
  });

  it('rejects production or manifest-promotion fields in decision records', () => {
    const root = createRoot();
    const value = packet({ root });
    const decision = editorialDecision({ packetValue: value });
    decision.value.productionApproved = true;
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [decision],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'productionApproved' }),
    );
  });

  it('requires packets to be submitted for review before a decision is recorded', () => {
    const root = createRoot();
    const value = packet({ root, submissionStatus: 'DRAFT' });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        field: 'packetSubmissionStatusObserved',
        message: expect.stringContaining('SUBMITTED_FOR_REVIEW'),
      }),
    );
  });

  it('blocks editorial disposition when source evidence bytes are missing', () => {
    const root = createRoot();
    const file = {
      path: 'docs/content-intake/evidence/uploads/missing.pdf',
      sha256: sha256(sourcePdf),
      mimeType: 'application/pdf',
      sizeBytes: sourcePdf.length,
    };
    const value = packet({ root, sourceFile: file });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.sourceFileIntegrityOk).toBe(false);
    expect(result.upstream.sourceCoverageOk).toBe(false);
  });

  it('blocks editorial disposition when a normal source upload is orphaned', () => {
    const root = createRoot();
    const value = packet({ root });
    const orphan = join(root, 'docs/content-intake/evidence/uploads/orphan.pdf');
    mkdirSync(dirname(orphan), { recursive: true });
    writeFileSync(orphan, sourcePdf);
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.sourceCoverageOk).toBe(false);
  });

  it('blocks editorial disposition when reviewer separation of duties is violated', () => {
    const root = createRoot();
    const badReviews = reviews('full');
    badReviews.TRANSCRIPTION = {
      ...badReviews.TRANSCRIPTION,
      reviewer: editorialReviewerId,
    };
    const value = packet({
      root,
      reviewMode: 'full',
      reviewValue: badReviews,
      rights: restrictedRights(),
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.reviewerGovernanceOk).toBe(false);
  });

  it('blocks editorial disposition when authoritative rights provenance is invalid', () => {
    const root = createRoot();
    const value = packet({
      root,
      reviewMode: 'full',
      rights: restrictedRights(),
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.upstream.rightsProvenanceOk).toBe(false);
  });

  it('allows explicit UNASSIGNED in legitimate fail-closed not-applicable and unresolved states', () => {
    const root = createRoot();
    const value = packet({ root });
    const result = validate({
      root,
      packets: [packetFile(value)],
      editorialDecisions: [editorialDecision({ packetValue: value })],
    });

    expect(result.upstream.submissionsOk).toBe(true);
    expect(result.upstream.reviewerGovernanceOk).toBe(true);
    expect(result.upstream.rightsProvenanceOk).toBe(true);
  });

  it('keeps readiness output deterministically sorted by manifest ID', () => {
    const reversed = { ...manifest, items: [...manifest.items].reverse() };
    const result = validate({ manifestDocument: reversed });

    expect(result.ok).toBe(true);
    expect(result.readinessByManifestItem.map((item) => item.manifestItemId)).toEqual([
      'SID-EV-001',
      'SID-EV-002',
    ]);
  });

  it('rejects manifest-level or item-level production eligibility', () => {
    const root = createRoot();
    const unsafeManifest = {
      ...manifest,
      productionEligible: true,
      items: manifest.items.map((item, index) =>
        index === 0 ? { ...item, productionEligible: true } : item,
      ),
    };
    const result = validate({ root, manifestDocument: unsafeManifest });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'productionEligible' }),
      ]),
    );
  });

  it('rejects malformed editorial decision JSON results', () => {
    const result = validate({
      editorialDecisions: [
        {
          path: 'docs/content-intake/evidence/editorial/decisions/bad.json',
          value: null,
          parseError: 'Unexpected token',
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.malformedDecisionCount).toBe(1);
  });

  it('rejects governance drift in canonical dispositions', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        finalDispositions: ['HOLD_FOR_REVIEW'],
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ field: 'finalDispositions' }),
    );
  });

  it('rejects governance that weakens SOURCE_REVIEW_ONLY review requirements', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        requiredReviewRolesByDisposition: {
          ...editorialGovernance.requiredReviewRolesByDisposition,
          SOURCE_REVIEW_ONLY: ['EDITORIAL'],
        },
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        field: 'requiredReviewRolesByDisposition.SOURCE_REVIEW_ONLY',
      }),
    );
  });

  it('rejects governance that weakens SOURCE_REVIEW_ONLY rights requirements', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        allowedRightsStatesByDisposition: {
          ...editorialGovernance.allowedRightsStatesByDisposition,
          SOURCE_REVIEW_ONLY: [
            'PERMISSION_GRANTED_REVIEWED',
            'RESTRICTED_REVIEWED',
            'UNRESOLVED',
          ],
        },
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        field: 'allowedRightsStatesByDisposition.SOURCE_REVIEW_ONLY',
      }),
    );
  });

  it('rejects governance that permits a release candidate for contradicted content', () => {
    const issues = [];
    parseSiddharEditorialDispositionGovernance({
      document: {
        ...editorialGovernance,
        contradictedAllowedDispositions: [
          'CORRECTION_EVIDENCE_ONLY',
          'HOLD_FOR_REVIEW',
          'REJECT_EVIDENCE',
          'SOURCE_REVIEW_ONLY',
        ],
      },
      reviewerGovernance,
      submissionContract: contract,
      issues,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ field: 'contradictedAllowedDispositions' }),
    );
  });

  it('never reports automatic manifest changes, production eligibility, or publication approvals', () => {
    const root = createRoot();
    const value = packet({
      root,
      proposedDisposition: 'SOURCE_REVIEW_ONLY',
      reviewMode: 'full',
      rights: restrictedRights(),
    });
    const result = validate({
      root,
      packets: [packetFile(value)],
      rightsDecisions: [restrictedDecision({ packetValue: value })],
      editorialDecisions: [
        editorialDecision({
          packetValue: value,
          finalDisposition: 'SOURCE_REVIEW_ONLY',
          basis: 'All required reviews are complete for non-production source review only.',
        }),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.automaticManifestChanges).toBe(0);
    expect(result.productionEligibleItems).toBe(0);
    expect(result.publicationApprovals).toBe(0);
  });
});
