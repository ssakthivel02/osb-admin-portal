import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT,
  validateSiddharEvidenceSubmissions,
} from './check-siddhar-evidence-submissions.mjs';
import { validateSiddharEvidenceFileIntegrity } from './check-siddhar-evidence-file-integrity.mjs';
import { validateSiddharEvidenceCoverage } from './check-siddhar-evidence-coverage.mjs';
import { validateSiddharReviewerGovernance } from './check-siddhar-reviewer-governance.mjs';
import { validateSiddharRightsProvenance } from './check-siddhar-rights-provenance.mjs';
import {
  SIDDHAR_NO_RIGHTS_DECISION_FINGERPRINT,
  SIDDHAR_SUBJECT_FINGERPRINT_ALGORITHM,
  SIDDHAR_SUBJECT_FINGERPRINT_PATTERN,
  fingerprintCanonicalJson,
  isSiddharSubjectFingerprint,
} from './siddhar-subject-fingerprint.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const governancePath = resolve(
  repositoryRoot,
  'config/siddhar-editorial-disposition-governance.json',
);
const reviewerGovernancePath = resolve(
  repositoryRoot,
  'config/siddhar-reviewer-governance.json',
);
const rightsGovernancePath = resolve(
  repositoryRoot,
  'config/siddhar-rights-governance.json',
);
const manifestPath = resolve(
  repositoryRoot,
  'docs/content-intake/evidence/siddhar-evidence-manifest.json',
);
const submissionsDirectory = resolve(
  repositoryRoot,
  'docs/content-intake/evidence/submissions',
);
const rightsDecisionsDirectory = resolve(
  repositoryRoot,
  'docs/content-intake/evidence/rights/decisions',
);
const editorialDecisionsDirectory = resolve(
  repositoryRoot,
  'docs/content-intake/evidence/editorial/decisions',
);
const reportPath = resolve(
  repositoryRoot,
  'quality-evidence/siddhar-editorial-disposition.json',
);

const EXPECTED_DECISION_PREFIX = 'docs/content-intake/evidence/editorial/decisions/';
const EXPECTED_DECLARATIONS = [
  'contradictionBlockAcknowledged',
  'noAutomaticManifestChange',
  'noProductionApproval',
  'noPublicationClaim',
];
const RIGHTS_STATES = [
  'PERMISSION_GRANTED_REVIEWED',
  'PUBLIC_DOMAIN_UNVERIFIED',
  'RESTRICTED_REVIEWED',
  'UNRESOLVED',
];
const DECISION_FIELDS = [
  'basis',
  'completedReviewRolesObserved',
  'decidedOn',
  'decisionId',
  'declarations',
  'editorialReviewerId',
  'finalDisposition',
  'manifestItemId',
  'manifestStatusObserved',
  'packetFingerprint',
  'packetId',
  'packetProposedDispositionObserved',
  'packetSubmissionStatusObserved',
  'rightsDecisionFingerprint',
  'rightsDecisionIdObserved',
  'rightsStatusObserved',
  'schemaVersion',
  'subjectFingerprintAlgorithm',
];
const PACKET_ID = /^SID-SUB-\d{8}-\d{3}$/;
const MANIFEST_ID = /^SID-EV-\d{3}$/;
const PLACEHOLDER_LANGUAGE =
  /(REPLACE_|YYYY-MM-DD|UNASSIGNED|UNKNOWN_OR_DOCUMENTED|example\.invalid|\bTBD\b|\bTODO\b|\bDUMMY\b|\bSYNTHETIC\b|AI[-_ ]GENERATED)/i;
const FORBIDDEN_APPROVAL_LANGUAGE =
  /(PRIMARY[-_ ]TEXT ATTESTED|SCRIPTURALLY ATTESTED|AUTHENTICATED|PRODUCTION[-_ ]READY|APPROVED FOR PUBLICATION|PUBLICATION APPROVED|PUBLISHABLE|RELEASE[-_ ]APPROVED)/i;

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDate(value) {
  if (!isNonEmptyString(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function toRepositoryPath(root, absolutePath) {
  return relative(root, absolutePath).replaceAll('\\', '/');
}

function addIssue(
  issues,
  path,
  field,
  message,
  packetId = null,
  manifestItemId = null,
  decisionId = null,
) {
  issues.push({ path, field, message, packetId, manifestItemId, decisionId });
}

function compileAnchoredPattern(value, path, field, issues) {
  if (!isNonEmptyString(value) || !value.startsWith('^') || !value.endsWith('$')) {
    addIssue(issues, path, field, 'must be a non-empty anchored regular expression');
    return /a^/;
  }
  try {
    return new RegExp(value);
  } catch {
    addIssue(issues, path, field, 'must be a valid regular expression');
    return /a^/;
  }
}

function parseSortedStringArray(
  document,
  field,
  path,
  issues,
  { allowEmpty = false } = {},
) {
  const value = document[field];
  if (
    !Array.isArray(value) ||
    (!allowEmpty && value.length === 0) ||
    value.some((entry) => !isNonEmptyString(entry))
  ) {
    addIssue(
      issues,
      path,
      field,
      allowEmpty ? 'must be a string array' : 'must be a non-empty string array',
    );
    return [];
  }
  const normalised = uniqueSorted(value);
  if (normalised.length !== value.length) {
    addIssue(issues, path, field, 'must contain unique values');
  }
  if (normalised.some((entry, index) => entry !== value[index])) {
    addIssue(issues, path, field, 'must be sorted');
  }
  return normalised;
}

function parseDispositionMap({
  document,
  field,
  dispositions,
  allowedValues,
  path,
  issues,
  requireEditorialRole = false,
}) {
  const result = new Map();
  const value = document[field];
  if (!isObject(value)) {
    addIssue(issues, path, field, 'must be an object');
    return result;
  }

  const keys = Object.keys(value).sort((left, right) => left.localeCompare(right));
  if (JSON.stringify(keys) !== JSON.stringify(dispositions)) {
    addIssue(
      issues,
      path,
      field,
      'must define exactly one entry for every canonical disposition',
    );
  }

  for (const disposition of keys) {
    const entries = value[disposition];
    const entryPath = `${field}.${disposition}`;
    if (
      !Array.isArray(entries) ||
      entries.length === 0 ||
      entries.some((entry) => !isNonEmptyString(entry))
    ) {
      addIssue(issues, path, entryPath, 'must be a non-empty string array');
      continue;
    }
    const normalised = uniqueSorted(entries);
    if (normalised.length !== entries.length) {
      addIssue(issues, path, entryPath, 'must contain unique values');
    }
    if (normalised.some((entry, index) => entry !== entries[index])) {
      addIssue(issues, path, entryPath, 'must be sorted');
    }
    for (const entry of normalised) {
      if (!allowedValues.includes(entry)) {
        addIssue(issues, path, entryPath, `${entry} is not an allowed value`);
      }
    }
    if (requireEditorialRole && !normalised.includes('EDITORIAL')) {
      addIssue(issues, path, entryPath, 'must require the EDITORIAL role');
    }
    result.set(disposition, normalised);
  }

  return result;
}

export function parseSiddharEditorialDispositionGovernance({
  document,
  reviewerGovernance,
  submissionContract = SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT,
  issues = [],
}) {
  const path = 'config/siddhar-editorial-disposition-governance.json';
  const defaults = {
    schemaVersion: 1,
    decisionIdPattern: /a^/,
    decisionPathPrefix: EXPECTED_DECISION_PREFIX,
    fingerprintAlgorithm: SIDDHAR_SUBJECT_FINGERPRINT_ALGORITHM,
    fingerprintPattern: SIDDHAR_SUBJECT_FINGERPRINT_PATTERN,
    noRightsDecisionFingerprint: SIDDHAR_NO_RIGHTS_DECISION_FINGERPRINT,
    finalDispositions: [],
    releaseCandidateDispositions: [],
    contradictedManifestStatus: 'CONTRADICTED_DO_NOT_PUBLISH',
    contradictedAllowedDispositions: [],
    requiredReviewRolesByDisposition: new Map(),
    allowedRightsStatesByDisposition: new Map(),
    requiredPacketSubmissionStatus: 'SUBMITTED_FOR_REVIEW',
    requiredDeclarations: EXPECTED_DECLARATIONS,
    forbiddenDecisionFields: [],
    reviewerIdPattern: /a^/,
    reviewersById: new Map(),
  };

  if (!isObject(document)) {
    addIssue(issues, path, '(document)', 'must be a JSON object');
    return defaults;
  }
  if (document.schemaVersion !== 1) {
    addIssue(issues, path, 'schemaVersion', 'must be 1');
  }

  const decisionIdPattern = compileAnchoredPattern(
    document.decisionIdPattern,
    path,
    'decisionIdPattern',
    issues,
  );
  if (document.decisionPathPrefix !== EXPECTED_DECISION_PREFIX) {
    addIssue(
      issues,
      path,
      'decisionPathPrefix',
      `must remain ${EXPECTED_DECISION_PREFIX}`,
    );
  }
  if (document.fingerprintAlgorithm !== SIDDHAR_SUBJECT_FINGERPRINT_ALGORITHM) {
    addIssue(
      issues,
      path,
      'fingerprintAlgorithm',
      `must remain ${SIDDHAR_SUBJECT_FINGERPRINT_ALGORITHM}`,
    );
  }
  if (document.fingerprintPattern !== SIDDHAR_SUBJECT_FINGERPRINT_PATTERN.source) {
    addIssue(
      issues,
      path,
      'fingerprintPattern',
      `must remain ${SIDDHAR_SUBJECT_FINGERPRINT_PATTERN.source}`,
    );
  }
  if (document.noRightsDecisionFingerprint !== SIDDHAR_NO_RIGHTS_DECISION_FINGERPRINT) {
    addIssue(
      issues,
      path,
      'noRightsDecisionFingerprint',
      `must remain ${SIDDHAR_NO_RIGHTS_DECISION_FINGERPRINT}`,
    );
  }

  const finalDispositions = parseSortedStringArray(
    document,
    'finalDispositions',
    path,
    issues,
  );
  if (
    JSON.stringify(finalDispositions) !==
    JSON.stringify(submissionContract.proposedDispositions)
  ) {
    addIssue(
      issues,
      path,
      'finalDispositions',
      'must exactly match the canonical non-production proposed dispositions',
    );
  }

  const releaseCandidateDispositions = parseSortedStringArray(
    document,
    'releaseCandidateDispositions',
    path,
    issues,
  );
  for (const disposition of releaseCandidateDispositions) {
    if (!finalDispositions.includes(disposition)) {
      addIssue(
        issues,
        path,
        'releaseCandidateDispositions',
        `${disposition} must be a canonical disposition`,
      );
    }
  }
  if (
    JSON.stringify(releaseCandidateDispositions) !==
    JSON.stringify(['SOURCE_REVIEW_ONLY'])
  ) {
    addIssue(
      issues,
      path,
      'releaseCandidateDispositions',
      'must remain SOURCE_REVIEW_ONLY only',
    );
  }

  if (document.contradictedManifestStatus !== 'CONTRADICTED_DO_NOT_PUBLISH') {
    addIssue(
      issues,
      path,
      'contradictedManifestStatus',
      'must remain CONTRADICTED_DO_NOT_PUBLISH',
    );
  }
  const contradictedAllowedDispositions = parseSortedStringArray(
    document,
    'contradictedAllowedDispositions',
    path,
    issues,
  );
  for (const disposition of contradictedAllowedDispositions) {
    if (!finalDispositions.includes(disposition)) {
      addIssue(
        issues,
        path,
        'contradictedAllowedDispositions',
        `${disposition} must be a canonical disposition`,
      );
    }
    if (releaseCandidateDispositions.includes(disposition)) {
      addIssue(
        issues,
        path,
        'contradictedAllowedDispositions',
        `${disposition} cannot be release-candidate disposition`,
      );
    }
  }

  const requiredReviewRolesByDisposition = parseDispositionMap({
    document,
    field: 'requiredReviewRolesByDisposition',
    dispositions: finalDispositions,
    allowedValues: submissionContract.reviewRoles,
    path,
    issues,
    requireEditorialRole: true,
  });
  if (
    JSON.stringify(requiredReviewRolesByDisposition.get('SOURCE_REVIEW_ONLY') ?? []) !==
    JSON.stringify(submissionContract.reviewRoles)
  ) {
    addIssue(
      issues,
      path,
      'requiredReviewRolesByDisposition.SOURCE_REVIEW_ONLY',
      'must require every canonical review role',
    );
  }

  const allowedRightsStatesByDisposition = parseDispositionMap({
    document,
    field: 'allowedRightsStatesByDisposition',
    dispositions: finalDispositions,
    allowedValues: RIGHTS_STATES,
    path,
    issues,
  });
  if (
    JSON.stringify(allowedRightsStatesByDisposition.get('SOURCE_REVIEW_ONLY') ?? []) !==
    JSON.stringify(['PERMISSION_GRANTED_REVIEWED', 'RESTRICTED_REVIEWED'])
  ) {
    addIssue(
      issues,
      path,
      'allowedRightsStatesByDisposition.SOURCE_REVIEW_ONLY',
      'must require authoritative reviewed rights provenance',
    );
  }

  if (document.requiredPacketSubmissionStatus !== 'SUBMITTED_FOR_REVIEW') {
    addIssue(
      issues,
      path,
      'requiredPacketSubmissionStatus',
      'must remain SUBMITTED_FOR_REVIEW',
    );
  }
  if (!submissionContract.packetStatuses.includes(document.requiredPacketSubmissionStatus)) {
    addIssue(
      issues,
      path,
      'requiredPacketSubmissionStatus',
      'must use a canonical packet status',
    );
  }

  const requiredDeclarations = parseSortedStringArray(
    document,
    'requiredDeclarations',
    path,
    issues,
  );
  if (JSON.stringify(requiredDeclarations) !== JSON.stringify(EXPECTED_DECLARATIONS)) {
    addIssue(
      issues,
      path,
      'requiredDeclarations',
      'must exactly match the protected editorial declarations',
    );
  }

  const forbiddenDecisionFields = parseSortedStringArray(
    document,
    'forbiddenDecisionFields',
    path,
    issues,
  );

  const reviewersById = new Map();
  let reviewerIdPattern = /a^/;
  if (!isObject(reviewerGovernance)) {
    addIssue(
      issues,
      'config/siddhar-reviewer-governance.json',
      '(document)',
      'must be a JSON object',
    );
  } else {
    reviewerIdPattern = compileAnchoredPattern(
      reviewerGovernance.reviewerIdPattern,
      'config/siddhar-reviewer-governance.json',
      'reviewerIdPattern',
      issues,
    );
    if (!Array.isArray(reviewerGovernance.reviewers)) {
      addIssue(
        issues,
        'config/siddhar-reviewer-governance.json',
        'reviewers',
        'must be an array',
      );
    } else {
      for (const reviewer of reviewerGovernance.reviewers) {
        if (isObject(reviewer) && isNonEmptyString(reviewer.reviewerId)) {
          reviewersById.set(reviewer.reviewerId, reviewer);
        }
      }
    }
  }

  return {
    schemaVersion: 1,
    decisionIdPattern,
    decisionPathPrefix: EXPECTED_DECISION_PREFIX,
    fingerprintAlgorithm: SIDDHAR_SUBJECT_FINGERPRINT_ALGORITHM,
    fingerprintPattern: SIDDHAR_SUBJECT_FINGERPRINT_PATTERN,
    noRightsDecisionFingerprint: SIDDHAR_NO_RIGHTS_DECISION_FINGERPRINT,
    finalDispositions,
    releaseCandidateDispositions,
    contradictedManifestStatus: 'CONTRADICTED_DO_NOT_PUBLISH',
    contradictedAllowedDispositions,
    requiredReviewRolesByDisposition,
    allowedRightsStatesByDisposition,
    requiredPacketSubmissionStatus: 'SUBMITTED_FOR_REVIEW',
    requiredDeclarations,
    forbiddenDecisionFields,
    reviewerIdPattern,
    reviewersById,
  };
}

function buildManifestMap(manifest, issues) {
  const path = 'docs/content-intake/evidence/siddhar-evidence-manifest.json';
  const items = new Map();
  if (!isObject(manifest) || !Array.isArray(manifest.items)) {
    addIssue(issues, path, 'items', 'must be an array');
    return items;
  }
  if (manifest.productionEligible !== false) {
    addIssue(issues, path, 'productionEligible', 'must remain false');
  }
  for (const [index, item] of manifest.items.entries()) {
    const itemPath = `${path}#items[${index}]`;
    if (!isObject(item) || !isNonEmptyString(item.id) || !MANIFEST_ID.test(item.id)) {
      addIssue(issues, itemPath, 'id', 'must use SID-EV-NNN');
      continue;
    }
    if (items.has(item.id)) {
      addIssue(issues, itemPath, 'id', 'must be unique');
      continue;
    }
    if (item.productionEligible !== false) {
      addIssue(issues, itemPath, 'productionEligible', 'must remain false');
    }
    items.set(item.id, item);
  }
  return items;
}

function buildPacketMap(packetFiles, issues) {
  const packetsById = new Map();
  for (const packetFile of [...packetFiles].sort((left, right) =>
    left.path.localeCompare(right.path),
  )) {
    if (packetFile.parseError !== undefined || !isObject(packetFile.value)) {
      continue;
    }
    const packet = packetFile.value;
    if (!isNonEmptyString(packet.packetId) || !PACKET_ID.test(packet.packetId)) {
      continue;
    }
    if (packetsById.has(packet.packetId)) {
      addIssue(
        issues,
        packetFile.path,
        'packetId',
        'must be unique for editorial decision reconciliation',
        packet.packetId,
        packet.manifestItemId ?? null,
      );
      continue;
    }
    packetsById.set(packet.packetId, {
      ...packet,
      path: packetFile.path,
      _subjectFingerprint: fingerprintCanonicalJson(packet),
    });
  }
  return packetsById;
}

function buildRightsDecisionMap(rightsDecisionFiles) {
  const decisionsById = new Map();
  for (const decisionFile of [...rightsDecisionFiles].sort((left, right) =>
    left.path.localeCompare(right.path),
  )) {
    if (decisionFile.parseError !== undefined || !isObject(decisionFile.value)) {
      continue;
    }
    const decisionId = decisionFile.value.decisionId;
    if (!isNonEmptyString(decisionId) || decisionsById.has(decisionId)) {
      continue;
    }
    decisionsById.set(decisionId, {
      path: decisionFile.path,
      value: decisionFile.value,
      fingerprint: fingerprintCanonicalJson(decisionFile.value),
    });
  }
  return decisionsById;
}

function reviewerIsAuthorisedEditorial(reviewer) {
  return (
    isObject(reviewer) &&
    reviewer.active === true &&
    reviewer.conflictOfInterestDeclared === true &&
    Array.isArray(reviewer.approvedRoles) &&
    reviewer.approvedRoles.includes('EDITORIAL')
  );
}

function completedReviewRoles(packet, reviewRoles) {
  if (!isObject(packet.review)) {
    return [];
  }
  return reviewRoles
    .filter((role) => isObject(packet.review[role]) && packet.review[role].status === 'COMPLETE')
    .sort((left, right) => left.localeCompare(right));
}

function packetRightsState(packet) {
  switch (packet?.rights?.status) {
    case 'PERMISSION_GRANTED':
      return 'PERMISSION_GRANTED_REVIEWED';
    case 'RESTRICTED':
      return 'RESTRICTED_REVIEWED';
    case 'PUBLIC_DOMAIN_CLAIM_UNVERIFIED':
      return 'PUBLIC_DOMAIN_UNVERIFIED';
    default:
      return 'UNRESOLVED';
  }
}

function validateUpstream({
  manifest,
  packetFiles,
  reviewerGovernance,
  rightsGovernance,
  rightsDecisionFiles,
  repositoryRootPath,
  submissionContract,
  today,
  issues,
}) {
  const submissions = validateSiddharEvidenceSubmissions({
    contract: submissionContract,
    manifest,
    packetFiles,
  });
  const files = validateSiddharEvidenceFileIntegrity({
    contract: submissionContract,
    packetFiles,
    repositoryRootPath,
  });
  const coverage = validateSiddharEvidenceCoverage({
    manifest,
    packetFiles,
    repositoryRootPath,
    contract: submissionContract,
  });
  const reviewers = validateSiddharReviewerGovernance({
    governance: reviewerGovernance,
    manifest,
    packetFiles,
    submissionContract,
    today,
  });
  const rights = validateSiddharRightsProvenance({
    rightsGovernance,
    reviewerGovernance,
    manifest,
    packetFiles,
    decisionFiles: rightsDecisionFiles,
    repositoryRootPath,
    submissionContract,
    today,
  });

  for (const [field, result] of Object.entries({
    submissions,
    files,
    coverage,
    reviewers,
    rights,
  })) {
    if (!result.ok) {
      addIssue(
        issues,
        '(upstream)',
        field,
        `upstream ${field} validation must pass before editorial disposition`,
      );
    }
  }

  return { submissions, files, coverage, reviewers, rights };
}

function validateEditorialDecision({
  decisionFile,
  governance,
  manifestItems,
  packetsById,
  rightsDecisionsById,
  submissionContract,
  today,
  issues,
  counters,
  decisionsByPacket,
  fingerprintAssessments,
}) {
  const path = decisionFile.path;
  const initialIssueCount = issues.length;
  if (decisionFile.parseError !== undefined) {
    counters.malformedDecisionCount += 1;
    addIssue(issues, path, '(json)', `invalid JSON: ${decisionFile.parseError}`);
    return null;
  }
  if (!isObject(decisionFile.value)) {
    counters.malformedDecisionCount += 1;
    addIssue(issues, path, '(decision)', 'must be a JSON object');
    return null;
  }

  const decision = decisionFile.value;
  const decisionId = isNonEmptyString(decision.decisionId) ? decision.decisionId : null;
  const packetId = isNonEmptyString(decision.packetId) ? decision.packetId : null;
  const manifestItemId = isNonEmptyString(decision.manifestItemId)
    ? decision.manifestItemId
    : null;
  let packetFingerprintFresh = false;
  let rightsDecisionFingerprintFresh = false;
  let fingerprintState = 'INVALID';

  for (const field of Object.keys(decision)) {
    if (!DECISION_FIELDS.includes(field)) {
      addIssue(
        issues,
        path,
        field,
        'is not permitted in a public editorial decision record',
        packetId,
        manifestItemId,
        decisionId,
      );
    }
  }
  for (const field of governance.forbiddenDecisionFields) {
    if (Object.hasOwn(decision, field)) {
      addIssue(
        issues,
        path,
        field,
        'production, authentication, or manifest-promotion fields are forbidden',
        packetId,
        manifestItemId,
        decisionId,
      );
    }
  }

  if (decision.schemaVersion !== governance.schemaVersion) {
    addIssue(
      issues,
      path,
      'schemaVersion',
      `must be ${governance.schemaVersion}`,
      packetId,
      manifestItemId,
      decisionId,
    );
  }
  if (decision.subjectFingerprintAlgorithm !== governance.fingerprintAlgorithm) {
    counters.malformedFingerprintCount += 1;
    addIssue(
      issues,
      path,
      'subjectFingerprintAlgorithm',
      `must be ${governance.fingerprintAlgorithm}`,
      packetId,
      manifestItemId,
      decisionId,
    );
  }
  if (!isSiddharSubjectFingerprint(decision.packetFingerprint)) {
    counters.malformedFingerprintCount += 1;
    addIssue(
      issues,
      path,
      'packetFingerprint',
      'must be a lowercase sha256 canonical-JSON fingerprint',
      packetId,
      manifestItemId,
      decisionId,
    );
  }
  if (
    decision.rightsDecisionFingerprint !== governance.noRightsDecisionFingerprint &&
    !isSiddharSubjectFingerprint(decision.rightsDecisionFingerprint)
  ) {
    counters.malformedFingerprintCount += 1;
    addIssue(
      issues,
      path,
      'rightsDecisionFingerprint',
      `must be a lowercase sha256 canonical-JSON fingerprint or ${governance.noRightsDecisionFingerprint}`,
      packetId,
      manifestItemId,
      decisionId,
    );
  }
  if (decisionId === null || !governance.decisionIdPattern.test(decisionId)) {
    addIssue(
      issues,
      path,
      'decisionId',
      'must use SID-ED-DEC-YYYYMMDD-NNN',
      packetId,
      manifestItemId,
      decisionId,
    );
  } else {
    const expectedPath = `${governance.decisionPathPrefix}${decisionId}.json`;
    if (path !== expectedPath) {
      addIssue(
        issues,
        path,
        'decisionId',
        `file path must be ${expectedPath}`,
        packetId,
        manifestItemId,
        decisionId,
      );
    }
  }

  if (packetId === null || !PACKET_ID.test(packetId)) {
    addIssue(
      issues,
      path,
      'packetId',
      'must use SID-SUB-YYYYMMDD-NNN',
      packetId,
      manifestItemId,
      decisionId,
    );
  }
  if (
    manifestItemId === null ||
    !MANIFEST_ID.test(manifestItemId) ||
    !manifestItems.has(manifestItemId)
  ) {
    addIssue(
      issues,
      path,
      'manifestItemId',
      'must reference an existing SID-EV-* manifest item',
      packetId,
      manifestItemId,
      decisionId,
    );
  }

  if (!governance.finalDispositions.includes(decision.finalDisposition)) {
    addIssue(
      issues,
      path,
      'finalDisposition',
      'must use a canonical non-production disposition',
      packetId,
      manifestItemId,
      decisionId,
    );
  }

  const packet = packetId === null ? undefined : packetsById.get(packetId);
  const manifestItem =
    manifestItemId === null ? undefined : manifestItems.get(manifestItemId);
  if (packet === undefined) {
    counters.missingPacketReferenceCount += 1;
    addIssue(
      issues,
      path,
      'packetId',
      'referenced evidence packet is missing',
      packetId,
      manifestItemId,
      decisionId,
    );
  } else if (packet.manifestItemId !== manifestItemId) {
    addIssue(
      issues,
      path,
      'manifestItemId',
      'must match the referenced packet manifestItemId',
      packetId,
      manifestItemId,
      decisionId,
    );
  }

  if (
    !isNonEmptyString(decision.editorialReviewerId) ||
    !governance.reviewerIdPattern.test(decision.editorialReviewerId)
  ) {
    counters.unauthorisedEditorialReviewerCount += 1;
    addIssue(
      issues,
      path,
      'editorialReviewerId',
      'must use a stable SID-REV-* reviewer ID',
      packetId,
      manifestItemId,
      decisionId,
    );
  } else {
    const reviewer = governance.reviewersById.get(decision.editorialReviewerId);
    if (!reviewerIsAuthorisedEditorial(reviewer)) {
      counters.unauthorisedEditorialReviewerCount += 1;
      addIssue(
        issues,
        path,
        'editorialReviewerId',
        'must reference an active, conflict-cleared reviewer authorised for EDITORIAL',
        packetId,
        manifestItemId,
        decisionId,
      );
    }
  }

  if (!isIsoDate(decision.decidedOn)) {
    addIssue(
      issues,
      path,
      'decidedOn',
      'must use a real YYYY-MM-DD date',
      packetId,
      manifestItemId,
      decisionId,
    );
  } else if (decision.decidedOn > today) {
    addIssue(
      issues,
      path,
      'decidedOn',
      'must not be in the future',
      packetId,
      manifestItemId,
      decisionId,
    );
  }

  if (!isNonEmptyString(decision.basis) || decision.basis.trim().length < 20) {
    addIssue(
      issues,
      path,
      'basis',
      'must contain a substantive editorial basis of at least 20 characters',
      packetId,
      manifestItemId,
      decisionId,
    );
  } else {
    if (PLACEHOLDER_LANGUAGE.test(decision.basis)) {
      addIssue(
        issues,
        path,
        'basis',
        'must not contain placeholder or synthetic language',
        packetId,
        manifestItemId,
        decisionId,
      );
    }
    if (FORBIDDEN_APPROVAL_LANGUAGE.test(decision.basis)) {
      counters.forbiddenApprovalLanguageCount += 1;
      addIssue(
        issues,
        path,
        'basis',
        'must not claim authentication, publication approval, or production readiness',
        packetId,
        manifestItemId,
        decisionId,
      );
    }
  }

  if (!isObject(decision.declarations)) {
    addIssue(
      issues,
      path,
      'declarations',
      'must be an object',
      packetId,
      manifestItemId,
      decisionId,
    );
  } else {
    const declarationKeys = Object.keys(decision.declarations).sort((left, right) =>
      left.localeCompare(right),
    );
    if (JSON.stringify(declarationKeys) !== JSON.stringify(governance.requiredDeclarations)) {
      addIssue(
        issues,
        path,
        'declarations',
        'must contain exactly the protected editorial declarations',
        packetId,
        manifestItemId,
        decisionId,
      );
    }
    for (const field of governance.requiredDeclarations) {
      if (decision.declarations[field] !== true) {
        addIssue(
          issues,
          `${path}.declarations`,
          field,
          'must be true',
          packetId,
          manifestItemId,
          decisionId,
        );
      }
    }
  }

  if (packet !== undefined && manifestItem !== undefined) {
    if (packet.submissionStatus !== governance.requiredPacketSubmissionStatus) {
      addIssue(
        issues,
        path,
        'packetSubmissionStatusObserved',
        `referenced packet must be ${governance.requiredPacketSubmissionStatus}`,
        packetId,
        manifestItemId,
        decisionId,
      );
    }
    if (packet.productionEligible !== false) {
      addIssue(
        issues,
        path,
        'packetId',
        'referenced packet must remain non-production',
        packetId,
        manifestItemId,
        decisionId,
      );
    }

    const currentPacketFingerprint = packet._subjectFingerprint;
    if (
      isSiddharSubjectFingerprint(decision.packetFingerprint) &&
      decision.packetFingerprint === currentPacketFingerprint
    ) {
      packetFingerprintFresh = true;
    } else if (isSiddharSubjectFingerprint(decision.packetFingerprint)) {
      counters.stalePacketFingerprintCount += 1;
      addIssue(
        issues,
        path,
        'packetFingerprint',
        'is stale because the canonical evidence packet changed after editorial sign-off',
        packetId,
        manifestItemId,
        decisionId,
      );
    }

    const rightsDecisionId = packet.rights?.decisionId;
    let currentRightsDecisionFingerprint = governance.noRightsDecisionFingerprint;
    if (
      isNonEmptyString(rightsDecisionId) &&
      rightsDecisionId !== 'UNRESOLVED'
    ) {
      const rightsDecision = rightsDecisionsById.get(rightsDecisionId);
      if (rightsDecision === undefined) {
        addIssue(
          issues,
          path,
          'rightsDecisionFingerprint',
          'cannot resolve the packet rights decision for subject fingerprint verification',
          packetId,
          manifestItemId,
          decisionId,
        );
      } else {
        currentRightsDecisionFingerprint = rightsDecision.fingerprint;
      }
    }

    if (
      (decision.rightsDecisionFingerprint === governance.noRightsDecisionFingerprint ||
        isSiddharSubjectFingerprint(decision.rightsDecisionFingerprint)) &&
      decision.rightsDecisionFingerprint === currentRightsDecisionFingerprint
    ) {
      rightsDecisionFingerprintFresh = true;
    } else if (
      decision.rightsDecisionFingerprint === governance.noRightsDecisionFingerprint ||
      isSiddharSubjectFingerprint(decision.rightsDecisionFingerprint)
    ) {
      counters.staleRightsDecisionFingerprintCount += 1;
      addIssue(
        issues,
        path,
        'rightsDecisionFingerprint',
        'is stale because the referenced rights decision changed after editorial sign-off',
        packetId,
        manifestItemId,
        decisionId,
      );
    }

    fingerprintState =
      packetFingerprintFresh && rightsDecisionFingerprintFresh ? 'FRESH' : 'STALE';

    const snapshots = [
      ['manifestStatusObserved', manifestItem.status],
      ['packetSubmissionStatusObserved', packet.submissionStatus],
      ['packetProposedDispositionObserved', packet.proposedDisposition],
      ['rightsStatusObserved', packet.rights?.status],
      ['rightsDecisionIdObserved', packet.rights?.decisionId],
    ];
    for (const [field, expected] of snapshots) {
      if (decision[field] !== expected) {
        addIssue(
          issues,
          path,
          field,
          'must match the current referenced packet and manifest state',
          packetId,
          manifestItemId,
          decisionId,
        );
      }
    }

    if (isIsoDate(packet.submittedOn) && isIsoDate(decision.decidedOn)) {
      if (decision.decidedOn < packet.submittedOn) {
        addIssue(
          issues,
          path,
          'decidedOn',
          'must not predate packet submission',
          packetId,
          manifestItemId,
          decisionId,
        );
      }
    }

    const editorialReview = packet.review?.EDITORIAL;
    if (
      !isObject(editorialReview) ||
      editorialReview.status !== 'COMPLETE' ||
      editorialReview.reviewer !== decision.editorialReviewerId
    ) {
      addIssue(
        issues,
        path,
        'editorialReviewerId',
        'must match the completed packet EDITORIAL review',
        packetId,
        manifestItemId,
        decisionId,
      );
    }

    const actualCompletedRoles = completedReviewRoles(
      packet,
      submissionContract.reviewRoles,
    );
    if (
      !Array.isArray(decision.completedReviewRolesObserved) ||
      decision.completedReviewRolesObserved.some((role) => !isNonEmptyString(role))
    ) {
      addIssue(
        issues,
        path,
        'completedReviewRolesObserved',
        'must be a string array',
        packetId,
        manifestItemId,
        decisionId,
      );
    } else {
      const observed = uniqueSorted(decision.completedReviewRolesObserved);
      if (observed.length !== decision.completedReviewRolesObserved.length) {
        addIssue(
          issues,
          path,
          'completedReviewRolesObserved',
          'must contain unique roles',
          packetId,
          manifestItemId,
          decisionId,
        );
      }
      if (
        observed.some(
          (role, index) => role !== decision.completedReviewRolesObserved[index],
        )
      ) {
        addIssue(
          issues,
          path,
          'completedReviewRolesObserved',
          'must be sorted',
          packetId,
          manifestItemId,
          decisionId,
        );
      }
      if (JSON.stringify(observed) !== JSON.stringify(actualCompletedRoles)) {
        addIssue(
          issues,
          path,
          'completedReviewRolesObserved',
          'must snapshot the current completed packet review roles exactly',
          packetId,
          manifestItemId,
          decisionId,
        );
      }
    }

    const requiredRoles =
      governance.requiredReviewRolesByDisposition.get(decision.finalDisposition) ?? [];
    for (const role of requiredRoles) {
      const review = packet.review?.[role];
      if (!isObject(review) || review.status !== 'COMPLETE') {
        counters.incompleteRequiredReviewCount += 1;
        addIssue(
          issues,
          path,
          'finalDisposition',
          `${decision.finalDisposition} requires completed ${role} review`,
          packetId,
          manifestItemId,
          decisionId,
        );
        continue;
      }
      if (
        isIsoDate(review.reviewedOn) &&
        isIsoDate(decision.decidedOn) &&
        decision.decidedOn < review.reviewedOn
      ) {
        addIssue(
          issues,
          path,
          'decidedOn',
          `must not predate required ${role} review`,
          packetId,
          manifestItemId,
          decisionId,
        );
      }
    }

    const rightsState = packetRightsState(packet);
    const allowedRightsStates =
      governance.allowedRightsStatesByDisposition.get(decision.finalDisposition) ?? [];
    if (!allowedRightsStates.includes(rightsState)) {
      counters.rightsDispositionConflictCount += 1;
      addIssue(
        issues,
        path,
        'finalDisposition',
        `${decision.finalDisposition} is incompatible with rights state ${rightsState}`,
        packetId,
        manifestItemId,
        decisionId,
      );
    }

    if (
      manifestItem.status === governance.contradictedManifestStatus &&
      !governance.contradictedAllowedDispositions.includes(decision.finalDisposition)
    ) {
      counters.contradictionBlockCount += 1;
      addIssue(
        issues,
        path,
        'finalDisposition',
        'contradicted manifest items remain blocked from release-candidate dispositions',
        packetId,
        manifestItemId,
        decisionId,
      );
    }
  }

  if (packet === undefined) {
    fingerprintState = 'INVALID';
  }
  fingerprintAssessments.push({
    decisionId,
    packetId,
    manifestItemId,
    fingerprintState,
    packetFingerprintFresh,
    rightsDecisionFingerprintFresh,
  });

  if (packetId !== null) {
    const decisions = decisionsByPacket.get(packetId) ?? [];
    decisions.push(decisionId ?? path);
    decisionsByPacket.set(packetId, decisions);
  }

  if (issues.length !== initialIssueCount) {
    return null;
  }

  return {
    ...decision,
    path,
    rightsState: packetRightsState(packet),
  };
}

function readinessState({ manifestItem, packets, decisions, governance }) {
  if (packets.length === 0) {
    return 'NO_PACKET';
  }

  const validDecisions = decisions.filter((decision) => decision !== null);
  if (manifestItem.status === governance.contradictedManifestStatus) {
    if (validDecisions.some((decision) => decision.finalDisposition === 'REJECT_EVIDENCE')) {
      return 'REJECTED';
    }
    if (validDecisions.some((decision) => decision.finalDisposition === 'HOLD_FOR_REVIEW')) {
      return 'HOLD';
    }
    if (
      validDecisions.some(
        (decision) => decision.finalDisposition === 'CORRECTION_EVIDENCE_ONLY',
      )
    ) {
      return 'CORRECTION_ONLY';
    }
    return 'BLOCKED_CONTRADICTION';
  }

  if (
    validDecisions.some(
      (decision) =>
        governance.releaseCandidateDispositions.includes(decision.finalDisposition),
    )
  ) {
    return 'NONPRODUCTION_READY';
  }
  if (validDecisions.some((decision) => decision.finalDisposition === 'REJECT_EVIDENCE')) {
    return 'REJECTED';
  }
  if (
    validDecisions.some(
      (decision) => decision.finalDisposition === 'CORRECTION_EVIDENCE_ONLY',
    )
  ) {
    return 'CORRECTION_ONLY';
  }
  if (validDecisions.some((decision) => decision.finalDisposition === 'HOLD_FOR_REVIEW')) {
    return 'HOLD';
  }
  return 'AWAITING_DECISION';
}

export function validateSiddharEditorialDisposition({
  governanceDocument,
  reviewerGovernance,
  rightsGovernance,
  manifest,
  packetFiles,
  rightsDecisionFiles,
  editorialDecisionFiles,
  repositoryRootPath = repositoryRoot,
  submissionContract = SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT,
  today = new Date().toISOString().slice(0, 10),
}) {
  const issues = [];
  const counters = {
    malformedDecisionCount: 0,
    missingPacketReferenceCount: 0,
    unauthorisedEditorialReviewerCount: 0,
    forbiddenApprovalLanguageCount: 0,
    incompleteRequiredReviewCount: 0,
    rightsDispositionConflictCount: 0,
    contradictionBlockCount: 0,
    duplicatePacketDecisionCount: 0,
    malformedFingerprintCount: 0,
    stalePacketFingerprintCount: 0,
    staleRightsDecisionFingerprintCount: 0,
  };

  if (!isIsoDate(today)) {
    addIssue(issues, '(runtime)', 'today', 'must use a real YYYY-MM-DD date');
  }

  const governance = parseSiddharEditorialDispositionGovernance({
    document: governanceDocument,
    reviewerGovernance,
    submissionContract,
    issues,
  });
  const manifestItems = buildManifestMap(manifest, issues);
  const packetsById = buildPacketMap(packetFiles, issues);
  const rightsDecisionsById = buildRightsDecisionMap(rightsDecisionFiles);
  const upstream = validateUpstream({
    manifest,
    packetFiles,
    reviewerGovernance,
    rightsGovernance,
    rightsDecisionFiles,
    repositoryRootPath,
    submissionContract,
    today,
    issues,
  });

  const decisionsByPacket = new Map();
  const validDecisions = [];
  const fingerprintAssessments = [];
  const seenDecisionIds = new Set();

  for (const decisionFile of [...editorialDecisionFiles].sort((left, right) =>
    left.path.localeCompare(right.path),
  )) {
    const rawDecisionId = isObject(decisionFile.value)
      ? decisionFile.value.decisionId
      : null;
    if (isNonEmptyString(rawDecisionId)) {
      if (seenDecisionIds.has(rawDecisionId)) {
        addIssue(
          issues,
          decisionFile.path,
          'decisionId',
          'must be unique',
          decisionFile.value.packetId ?? null,
          decisionFile.value.manifestItemId ?? null,
          rawDecisionId,
        );
      }
      seenDecisionIds.add(rawDecisionId);
    }

    validDecisions.push(
      validateEditorialDecision({
        decisionFile,
        governance,
        manifestItems,
        packetsById,
        rightsDecisionsById,
        submissionContract,
        today,
        issues,
        counters,
        decisionsByPacket,
        fingerprintAssessments,
      }),
    );
  }

  for (const [packetId, decisionIds] of decisionsByPacket.entries()) {
    if (decisionIds.length > 1) {
      counters.duplicatePacketDecisionCount += 1;
      addIssue(
        issues,
        '(editorial decisions)',
        'packetId',
        `${packetId} is referenced by ${decisionIds.length} editorial decisions; exactly one current decision is allowed`,
        packetId,
      );
    }
  }

  const packetsByManifest = new Map();
  for (const packet of packetsById.values()) {
    const packets = packetsByManifest.get(packet.manifestItemId) ?? [];
    packets.push(packet);
    packetsByManifest.set(packet.manifestItemId, packets);
  }

  const decisionsByManifest = new Map();
  for (const decision of validDecisions) {
    if (decision === null) continue;
    const decisions = decisionsByManifest.get(decision.manifestItemId) ?? [];
    decisions.push(decision);
    decisionsByManifest.set(decision.manifestItemId, decisions);
  }

  const readinessByManifestItem = [...manifestItems.values()]
    .map((manifestItem) => {
      const packets = packetsByManifest.get(manifestItem.id) ?? [];
      const decisions = decisionsByManifest.get(manifestItem.id) ?? [];
      return {
        manifestItemId: manifestItem.id,
        siddhar: manifestItem.siddhar,
        itemTitle: manifestItem.itemTitle,
        priority: manifestItem.priority,
        evidenceStatus: manifestItem.status,
        packetCount: packets.length,
        validEditorialDecisionCount: decisions.length,
        readinessState: readinessState({
          manifestItem,
          packets,
          decisions,
          governance,
        }),
      };
    })
    .sort((left, right) => left.manifestItemId.localeCompare(right.manifestItemId));

  const readinessCounts = Object.fromEntries(
    uniqueSorted(readinessByManifestItem.map((item) => item.readinessState)).map(
      (state) => [
        state,
        readinessByManifestItem.filter((item) => item.readinessState === state).length,
      ],
    ),
  );

  const fingerprintCoverageByManifestItem = [...manifestItems.values()]
    .map((manifestItem) => {
      const assessments = fingerprintAssessments.filter(
        (assessment) => assessment.manifestItemId === manifestItem.id,
      );
      const freshDecisionCount = assessments.filter(
        (assessment) => assessment.fingerprintState === 'FRESH',
      ).length;
      const staleDecisionCount = assessments.filter(
        (assessment) => assessment.fingerprintState === 'STALE',
      ).length;
      const invalidDecisionCount = assessments.filter(
        (assessment) => assessment.fingerprintState === 'INVALID',
      ).length;
      let fingerprintState = 'NO_DECISION';
      if (staleDecisionCount > 0) {
        fingerprintState = 'STALE';
      } else if (invalidDecisionCount > 0) {
        fingerprintState = 'INVALID';
      } else if (freshDecisionCount > 0) {
        fingerprintState = 'FRESH';
      }
      return {
        manifestItemId: manifestItem.id,
        siddhar: manifestItem.siddhar,
        priority: manifestItem.priority,
        decisionCount: assessments.length,
        freshDecisionCount,
        staleDecisionCount,
        invalidDecisionCount,
        fingerprintState,
      };
    })
    .sort((left, right) => left.manifestItemId.localeCompare(right.manifestItemId));

  const fingerprintCounts = {
    FRESH: fingerprintAssessments.filter(
      (assessment) => assessment.fingerprintState === 'FRESH',
    ).length,
    STALE: fingerprintAssessments.filter(
      (assessment) => assessment.fingerprintState === 'STALE',
    ).length,
    INVALID: fingerprintAssessments.filter(
      (assessment) => assessment.fingerprintState === 'INVALID',
    ).length,
    NO_DECISION: fingerprintCoverageByManifestItem.filter(
      (item) => item.fingerprintState === 'NO_DECISION',
    ).length,
  };

  return {
    ok: issues.length === 0,
    governanceSchemaVersion: governance.schemaVersion,
    manifestItemCount: manifestItems.size,
    packetFileCount: packetFiles.length,
    rightsDecisionFileCount: rightsDecisionFiles.length,
    editorialDecisionFileCount: editorialDecisionFiles.length,
    validEditorialDecisionCount: validDecisions.filter((decision) => decision !== null)
      .length,
    malformedDecisionCount: counters.malformedDecisionCount,
    missingPacketReferenceCount: counters.missingPacketReferenceCount,
    unauthorisedEditorialReviewerCount: counters.unauthorisedEditorialReviewerCount,
    forbiddenApprovalLanguageCount: counters.forbiddenApprovalLanguageCount,
    incompleteRequiredReviewCount: counters.incompleteRequiredReviewCount,
    rightsDispositionConflictCount: counters.rightsDispositionConflictCount,
    contradictionBlockCount: counters.contradictionBlockCount,
    duplicatePacketDecisionCount: counters.duplicatePacketDecisionCount,
    malformedFingerprintCount: counters.malformedFingerprintCount,
    stalePacketFingerprintCount: counters.stalePacketFingerprintCount,
    staleRightsDecisionFingerprintCount: counters.staleRightsDecisionFingerprintCount,
    freshFingerprintDecisionCount: fingerprintCounts.FRESH,
    staleFingerprintDecisionCount: fingerprintCounts.STALE,
    invalidFingerprintDecisionCount: fingerprintCounts.INVALID,
    noDecisionFingerprintManifestItems: fingerprintCounts.NO_DECISION,
    nonProductionReadyManifestItems: readinessByManifestItem.filter(
      (item) => item.readinessState === 'NONPRODUCTION_READY',
    ).length,
    contradictedBlockedManifestItems: readinessByManifestItem.filter(
      (item) => item.readinessState === 'BLOCKED_CONTRADICTION',
    ).length,
    noPacketManifestItems: readinessByManifestItem.filter(
      (item) => item.readinessState === 'NO_PACKET',
    ).length,
    readinessCounts,
    upstream: {
      submissionsOk: upstream.submissions.ok,
      sourceFileIntegrityOk: upstream.files.ok,
      sourceCoverageOk: upstream.coverage.ok,
      reviewerGovernanceOk: upstream.reviewers.ok,
      rightsProvenanceOk: upstream.rights.ok,
    },
    automaticManifestChanges: 0,
    productionEligibleItems: 0,
    publicationApprovals: 0,
    fingerprintAlgorithm: governance.fingerprintAlgorithm,
    fingerprintCounts,
    fingerprintCoverageByManifestItem,
    readinessByManifestItem,
    issues: issues.sort((left, right) =>
      `${left.path}:${left.field}:${left.message}`.localeCompare(
        `${right.path}:${right.field}:${right.message}`,
      ),
    ),
  };
}

function loadJsonFiles(directory) {
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => {
      const absolutePath = resolve(directory, entry.name);
      const path = toRepositoryPath(repositoryRoot, absolutePath);
      try {
        return { path, value: JSON.parse(readFileSync(absolutePath, 'utf8')) };
      } catch (error) {
        return {
          path,
          value: null,
          parseError: error instanceof Error ? error.message : 'invalid JSON',
        };
      }
    });
}

function run() {
  const result = validateSiddharEditorialDisposition({
    governanceDocument: JSON.parse(readFileSync(governancePath, 'utf8')),
    reviewerGovernance: JSON.parse(readFileSync(reviewerGovernancePath, 'utf8')),
    rightsGovernance: JSON.parse(readFileSync(rightsGovernancePath, 'utf8')),
    manifest: JSON.parse(readFileSync(manifestPath, 'utf8')),
    packetFiles: loadJsonFiles(submissionsDirectory),
    rightsDecisionFiles: loadJsonFiles(rightsDecisionsDirectory),
    editorialDecisionFiles: loadJsonFiles(editorialDecisionsDirectory),
  });

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  if (!result.ok) {
    for (const issue of result.issues) {
      console.error(`${issue.path}: ${issue.field}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Siddhar editorial disposition passed: ${result.validEditorialDecisionCount}/${result.editorialDecisionFileCount} decisions valid, ` +
      `${result.freshFingerprintDecisionCount} fresh / ${result.staleFingerprintDecisionCount} stale subject fingerprints, ` +
      `${result.nonProductionReadyManifestItems}/${result.manifestItemCount} manifest items non-production ready, ` +
      `${result.contradictedBlockedManifestItems} contradicted items blocked, ` +
      '0 automatic manifest changes, 0 production-eligible items, 0 publication approvals.',
  );
  console.log(`Evidence: ${toRepositoryPath(repositoryRoot, reportPath)}`);
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  run();
}
