import { describe, expect, it } from 'vitest';
import { validateSiddharReviewerGovernance } from './check-siddhar-reviewer-governance.mjs';

const today = '2026-07-28';
const reviewRoles = ['EDITORIAL', 'TRANSCRIPTION', 'TRANSLATION', 'TRANSLITERATION'];
const submissionContract = {
  reviewRoles,
  reviewStatuses: ['COMPLETE', 'NOT_APPLICABLE', 'PENDING'],
};
const manifest = {
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

function reviewer({
  reviewerId,
  publicLabel,
  affiliation = 'Independent Tamil textual review panel',
  approvedRoles,
  active = true,
  conflictOfInterestDeclared = true,
  attestationReference,
  registeredOn = '2026-07-26',
  ...extra
}) {
  return {
    reviewerId,
    publicLabel,
    affiliation,
    approvedRoles,
    active,
    conflictOfInterestDeclared,
    attestationReference,
    registeredOn,
    ...extra,
  };
}

function reviewers() {
  return [
    reviewer({
      reviewerId: 'SID-REV-EDIT01',
      publicLabel: 'Independent editorial approver',
      approvedRoles: ['EDITORIAL'],
      attestationReference: 'SID-REV-ATTEST-20260726-001',
    }),
    reviewer({
      reviewerId: 'SID-REV-TRAN01',
      publicLabel: 'Tamil transcription specialist',
      approvedRoles: ['TRANSCRIPTION'],
      attestationReference: 'SID-REV-ATTEST-20260726-002',
    }),
    reviewer({
      reviewerId: 'SID-REV-TRNS01',
      publicLabel: 'English translation specialist',
      approvedRoles: ['TRANSLATION'],
      attestationReference: 'SID-REV-ATTEST-20260726-003',
    }),
    reviewer({
      reviewerId: 'SID-REV-ROMN01',
      publicLabel: 'Roman transliteration specialist',
      approvedRoles: ['TRANSLITERATION'],
      attestationReference: 'SID-REV-ATTEST-20260726-004',
    }),
  ];
}

function governance(overrides = {}) {
  return {
    schemaVersion: 1,
    reviewerIdPattern: '^SID-REV-[A-Z0-9]{6,24}$',
    attestationPattern: '^SID-REV-ATTEST-[0-9]{8}-[0-9]{3}$',
    unassignedValue: 'UNASSIGNED',
    reviewRoles,
    approvalRoles: ['EDITORIAL'],
    preparationRoles: ['TRANSCRIPTION', 'TRANSLATION', 'TRANSLITERATION'],
    forbiddenIdentityTerms: [
      'AI',
      'BOT',
      'CHATGPT',
      'DUMMY',
      'EXAMPLE',
      'GEMINI',
      'PLACEHOLDER',
      'SYNTHETIC',
      'TBD',
      'TEST',
      'TODO',
    ],
    reviewers: reviewers(),
    ...overrides,
  };
}

function role(status = 'PENDING', reviewerId = 'UNASSIGNED', reviewedOn = null) {
  return { status, reviewer: reviewerId, reviewedOn, notes: 'Evidence review note.' };
}

function packet({
  packetId = 'SID-SUB-20260727-001',
  manifestItemId = 'SID-EV-001',
  submittedOn = '2026-07-27',
  submissionStatus = 'SUBMITTED_FOR_REVIEW',
  review = {
    EDITORIAL: role('COMPLETE', 'SID-REV-EDIT01', '2026-07-28'),
    TRANSCRIPTION: role('COMPLETE', 'SID-REV-TRAN01', '2026-07-28'),
    TRANSLATION: role('COMPLETE', 'SID-REV-TRNS01', '2026-07-28'),
    TRANSLITERATION: role('COMPLETE', 'SID-REV-ROMN01', '2026-07-28'),
  },
  path = `docs/content-intake/evidence/submissions/${packetId}.json`,
} = {}) {
  return {
    path,
    value: {
      packetId,
      manifestItemId,
      submittedOn,
      submissionStatus,
      review,
    },
  };
}

function validate({
  governanceDocument = governance(),
  manifestDocument = manifest,
  packetFiles = [],
} = {}) {
  return validateSiddharReviewerGovernance({
    governance: governanceDocument,
    manifest: manifestDocument,
    packetFiles,
    submissionContract,
    today,
  });
}

describe('Siddhar reviewer identity and separation-of-duties gate', () => {
  it('passes safely with an empty reviewer registry and zero packets', () => {
    const result = validate({ governanceDocument: governance({ reviewers: [] }) });

    expect(result.ok).toBe(true);
    expect(result.registryReviewerCount).toBe(0);
    expect(result.packetFileCount).toBe(0);
    expect(result.manifestItemCount).toBe(2);
    expect(result.reviewerCoverageByManifestItem.map((item) => item.assignmentState)).toEqual([
      'NO_PACKET',
      'NO_PACKET',
    ]);
    expect(result.automaticStatusChanges).toBe(0);
    expect(result.productionEligibleItems).toBe(0);
  });

  it('accepts four distinct authorised reviewers and reports complete coverage', () => {
    const result = validate({ packetFiles: [packet()] });

    expect(result.ok).toBe(true);
    expect(result.assignedReviewCount).toBe(4);
    expect(result.completedReviewCount).toBe(4);
    expect(result.distinctAssignedReviewerCount).toBe(4);
    expect(result.separationConflictCount).toBe(0);
    expect(result.completedManifestItems).toBe(1);
    expect(result.reviewerCoverageByManifestItem[0]).toEqual(
      expect.objectContaining({
        manifestItemId: 'SID-EV-001',
        assignedRoleCount: 4,
        completedRoleCount: 4,
        distinctReviewerCount: 4,
        assignmentState: 'COMPLETE',
      }),
    );
  });

  it('allows one qualified preparation reviewer to perform transcription and transliteration', () => {
    const shared = reviewer({
      reviewerId: 'SID-REV-LANG01',
      publicLabel: 'Tamil language preparation specialist',
      approvedRoles: ['TRANSCRIPTION', 'TRANSLITERATION'],
      attestationReference: 'SID-REV-ATTEST-20260726-005',
    });
    const registry = reviewers().filter((entry) =>
      !['SID-REV-TRAN01', 'SID-REV-ROMN01'].includes(entry.reviewerId),
    );
    registry.push(shared);
    registry.sort((left, right) => left.reviewerId.localeCompare(right.reviewerId));
    const review = packet().value.review;
    review.TRANSCRIPTION.reviewer = 'SID-REV-LANG01';
    review.TRANSLITERATION.reviewer = 'SID-REV-LANG01';

    const result = validate({
      governanceDocument: governance({ reviewers: registry }),
      packetFiles: [packet({ review })],
    });

    expect(result.ok).toBe(true);
    expect(result.distinctAssignedReviewerCount).toBe(3);
    expect(result.separationConflictCount).toBe(0);
  });

  it.each(['TRANSCRIPTION', 'TRANSLATION', 'TRANSLITERATION'])(
    'rejects an editorial approver also assigned to %s',
    (preparationRole) => {
      const registry = reviewers().map((entry) =>
        entry.reviewerId === 'SID-REV-EDIT01'
          ? { ...entry, approvedRoles: ['EDITORIAL', preparationRole].sort() }
          : entry,
      );
      const review = packet().value.review;
      review[preparationRole].reviewer = 'SID-REV-EDIT01';

      const result = validate({
        governanceDocument: governance({ reviewers: registry }),
        packetFiles: [packet({ review })],
      });

      expect(result.ok).toBe(false);
      expect(result.separationConflictCount).toBe(1);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ field: 'review.separationOfDuties' }),
      );
    },
  );

  it('rejects an unknown reviewer reference', () => {
    const review = packet().value.review;
    review.EDITORIAL.reviewer = 'SID-REV-UNKN01';

    const result = validate({ packetFiles: [packet({ review })] });

    expect(result.ok).toBe(false);
    expect(result.unknownReviewerReferenceCount).toBe(1);
  });

  it('rejects an inactive reviewer reference', () => {
    const registry = reviewers().map((entry) =>
      entry.reviewerId === 'SID-REV-EDIT01' ? { ...entry, active: false } : entry,
    );

    const result = validate({
      governanceDocument: governance({ reviewers: registry }),
      packetFiles: [packet()],
    });

    expect(result.ok).toBe(false);
    expect(result.inactiveReviewerReferenceCount).toBe(1);
  });

  it('rejects an active reviewer without a conflict-of-interest declaration', () => {
    const registry = reviewers().map((entry) =>
      entry.reviewerId === 'SID-REV-EDIT01'
        ? { ...entry, conflictOfInterestDeclared: false }
        : entry,
    );

    const result = validate({
      governanceDocument: governance({ reviewers: registry }),
      packetFiles: [packet()],
    });

    expect(result.ok).toBe(false);
    expect(result.conflictDeclarationFindingCount).toBe(1);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'conflictOfInterestDeclared' }),
        expect.objectContaining({ field: 'reviewer' }),
      ]),
    );
  });

  it('rejects a reviewer assigned outside approved roles', () => {
    const review = packet().value.review;
    review.TRANSLATION.reviewer = 'SID-REV-TRAN01';

    const result = validate({ packetFiles: [packet({ review })] });

    expect(result.ok).toBe(false);
    expect(result.unauthorisedRoleReferenceCount).toBe(1);
  });

  it('rejects placeholder reviewer text that is not a stable reviewer ID', () => {
    const review = packet().value.review;
    review.EDITORIAL.reviewer = 'Reviewer 1';

    const result = validate({ packetFiles: [packet({ review })] });

    expect(result.ok).toBe(false);
    expect(result.placeholderIdentityFindingCount).toBe(1);
  });

  it('rejects a completed review with UNASSIGNED reviewer', () => {
    const review = packet().value.review;
    review.EDITORIAL = role('COMPLETE', 'UNASSIGNED', '2026-07-28');

    const result = validate({
      packetFiles: [packet({ submissionStatus: 'DRAFT', review })],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        field: 'reviewer',
        message: 'completed reviews must name a registered reviewer ID',
      }),
    );
  });

  it('rejects an unassigned applicable role before submission for review', () => {
    const review = packet().value.review;
    review.EDITORIAL = role('PENDING', 'UNASSIGNED', null);

    const result = validate({ packetFiles: [packet({ review })] });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        field: 'reviewer',
        message: 'must be assigned before submission for review',
      }),
    );
  });

  it('rejects an invalid completed-review date', () => {
    const review = packet().value.review;
    review.EDITORIAL.reviewedOn = '2026-02-30';

    const result = validate({ packetFiles: [packet({ review })] });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'reviewedOn', message: 'must use a real YYYY-MM-DD date when complete' }),
    );
  });

  it('rejects a future completed-review date', () => {
    const review = packet().value.review;
    review.EDITORIAL.reviewedOn = '2026-07-29';

    const result = validate({ packetFiles: [packet({ review })] });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'reviewedOn', message: 'must not be in the future' }),
    );
  });

  it('rejects a review date that predates packet submission', () => {
    const review = packet().value.review;
    review.EDITORIAL.reviewedOn = '2026-07-26';

    const result = validate({ packetFiles: [packet({ review })] });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'reviewedOn', message: 'must not predate packet submission' }),
    );
  });

  it('rejects reviewedOn for a non-complete review', () => {
    const review = packet().value.review;
    review.EDITORIAL = role('PENDING', 'SID-REV-EDIT01', '2026-07-28');

    const result = validate({ packetFiles: [packet({ review })] });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'reviewedOn', message: 'must be null until the review is complete' }),
    );
  });

  it('rejects duplicate stable reviewer IDs', () => {
    const duplicate = {
      ...reviewers()[0],
      publicLabel: 'Second editorial identity record',
      attestationReference: 'SID-REV-ATTEST-20260726-009',
    };

    const result = validate({
      governanceDocument: governance({ reviewers: [...reviewers(), duplicate] }),
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'reviewerId', message: 'must be unique' }),
    );
  });

  it('rejects duplicate attestation references', () => {
    const registry = reviewers();
    registry[1] = {
      ...registry[1],
      attestationReference: registry[0].attestationReference,
    };

    const result = validate({ governanceDocument: governance({ reviewers: registry }) });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'attestationReference', message: 'must be unique' }),
    );
  });

  it.each(['Gemini reviewer', 'Dummy reviewer', 'Reviewer 1'])(
    'rejects synthetic or generic public label %s',
    (publicLabel) => {
      const registry = reviewers();
      registry[0] = { ...registry[0], publicLabel };

      const result = validate({ governanceDocument: governance({ reviewers: registry }) });

      expect(result.ok).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ field: 'publicLabel' }),
      );
    },
  );

  it.each([
    ['publicLabel', 'Tamil reviewer reviewer@example.org'],
    ['affiliation', 'Review board +44 7700 900123'],
    ['affiliation', 'https://example.org/private-profile'],
  ])('rejects contact data in reviewer %s', (field, value) => {
    const registry = reviewers();
    registry[0] = { ...registry[0], [field]: value };

    const result = validate({ governanceDocument: governance({ reviewers: registry }) });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field, message: 'must not contain email, phone, URL, or other contact data' }),
    );
  });

  it('rejects unexpected reviewer fields that could expose private mapping data', () => {
    const registry = reviewers();
    registry[0] = { ...registry[0], email: 'private@example.org' };

    const result = validate({ governanceDocument: governance({ reviewers: registry }) });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'email' }),
    );
  });

  it('rejects malformed packet JSON and non-object packets', () => {
    const result = validate({
      packetFiles: [
        {
          path: 'docs/content-intake/evidence/submissions/broken.json',
          value: null,
          parseError: 'Unexpected token',
        },
        {
          path: 'docs/content-intake/evidence/submissions/array.json',
          value: [],
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.malformedPacketCount).toBe(2);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: '(json)' }),
        expect.objectContaining({ field: '(packet)' }),
      ]),
    );
  });

  it('rejects overlapping approval and preparation role configuration', () => {
    const result = validate({
      governanceDocument: governance({
        approvalRoles: ['EDITORIAL', 'TRANSCRIPTION'],
        preparationRoles: ['TRANSCRIPTION', 'TRANSLATION', 'TRANSLITERATION'],
      }),
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'roleSeparation' }),
    );
  });

  it('rejects review-role drift from the canonical submission contract', () => {
    const result = validate({
      governanceDocument: governance({ reviewRoles: ['EDITORIAL', 'TRANSCRIPTION', 'TRANSLATION'] }),
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        field: 'reviewRoles',
        message: 'must exactly match the canonical submission review roles',
      }),
    );
  });

  it('reports partial assignment and partial completion states', () => {
    const pendingReview = {
      EDITORIAL: role('PENDING', 'SID-REV-EDIT01', null),
      TRANSCRIPTION: role('PENDING', 'SID-REV-TRAN01', null),
      TRANSLATION: role('PENDING', 'UNASSIGNED', null),
      TRANSLITERATION: role('PENDING', 'UNASSIGNED', null),
    };
    const partiallyCompleteReview = {
      ...pendingReview,
      TRANSCRIPTION: role('COMPLETE', 'SID-REV-TRAN01', '2026-07-28'),
    };

    const partialAssignment = validate({
      packetFiles: [
        packet({ submissionStatus: 'DRAFT', review: pendingReview }),
      ],
    });
    const partialCompletion = validate({
      packetFiles: [
        packet({ submissionStatus: 'DRAFT', review: partiallyCompleteReview }),
      ],
    });

    expect(partialAssignment.ok).toBe(true);
    expect(partialAssignment.reviewerCoverageByManifestItem[0].assignmentState).toBe(
      'PARTIALLY_ASSIGNED',
    );
    expect(partialCompletion.ok).toBe(true);
    expect(partialCompletion.reviewerCoverageByManifestItem[0].assignmentState).toBe(
      'PARTIALLY_COMPLETE',
    );
  });

  it('keeps manifest reviewer coverage deterministically sorted', () => {
    const result = validate({
      manifestDocument: { items: [...manifest.items].reverse() },
    });

    expect(result.reviewerCoverageByManifestItem.map((item) => item.manifestItemId)).toEqual([
      'SID-EV-001',
      'SID-EV-002',
    ]);
  });
});
