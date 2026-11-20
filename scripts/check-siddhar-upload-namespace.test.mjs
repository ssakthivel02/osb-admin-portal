import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateSiddharEvidenceCoverage } from './check-siddhar-evidence-coverage.mjs';
import { validateSiddharRightsProvenance } from './check-siddhar-rights-provenance.mjs';

const roots = [];
const contract = {
  schemaVersion: 1,
  packetStatuses: ['DRAFT', 'REJECTED', 'SUBMITTED_FOR_REVIEW'],
  sourceTypes: ['PRIMARY_SOURCE_IMAGE'],
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
const manifest = {
  schemaVersion: 1,
  productionEligible: false,
  items: [
    {
      id: 'SID-EV-001',
      siddhar: 'Agastiyar',
      itemTitle: 'Source witness',
      priority: 'P0',
      status: 'UNRESOLVED',
      productionEligible: false,
    },
  ],
};
const reviewerId = 'SID-REV-RIGHTS1';
const reviewerGovernance = {
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
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');
const permissionId = 'SID-RGT-PERM-20260701-001';
const decisionId = 'SID-RGT-DEC-20260702-001';
const packetId = 'SID-SUB-20260701-001';
const permissionPath = `docs/content-intake/evidence/uploads/rights/${permissionId}.pdf`;
const rightsDecisionPath = `docs/content-intake/evidence/rights/decisions/${decisionId}.json`;

function root() {
  const value = mkdtempSync(join(tmpdir(), 'siddhar-upload-namespace-'));
  roots.push(value);
  return value;
}

function write(rootPath, path, content = pdf) {
  const absolute = join(rootPath, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
  return absolute;
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function permissionDecision() {
  return {
    schemaVersion: 1,
    decisionId,
    packetId,
    manifestItemId: 'SID-EV-001',
    rightsStatus: 'PERMISSION_GRANTED',
    rightsReviewerId: reviewerId,
    decidedOn: '2026-07-02',
    rightsHolder: 'Documented Rights Holder',
    basis: 'Written item-level permission for this evidence copy.',
    reuseScope: 'DISPLAY_ONLY',
    permission: {
      recordId: permissionId,
      evidencePath: permissionPath,
      sha256: sha256(pdf),
      mimeType: 'application/pdf',
      sizeBytes: pdf.length,
      effectiveOn: '2026-07-01',
      expiresOn: null,
      scopeStatement: 'Display this reviewed evidence copy.',
    },
    declarations: {
      noAutomaticStatusPromotion: true,
      noProductionUse: true,
      containsNoSecretsOrPersonalData: true,
      privateCorrespondenceStoredOutsideRepository: true,
    },
  };
}

function permissionPacket() {
  const decision = permissionDecision();
  return {
    packetId,
    manifestItemId: 'SID-EV-001',
    submittedOn: '2026-07-01',
    productionEligible: false,
    rights: {
      status: decision.rightsStatus,
      rightsHolder: decision.rightsHolder,
      basis: decision.basis,
      permissionReference: permissionId,
      reuseScope: decision.reuseScope,
      decisionId,
      decisionRecordPath: rightsDecisionPath,
      rightsReviewerId: reviewerId,
      decidedOn: decision.decidedOn,
    },
  };
}

afterEach(() => {
  for (const value of roots.splice(0)) {
    rmSync(value, { recursive: true, force: true });
  }
});

describe('Siddhar source and rights upload namespace separation', () => {
  it('excludes the reserved rights subtree from source-evidence coverage', () => {
    const repositoryRootPath = root();
    write(repositoryRootPath, permissionPath);

    const result = validateSiddharEvidenceCoverage({
      manifest,
      packetFiles: [],
      repositoryRootPath,
      contract,
    });

    expect(result.ok).toBe(true);
    expect(result.uploadFileCount).toBe(0);
    expect(result.orphanFileCount).toBe(0);
  });

  it('still rejects orphan files in the normal source-evidence namespace', () => {
    const repositoryRootPath = root();
    write(repositoryRootPath, 'docs/content-intake/evidence/uploads/source.pdf');

    const result = validateSiddharEvidenceCoverage({
      manifest,
      packetFiles: [],
      repositoryRootPath,
      contract,
    });

    expect(result.ok).toBe(false);
    expect(result.orphanFileCount).toBe(1);
  });

  it('rejects a rights-permission file that has no valid permission decision', () => {
    const repositoryRootPath = root();
    write(repositoryRootPath, permissionPath);

    const result = validateSiddharRightsProvenance({
      rightsGovernance,
      reviewerGovernance,
      manifest,
      packetFiles: [],
      decisionFiles: [],
      repositoryRootPath,
      submissionContract: contract,
      today: '2026-07-29',
    });

    expect(result.ok).toBe(false);
    expect(result.rightsUploadFileCount).toBe(1);
    expect(result.orphanPermissionEvidenceCount).toBe(1);
  });

  it('accepts a rights-permission file referenced by one valid permission decision', () => {
    const repositoryRootPath = root();
    write(repositoryRootPath, permissionPath);

    const result = validateSiddharRightsProvenance({
      rightsGovernance,
      reviewerGovernance,
      manifest,
      packetFiles: [
        {
          path: `docs/content-intake/evidence/submissions/${packetId}.json`,
          value: permissionPacket(),
        },
      ],
      decisionFiles: [{ path: rightsDecisionPath, value: permissionDecision() }],
      repositoryRootPath,
      submissionContract: contract,
      today: '2026-07-29',
    });

    expect(result.ok).toBe(true);
    expect(result.rightsUploadFileCount).toBe(1);
    expect(result.permissionEvidenceFileCount).toBe(1);
    expect(result.orphanPermissionEvidenceCount).toBe(0);
  });

  it('does not permit a packet to claim a reserved rights file as source-evidence coverage', () => {
    const repositoryRootPath = root();
    write(repositoryRootPath, permissionPath);
    const packet = {
      packetId,
      manifestItemId: 'SID-EV-001',
      manifestStatusObserved: 'UNRESOLVED',
      submissionStatus: 'DRAFT',
      productionEligible: false,
      files: [
        {
          path: permissionPath,
          sha256: sha256(pdf),
          mimeType: 'application/pdf',
          sizeBytes: pdf.length,
        },
      ],
    };

    const result = validateSiddharEvidenceCoverage({
      manifest,
      packetFiles: [
        {
          path: `docs/content-intake/evidence/submissions/${packetId}.json`,
          value: packet,
        },
      ],
      repositoryRootPath,
      contract,
    });

    expect(result.ok).toBe(false);
    expect(result.missingDeclaredFileCount).toBe(1);
  });

  it('rejects symbolic links inside the rights evidence namespace', () => {
    const repositoryRootPath = root();
    const target = write(repositoryRootPath, 'outside/permission.pdf');
    const link = join(repositoryRootPath, permissionPath);
    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(target, link);

    const result = validateSiddharRightsProvenance({
      rightsGovernance,
      reviewerGovernance,
      manifest,
      packetFiles: [],
      decisionFiles: [],
      repositoryRootPath,
      submissionContract: contract,
      today: '2026-07-29',
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        path: permissionPath,
        field: 'path',
        message: 'symbolic links are forbidden in the rights uploads directory',
      }),
    );
  });
});
