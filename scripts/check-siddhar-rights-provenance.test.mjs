import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateSiddharRightsProvenance } from './check-siddhar-rights-provenance.mjs';

const temporaryRoots = [];
const submissionContract = {
  schemaVersion: 1,
  rightsStatuses: [
    'PERMISSION_GRANTED',
    'PUBLIC_DOMAIN_CLAIM_UNVERIFIED',
    'RESTRICTED',
    'UNRESOLVED',
  ],
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'],
  allowedFileExtensions: ['.jpeg', '.jpg', '.pdf', '.png', '.tif', '.tiff'],
  maxFileSizeBytes: 1024 * 1024,
};
const manifest = {
  schemaVersion: 1,
  items: [
    {
      id: 'SID-EV-001',
      siddhar: 'Agastiyar',
      itemTitle: 'Catalogue record',
      priority: 'P0',
      status: 'UNRESOLVED',
    },
    {
      id: 'SID-EV-002',
      siddhar: 'Bogar',
      itemTitle: 'Work witness',
      priority: 'P0',
      status: 'WORK_CATALOGUE_VERIFIED',
    },
  ],
};
const reviewerId = 'SID-REV-RIGHTS1';
const reviewerGovernance = {
  schemaVersion: 1,
  reviewerIdPattern: '^SID-REV-[A-Z0-9]{6,24}$',
  reviewers: [
    {
      reviewerId,
      active: true,
      conflictOfInterestDeclared: true,
      approvedRoles: ['EDITORIAL'],
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
  authorisedReviewerIds: [reviewerId],
  forbiddenBroadAssertions: [
    'ALL ANCIENT TEXTS ARE PUBLIC DOMAIN',
    'COPYRIGHT FREE',
    'FREE TO USE',
    'NO COPYRIGHT',
    'PUBLIC DOMAIN WORLDWIDE',
    'ROYALTY FREE',
  ],
};
const decisionId = 'SID-RGT-DEC-20260702-001';
const permissionId = 'SID-RGT-PERM-20260701-001';
const packetId = 'SID-SUB-20260701-001';
const decisionPath = `docs/content-intake/evidence/rights/decisions/${decisionId}.json`;
const permissionPath = `docs/content-intake/evidence/uploads/rights/${permissionId}.pdf`;
const pdfBytes = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');

function createRoot() {
  const root = mkdtempSync(join(tmpdir(), 'siddhar-rights-provenance-'));
  temporaryRoots.push(root);
  return root;
}

function writeEvidence(root, path, content = pdfBytes) {
  const absolutePath = join(root, path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
  return absolutePath;
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function permission(overrides = {}) {
  return {
    recordId: permissionId,
    evidencePath: permissionPath,
    sha256: sha256(pdfBytes),
    mimeType: 'application/pdf',
    sizeBytes: pdfBytes.length,
    effectiveOn: '2026-07-01',
    expiresOn: null,
    scopeStatement: 'Display the supplied page image on the reviewed Siddhar record.',
    ...overrides,
  };
}

function decision(overrides = {}) {
  return {
    schemaVersion: 1,
    decisionId,
    packetId,
    manifestItemId: 'SID-EV-001',
    rightsStatus: 'PERMISSION_GRANTED',
    rightsReviewerId: reviewerId,
    decidedOn: '2026-07-02',
    rightsHolder: 'Documented Rights Holder',
    basis: 'Written item-level permission for the identified source image.',
    reuseScope: 'DISPLAY_ONLY',
    permission: permission(),
    declarations: {
      noAutomaticStatusPromotion: true,
      noProductionUse: true,
      containsNoSecretsOrPersonalData: true,
      privateCorrespondenceStoredOutsideRepository: true,
    },
    ...overrides,
  };
}

function packet(overrides = {}) {
  const baseDecision = decision();
  return {
    packetId,
    manifestItemId: 'SID-EV-001',
    submittedOn: '2026-07-01',
    productionEligible: false,
    rights: {
      status: baseDecision.rightsStatus,
      rightsHolder: baseDecision.rightsHolder,
      basis: baseDecision.basis,
      permissionReference: permissionId,
      reuseScope: baseDecision.reuseScope,
      decisionId,
      decisionRecordPath: decisionPath,
      rightsReviewerId: reviewerId,
      decidedOn: baseDecision.decidedOn,
    },
    ...overrides,
  };
}

function packetFile(value = packet(), path = `docs/content-intake/evidence/submissions/${packetId}.json`) {
  return { path, value };
}

function decisionFile(value = decision(), path = decisionPath) {
  return { path, value };
}

function validate({
  root = createRoot(),
  governance = rightsGovernance,
  reviewers = reviewerGovernance,
  manifestValue = manifest,
  packets = [],
  decisions = [],
  today = '2026-07-29',
} = {}) {
  return validateSiddharRightsProvenance({
    rightsGovernance: governance,
    reviewerGovernance: reviewers,
    manifest: manifestValue,
    packetFiles: packets,
    decisionFiles: decisions,
    repositoryRootPath: root,
    submissionContract,
    today,
  });
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Siddhar rights decision provenance', () => {
  it('passes safely with zero packets, decisions, reviewers authorised, or permission files', () => {
    const result = validate({
      governance: { ...rightsGovernance, authorisedReviewerIds: [] },
      reviewers: { ...reviewerGovernance, reviewers: [] },
    });

    expect(result.ok).toBe(true);
    expect(result.manifestItemCount).toBe(2);
    expect(result.authorisedRightsReviewerCount).toBe(0);
    expect(result.validDecisionCount).toBe(0);
    expect(result.permissionEvidenceFileCount).toBe(0);
    expect(result.automaticStatusChanges).toBe(0);
    expect(result.productionEligibleItems).toBe(0);
    expect(result.rightsCoverageByManifestItem.map((item) => item.rightsState)).toEqual([
      'NO_PACKET',
      'NO_PACKET',
    ]);
  });

  it('accepts one fully linked permission-granted decision and verifies its bytes', () => {
    const root = createRoot();
    writeEvidence(root, permissionPath);
    const result = validate({
      root,
      packets: [packetFile()],
      decisions: [decisionFile()],
    });

    expect(result.ok).toBe(true);
    expect(result.permissionGrantedDecisionCount).toBe(1);
    expect(result.permissionEvidenceFileCount).toBe(1);
    expect(result.reviewedManifestItems).toBe(1);
    expect(result.rightsCoverageByManifestItem[0].rightsState).toBe(
      'PERMISSION_GRANTED_REVIEWED',
    );
  });

  it('accepts a linked restricted decision without permission evidence', () => {
    const restrictedDecision = decision({
      rightsStatus: 'RESTRICTED',
      reuseScope: 'NO_REUSE_APPROVED',
      permission: null,
      basis: 'Repository terms prohibit redistribution of the source image.',
    });
    const restrictedPacket = packet({
      rights: {
        status: 'RESTRICTED',
        rightsHolder: restrictedDecision.rightsHolder,
        basis: restrictedDecision.basis,
        permissionReference: decisionId,
        reuseScope: 'NO_REUSE_APPROVED',
        decisionId,
        decisionRecordPath: decisionPath,
        rightsReviewerId: reviewerId,
        decidedOn: restrictedDecision.decidedOn,
      },
    });
    const result = validate({
      packets: [packetFile(restrictedPacket)],
      decisions: [decisionFile(restrictedDecision)],
    });

    expect(result.ok).toBe(true);
    expect(result.restrictedDecisionCount).toBe(1);
    expect(result.permissionEvidenceFileCount).toBe(0);
    expect(result.rightsCoverageByManifestItem[0].rightsState).toBe('RESTRICTED_REVIEWED');
  });

  it('keeps unresolved packet rights non-production without a decision record', () => {
    const unresolved = packet({
      rights: {
        status: 'UNRESOLVED',
        rightsHolder: 'UNRESOLVED',
        basis: 'UNRESOLVED',
        permissionReference: 'UNRESOLVED',
        reuseScope: 'NO_REUSE_APPROVED',
        decisionId: 'UNRESOLVED',
        decisionRecordPath: 'UNRESOLVED',
        rightsReviewerId: 'UNASSIGNED',
        decidedOn: null,
      },
    });
    const result = validate({ packets: [packetFile(unresolved)] });

    expect(result.ok).toBe(true);
    expect(result.packetRightsStatusCounts.UNRESOLVED).toBe(1);
    expect(result.rightsCoverageByManifestItem[0].rightsState).toBe('UNRESOLVED');
  });

  it('keeps unverified public-domain claims at no-reuse and non-production', () => {
    const unverified = packet({
      rights: {
        status: 'PUBLIC_DOMAIN_CLAIM_UNVERIFIED',
        rightsHolder: 'Historical authorship requires review',
        basis: 'Age alone has not been accepted as a rights conclusion.',
        permissionReference: 'UNRESOLVED',
        reuseScope: 'NO_REUSE_APPROVED',
        decisionId: 'UNRESOLVED',
        decisionRecordPath: 'UNRESOLVED',
        rightsReviewerId: 'UNASSIGNED',
        decidedOn: null,
      },
    });
    const result = validate({ packets: [packetFile(unverified)] });

    expect(result.ok).toBe(true);
    expect(result.rightsCoverageByManifestItem[0].rightsState).toBe(
      'PUBLIC_DOMAIN_UNVERIFIED',
    );
  });

  it('rejects non-authoritative rights that attempt a decision or reuse scope', () => {
    const unsafe = packet({
      rights: {
        status: 'UNRESOLVED',
        rightsHolder: 'UNRESOLVED',
        basis: 'UNRESOLVED',
        permissionReference: permissionId,
        reuseScope: 'DISPLAY_ONLY',
        decisionId,
        decisionRecordPath: decisionPath,
        rightsReviewerId: reviewerId,
        decidedOn: '2026-07-02',
      },
    });
    const result = validate({ packets: [packetFile(unsafe)] });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'reuseScope' }),
        expect.objectContaining({ field: 'decisionId' }),
        expect.objectContaining({ field: 'rightsReviewerId' }),
      ]),
    );
  });

  it('rejects permission-granted decisions without permission objects', () => {
    const result = validate({
      packets: [packetFile()],
      decisions: [decisionFile(decision({ permission: null }))],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'permission', message: 'PERMISSION_GRANTED requires a permission object' }),
    );
  });

  it('rejects restricted decisions that contain permission evidence', () => {
    const restricted = decision({ rightsStatus: 'RESTRICTED', reuseScope: 'NO_REUSE_APPROVED' });
    const result = validate({ decisions: [decisionFile(restricted)] });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'permission', message: 'RESTRICTED decisions must set permission to null' }),
    );
  });

  it('rejects unknown or unauthorised rights reviewers', () => {
    const root = createRoot();
    writeEvidence(root, permissionPath);
    const result = validate({
      root,
      governance: { ...rightsGovernance, authorisedReviewerIds: [] },
      packets: [packetFile()],
      decisions: [decisionFile()],
    });

    expect(result.ok).toBe(false);
    expect(result.unauthorisedRightsReviewerCount).toBeGreaterThanOrEqual(2);
  });

  it('rejects inactive, conflict-uncleared, or non-editorial authorised reviewers', () => {
    const reviewers = {
      ...reviewerGovernance,
      reviewers: [
        {
          reviewerId,
          active: false,
          conflictOfInterestDeclared: false,
          approvedRoles: ['TRANSCRIPTION'],
        },
      ],
    };
    const result = validate({ reviewers });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        field: 'authorisedReviewerIds',
        message: expect.stringContaining('active, conflict-cleared'),
      }),
    );
  });

  it('rejects forbidden broad rights assertions', () => {
    const result = validate({
      decisions: [decisionFile(decision({ basis: 'All ancient texts are public domain.' }))],
    });

    expect(result.ok).toBe(false);
    expect(result.broadAssertionFindingCount).toBeGreaterThan(0);
  });

  it('does not treat an explicit negation of a broad assertion as a grant', () => {
    const unresolved = packet({
      rights: {
        status: 'PUBLIC_DOMAIN_CLAIM_UNVERIFIED',
        rightsHolder: 'Historical authorship requires review',
        basis: 'This review states NOT FREE TO USE without further evidence.',
        permissionReference: 'UNRESOLVED',
        reuseScope: 'NO_REUSE_APPROVED',
        decisionId: 'UNRESOLVED',
        decisionRecordPath: 'UNRESOLVED',
        rightsReviewerId: 'UNASSIGNED',
        decidedOn: null,
      },
    });
    const result = validate({ packets: [packetFile(unresolved)] });

    expect(result.ok).toBe(true);
  });

  it('rejects orphan decision records', () => {
    const root = createRoot();
    writeEvidence(root, permissionPath);
    const result = validate({ root, decisions: [decisionFile()] });

    expect(result.ok).toBe(false);
    expect(result.orphanDecisionCount).toBe(1);
  });

  it('rejects a decision referenced by more than one packet', () => {
    const root = createRoot();
    writeEvidence(root, permissionPath);
    const secondPacket = packet({
      packetId: 'SID-SUB-20260701-002',
    });
    const result = validate({
      root,
      packets: [
        packetFile(),
        packetFile(
          secondPacket,
          'docs/content-intake/evidence/submissions/SID-SUB-20260701-002.json',
        ),
      ],
      decisions: [decisionFile()],
    });

    expect(result.ok).toBe(false);
    expect(result.duplicateDecisionReferenceCount).toBe(1);
  });

  it('rejects packet references to absent decisions', () => {
    const result = validate({ packets: [packetFile()] });

    expect(result.ok).toBe(false);
    expect(result.missingDecisionReferenceCount).toBe(1);
  });

  it('rejects packet and decision field mismatches', () => {
    const root = createRoot();
    writeEvidence(root, permissionPath);
    const mismatched = packet({
      rights: {
        ...packet().rights,
        rightsHolder: 'Different Holder',
      },
    });
    const result = validate({
      root,
      packets: [packetFile(mismatched)],
      decisions: [decisionFile()],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'rightsHolder', message: expect.stringContaining('must match') }),
    );
  });

  it('rejects decision dates before submission or in the future', () => {
    const root = createRoot();
    writeEvidence(root, permissionPath);
    const beforeSubmission = decision({ decidedOn: '2026-06-30' });
    const packetBefore = packet({ rights: { ...packet().rights, decidedOn: '2026-06-30' } });
    const result = validate({
      root,
      packets: [packetFile(packetBefore)],
      decisions: [decisionFile(beforeSubmission)],
      today: '2026-07-29',
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'decidedOn', message: 'must not precede packet submission' }),
    );

    const futureResult = validate({
      decisions: [decisionFile(decision({ decidedOn: '2026-07-30' }))],
      today: '2026-07-29',
    });
    expect(futureResult.ok).toBe(false);
    expect(futureResult.issues).toContainEqual(
      expect.objectContaining({ field: 'decidedOn', message: 'must not be in the future' }),
    );
  });

  it('rejects missing permission evidence files', () => {
    const result = validate({ packets: [packetFile()], decisions: [decisionFile()] });

    expect(result.ok).toBe(false);
    expect(result.missingPermissionEvidenceCount).toBe(1);
  });

  it('rejects permission evidence size and SHA-256 mismatches', () => {
    const root = createRoot();
    writeEvidence(root, permissionPath);
    const invalidPermission = permission({ sizeBytes: pdfBytes.length + 1, sha256: '1'.repeat(64) });
    const result = validate({
      root,
      packets: [packetFile()],
      decisions: [decisionFile(decision({ permission: invalidPermission }))],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'sizeBytes' }),
        expect.objectContaining({ field: 'sha256' }),
      ]),
    );
  });

  it('rejects disguised permission evidence and MIME-extension disagreement', () => {
    const root = createRoot();
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
    writeEvidence(root, permissionPath, pngBytes);
    const invalidPermission = permission({
      sha256: sha256(pngBytes),
      sizeBytes: pngBytes.length,
    });
    const result = validate({
      root,
      packets: [packetFile()],
      decisions: [decisionFile(decision({ permission: invalidPermission }))],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'mimeSignature' }),
        expect.objectContaining({ field: 'evidencePath' }),
      ]),
    );
  });

  it('rejects expired permission evidence', () => {
    const root = createRoot();
    writeEvidence(root, permissionPath);
    const result = validate({
      root,
      packets: [packetFile()],
      decisions: [
        decisionFile(decision({ permission: permission({ expiresOn: '2026-07-28' }) })),
      ],
      today: '2026-07-29',
    });

    expect(result.ok).toBe(false);
    expect(result.expiredPermissionCount).toBe(1);
  });

  it('rejects permission effective dates after the rights decision', () => {
    const root = createRoot();
    writeEvidence(root, permissionPath);
    const result = validate({
      root,
      packets: [packetFile()],
      decisions: [
        decisionFile(decision({ permission: permission({ effectiveOn: '2026-07-03' }) })),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'effectiveOn', message: 'must not be after the decision date' }),
    );
  });

  it('rejects symbolic links as permission evidence', () => {
    const root = createRoot();
    const target = writeEvidence(root, 'outside/permission.pdf');
    const link = join(root, permissionPath);
    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(target, link);
    const result = validate({
      root,
      packets: [packetFile()],
      decisions: [decisionFile()],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'evidencePath', message: 'symbolic links are forbidden' }),
    );
  });

  it('rejects unsafe permission paths and mismatched decision filenames', () => {
    const unsafe = decision({
      permission: permission({ evidencePath: '../private/permission.pdf' }),
    });
    const result = validate({
      decisions: [decisionFile(unsafe, 'docs/content-intake/evidence/rights/decisions/wrong.json')],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'decisionId' }),
        expect.objectContaining({ field: 'evidencePath' }),
      ]),
    );
  });

  it('rejects placeholder values and incomplete declarations', () => {
    const invalid = decision({
      rightsHolder: 'REPLACE_WITH_RIGHTS_HOLDER',
      declarations: {
        noAutomaticStatusPromotion: true,
        noProductionUse: false,
        containsNoSecretsOrPersonalData: true,
        privateCorrespondenceStoredOutsideRepository: false,
      },
    });
    const result = validate({ decisions: [decisionFile(invalid)] });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'rightsHolder' }),
        expect.objectContaining({ field: 'noProductionUse' }),
        expect.objectContaining({ field: 'privateCorrespondenceStoredOutsideRepository' }),
      ]),
    );
  });

  it('rejects malformed decision and packet JSON results', () => {
    const result = validate({
      packets: [
        {
          path: 'docs/content-intake/evidence/submissions/bad.json',
          value: null,
          parseError: 'Unexpected token',
        },
      ],
      decisions: [
        {
          path: 'docs/content-intake/evidence/rights/decisions/bad.json',
          value: null,
          parseError: 'Unexpected token',
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.malformedPacketCount).toBe(1);
    expect(result.malformedDecisionCount).toBe(1);
  });

  it('rejects governance drift in status partition, paths, and non-authoritative reuse', () => {
    const governance = {
      ...rightsGovernance,
      decisionPathPrefix: 'docs/unsafe/',
      nonAuthoritativeStatuses: ['UNRESOLVED'],
      allowedReuseScopes: {
        ...rightsGovernance.allowedReuseScopes,
        UNRESOLVED: ['DISPLAY_ONLY'],
      },
    };
    const result = validate({ governance });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'decisionPathPrefix' }),
        expect.objectContaining({ field: 'rightsStatuses' }),
        expect.objectContaining({ field: 'allowedReuseScopes.UNRESOLVED' }),
      ]),
    );
  });

  it('rejects duplicate or unsorted authorised reviewer IDs', () => {
    const governance = {
      ...rightsGovernance,
      authorisedReviewerIds: [reviewerId, reviewerId],
    };
    const result = validate({ governance });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'authorisedReviewerIds', message: 'must contain unique values' }),
    );
  });

  it('keeps manifest coverage deterministically sorted', () => {
    const reversedManifest = { ...manifest, items: [...manifest.items].reverse() };
    const result = validate({ manifestValue: reversedManifest });

    expect(result.ok).toBe(true);
    expect(result.rightsCoverageByManifestItem.map((item) => item.manifestItemId)).toEqual([
      'SID-EV-001',
      'SID-EV-002',
    ]);
  });

  it('rejects production-eligible packets even with otherwise valid rights metadata', () => {
    const result = validate({
      packets: [packetFile(packet({ productionEligible: true }))],
    });

    expect(result.ok).toBe(false);
    expect(result.productionEligibleItems).toBe(0);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'productionEligible', message: 'must remain false' }),
    );
  });
});
