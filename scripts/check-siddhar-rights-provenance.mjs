import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectEvidenceMimeType } from './check-siddhar-evidence-file-integrity.mjs';
import { SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT } from './check-siddhar-evidence-submissions.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const rightsGovernancePath = resolve(repositoryRoot, 'config/siddhar-rights-governance.json');
const reviewerGovernancePath = resolve(repositoryRoot, 'config/siddhar-reviewer-governance.json');
const manifestPath = resolve(
  repositoryRoot,
  'docs/content-intake/evidence/siddhar-evidence-manifest.json',
);
const submissionsDirectory = resolve(
  repositoryRoot,
  'docs/content-intake/evidence/submissions',
);
const decisionsDirectory = resolve(
  repositoryRoot,
  'docs/content-intake/evidence/rights/decisions',
);
const reportPath = resolve(repositoryRoot, 'quality-evidence/siddhar-rights-provenance.json');

const EXPECTED_DECISION_PREFIX = 'docs/content-intake/evidence/rights/decisions/';
const EXPECTED_PERMISSION_PREFIX = 'docs/content-intake/evidence/uploads/rights/';
const PACKET_ID = /^SID-SUB-\d{8}-\d{3}$/;
const MANIFEST_ID = /^SID-EV-\d{3}$/;
const SHA256 = /^[a-f0-9]{64}$/i;
const PLACEHOLDER_LANGUAGE =
  /(REPLACE_|YYYY-MM-DD|UNASSIGNED|UNRESOLVED|UNKNOWN_OR_DOCUMENTED|example\.invalid|\bTBD\b|\bTODO\b|\bDUMMY\b|\bSYNTHETIC\b|AI[-_ ]GENERATED)/i;
const DECLARATION_FIELDS = [
  'containsNoSecretsOrPersonalData',
  'noAutomaticStatusPromotion',
  'noProductionUse',
  'privateCorrespondenceStoredOutsideRepository',
];
const MIME_BY_EXTENSION = Object.freeze({
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
});

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

function repositoryPath(root, absolutePath) {
  return relative(root, absolutePath).replaceAll('\\', '/');
}

function isContainedPath(root, absolutePath) {
  const relativePath = relative(root, absolutePath);
  return (
    relativePath !== '' &&
    relativePath !== '..' &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath)
  );
}

function addIssue(issues, path, field, message, packetId = null, manifestItemId = null) {
  issues.push({ path, field, message, packetId, manifestItemId });
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

function parseSortedStringArray(document, field, path, issues, { allowEmpty = false } = {}) {
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

function containsForbiddenBroadAssertion(value, forbiddenAssertions) {
  if (!isNonEmptyString(value)) {
    return false;
  }
  const upper = value.toUpperCase();
  return forbiddenAssertions.some((assertion) => {
    const term = assertion.toUpperCase();
    return upper.includes(term) && !upper.includes(`NOT ${term}`);
  });
}

function containsPlaceholder(value) {
  return isNonEmptyString(value) && PLACEHOLDER_LANGUAGE.test(value);
}

function buildManifestMap(manifest, issues) {
  const path = 'docs/content-intake/evidence/siddhar-evidence-manifest.json';
  const items = new Map();
  if (!isObject(manifest) || !Array.isArray(manifest.items)) {
    addIssue(issues, path, 'items', 'must be an array');
    return items;
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
    items.set(item.id, item);
  }
  return items;
}

function parseReviewerRegistry(reviewerGovernance, issues) {
  const path = 'config/siddhar-reviewer-governance.json';
  const reviewersById = new Map();
  if (!isObject(reviewerGovernance)) {
    addIssue(issues, path, '(document)', 'must be a JSON object');
    return { reviewerIdPattern: /a^/, reviewersById };
  }
  const reviewerIdPattern = compileAnchoredPattern(
    reviewerGovernance.reviewerIdPattern,
    path,
    'reviewerIdPattern',
    issues,
  );
  if (!Array.isArray(reviewerGovernance.reviewers)) {
    addIssue(issues, path, 'reviewers', 'must be an array');
    return { reviewerIdPattern, reviewersById };
  }
  reviewerGovernance.reviewers.forEach((reviewer, index) => {
    const reviewerPath = `${path}#reviewers[${index}]`;
    if (!isObject(reviewer) || !isNonEmptyString(reviewer.reviewerId)) {
      addIssue(issues, reviewerPath, 'reviewerId', 'must be a non-empty reviewer ID');
      return;
    }
    if (!reviewerIdPattern.test(reviewer.reviewerId)) {
      addIssue(issues, reviewerPath, 'reviewerId', 'must match the reviewer ID pattern');
    }
    if (reviewersById.has(reviewer.reviewerId)) {
      addIssue(issues, reviewerPath, 'reviewerId', 'must be unique');
      return;
    }
    reviewersById.set(reviewer.reviewerId, reviewer);
  });
  return { reviewerIdPattern, reviewersById };
}

export function parseSiddharRightsGovernance({
  document,
  reviewerGovernance,
  submissionContract = SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT,
  issues = [],
}) {
  const path = 'config/siddhar-rights-governance.json';
  const reviewerRegistry = parseReviewerRegistry(reviewerGovernance, issues);
  const defaults = {
    schemaVersion: 1,
    decisionIdPattern: /a^/,
    permissionRecordIdPattern: /a^/,
    decisionPathPrefix: EXPECTED_DECISION_PREFIX,
    permissionEvidencePathPrefix: EXPECTED_PERMISSION_PREFIX,
    authoritativeStatuses: [],
    nonAuthoritativeStatuses: [],
    allowedReuseScopes: new Map(),
    authorisedReviewerIds: new Set(),
    forbiddenBroadAssertions: [],
    reviewersById: reviewerRegistry.reviewersById,
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
  const permissionRecordIdPattern = compileAnchoredPattern(
    document.permissionRecordIdPattern,
    path,
    'permissionRecordIdPattern',
    issues,
  );

  if (document.decisionPathPrefix !== EXPECTED_DECISION_PREFIX) {
    addIssue(issues, path, 'decisionPathPrefix', `must remain ${EXPECTED_DECISION_PREFIX}`);
  }
  if (document.permissionEvidencePathPrefix !== EXPECTED_PERMISSION_PREFIX) {
    addIssue(
      issues,
      path,
      'permissionEvidencePathPrefix',
      `must remain ${EXPECTED_PERMISSION_PREFIX}`,
    );
  }

  const authoritativeStatuses = parseSortedStringArray(
    document,
    'authoritativeStatuses',
    path,
    issues,
  );
  const nonAuthoritativeStatuses = parseSortedStringArray(
    document,
    'nonAuthoritativeStatuses',
    path,
    issues,
  );
  const statusPartition = uniqueSorted([
    ...authoritativeStatuses,
    ...nonAuthoritativeStatuses,
  ]);
  if (
    JSON.stringify(statusPartition) !==
    JSON.stringify(uniqueSorted(submissionContract.rightsStatuses))
  ) {
    addIssue(
      issues,
      path,
      'rightsStatuses',
      'authoritative and non-authoritative statuses must partition the canonical rights statuses',
    );
  }
  for (const status of authoritativeStatuses) {
    if (nonAuthoritativeStatuses.includes(status)) {
      addIssue(issues, path, 'rightsStatuses', `${status} cannot be in both status groups`);
    }
  }

  const allowedReuseScopes = new Map();
  if (!isObject(document.allowedReuseScopes)) {
    addIssue(issues, path, 'allowedReuseScopes', 'must be an object');
  } else {
    const observedStatuses = Object.keys(document.allowedReuseScopes).sort((left, right) =>
      left.localeCompare(right),
    );
    if (JSON.stringify(observedStatuses) !== JSON.stringify(statusPartition)) {
      addIssue(
        issues,
        path,
        'allowedReuseScopes',
        'must define exactly one scope array for every canonical rights status',
      );
    }
    for (const status of observedStatuses) {
      const scopes = document.allowedReuseScopes[status];
      if (
        !Array.isArray(scopes) ||
        scopes.length === 0 ||
        scopes.some((scope) => !isNonEmptyString(scope))
      ) {
        addIssue(issues, path, `allowedReuseScopes.${status}`, 'must be a non-empty string array');
        continue;
      }
      const normalised = uniqueSorted(scopes);
      if (normalised.length !== scopes.length) {
        addIssue(issues, path, `allowedReuseScopes.${status}`, 'must contain unique values');
      }
      if (normalised.some((scope, index) => scope !== scopes[index])) {
        addIssue(issues, path, `allowedReuseScopes.${status}`, 'must be sorted');
      }
      allowedReuseScopes.set(status, normalised);
    }
  }

  for (const status of nonAuthoritativeStatuses) {
    const scopes = allowedReuseScopes.get(status) ?? [];
    if (JSON.stringify(scopes) !== JSON.stringify(['NO_REUSE_APPROVED'])) {
      addIssue(
        issues,
        path,
        `allowedReuseScopes.${status}`,
        'non-authoritative rights statuses must allow only NO_REUSE_APPROVED',
      );
    }
  }

  const authorisedReviewerIds = parseSortedStringArray(
    document,
    'authorisedReviewerIds',
    path,
    issues,
    { allowEmpty: true },
  );
  for (const reviewerId of authorisedReviewerIds) {
    if (!reviewerRegistry.reviewerIdPattern.test(reviewerId)) {
      addIssue(issues, path, 'authorisedReviewerIds', `${reviewerId} has an invalid reviewer ID`);
      continue;
    }
    const reviewer = reviewerRegistry.reviewersById.get(reviewerId);
    if (reviewer === undefined) {
      addIssue(issues, path, 'authorisedReviewerIds', `${reviewerId} is not registered`);
      continue;
    }
    if (
      reviewer.active !== true ||
      reviewer.conflictOfInterestDeclared !== true ||
      !Array.isArray(reviewer.approvedRoles) ||
      !reviewer.approvedRoles.includes('EDITORIAL')
    ) {
      addIssue(
        issues,
        path,
        'authorisedReviewerIds',
        `${reviewerId} must be active, conflict-cleared, and approved for EDITORIAL review`,
      );
    }
  }

  const forbiddenBroadAssertions = parseSortedStringArray(
    document,
    'forbiddenBroadAssertions',
    path,
    issues,
  );
  if (forbiddenBroadAssertions.some((assertion) => assertion.trim().length < 4)) {
    addIssue(issues, path, 'forbiddenBroadAssertions', 'entries must contain at least four characters');
  }

  return {
    schemaVersion: 1,
    decisionIdPattern,
    permissionRecordIdPattern,
    decisionPathPrefix: EXPECTED_DECISION_PREFIX,
    permissionEvidencePathPrefix: EXPECTED_PERMISSION_PREFIX,
    authoritativeStatuses,
    nonAuthoritativeStatuses,
    allowedReuseScopes,
    authorisedReviewerIds: new Set(authorisedReviewerIds),
    forbiddenBroadAssertions,
    reviewersById: reviewerRegistry.reviewersById,
  };
}

function validateSafeRepositoryPath({ root, path, prefix, issues, issuePath, field }) {
  if (
    !isNonEmptyString(path) ||
    !path.startsWith(prefix) ||
    path.includes('..') ||
    path.includes('\\') ||
    path.includes('\u0000')
  ) {
    addIssue(issues, issuePath, field, `must be a normalised repository path under ${prefix}`);
    return null;
  }
  const absolutePath = resolve(root, path);
  if (repositoryPath(root, absolutePath) !== path || !isContainedPath(root, absolutePath)) {
    addIssue(issues, issuePath, field, 'must resolve inside the repository root');
    return null;
  }
  return absolutePath;
}

function validatePermissionEvidence({
  permission,
  decision,
  decisionPath,
  governance,
  submissionContract,
  repositoryRootPath,
  today,
  issues,
  observedPermissionRecordIds,
  observedEvidencePaths,
  observedEvidenceHashes,
  counters,
}) {
  if (!isObject(permission)) {
    addIssue(issues, decisionPath, 'permission', 'PERMISSION_GRANTED requires a permission object');
    return null;
  }

  const requiredStrings = [
    'recordId',
    'evidencePath',
    'sha256',
    'mimeType',
    'effectiveOn',
    'scopeStatement',
  ];
  for (const field of requiredStrings) {
    if (!isNonEmptyString(permission[field])) {
      addIssue(issues, `${decisionPath}.permission`, field, 'must be a non-empty string');
    }
  }

  if (
    !isNonEmptyString(permission.recordId) ||
    !governance.permissionRecordIdPattern.test(permission.recordId)
  ) {
    addIssue(
      issues,
      `${decisionPath}.permission`,
      'recordId',
      'must use SID-RGT-PERM-YYYYMMDD-NNN',
    );
  } else if (observedPermissionRecordIds.has(permission.recordId)) {
    addIssue(issues, `${decisionPath}.permission`, 'recordId', 'must be unique');
  } else {
    observedPermissionRecordIds.add(permission.recordId);
  }

  const absolutePath = validateSafeRepositoryPath({
    root: repositoryRootPath,
    path: permission.evidencePath,
    prefix: governance.permissionEvidencePathPrefix,
    issues,
    issuePath: `${decisionPath}.permission`,
    field: 'evidencePath',
  });
  if (isNonEmptyString(permission.evidencePath)) {
    if (observedEvidencePaths.has(permission.evidencePath)) {
      addIssue(issues, `${decisionPath}.permission`, 'evidencePath', 'must be unique');
    } else {
      observedEvidencePaths.add(permission.evidencePath);
    }
  }

  const extension = isNonEmptyString(permission.evidencePath)
    ? extname(permission.evidencePath).toLowerCase()
    : '';
  const expectedMime = MIME_BY_EXTENSION[extension];
  if (!submissionContract.allowedFileExtensions.includes(extension) || expectedMime === undefined) {
    addIssue(issues, `${decisionPath}.permission`, 'evidencePath', 'uses an unapproved evidence extension');
  }
  if (!submissionContract.allowedMimeTypes.includes(permission.mimeType)) {
    addIssue(issues, `${decisionPath}.permission`, 'mimeType', 'uses an unapproved MIME type');
  }
  if (expectedMime !== undefined && permission.mimeType !== expectedMime) {
    addIssue(
      issues,
      `${decisionPath}.permission`,
      'mimeType',
      `does not match extension ${extension}`,
    );
  }

  if (
    !Number.isInteger(permission.sizeBytes) ||
    permission.sizeBytes <= 0 ||
    permission.sizeBytes > submissionContract.maxFileSizeBytes
  ) {
    addIssue(
      issues,
      `${decisionPath}.permission`,
      'sizeBytes',
      `must be a positive integer not exceeding ${submissionContract.maxFileSizeBytes}`,
    );
  }
  if (!isNonEmptyString(permission.sha256) || !SHA256.test(permission.sha256) || /^0{64}$/.test(permission.sha256)) {
    addIssue(
      issues,
      `${decisionPath}.permission`,
      'sha256',
      'must be a non-placeholder 64-character SHA-256 digest',
    );
  }

  if (!isIsoDate(permission.effectiveOn)) {
    addIssue(issues, `${decisionPath}.permission`, 'effectiveOn', 'must use a real YYYY-MM-DD date');
  } else if (permission.effectiveOn > decision.decidedOn) {
    addIssue(issues, `${decisionPath}.permission`, 'effectiveOn', 'must not be after the decision date');
  }
  if (permission.expiresOn !== null) {
    if (!isIsoDate(permission.expiresOn)) {
      addIssue(issues, `${decisionPath}.permission`, 'expiresOn', 'must be null or a real YYYY-MM-DD date');
    } else {
      if (isIsoDate(permission.effectiveOn) && permission.expiresOn < permission.effectiveOn) {
        addIssue(issues, `${decisionPath}.permission`, 'expiresOn', 'must not precede the effective date');
      }
      if (permission.expiresOn < today) {
        counters.expiredPermissionCount += 1;
        addIssue(issues, `${decisionPath}.permission`, 'expiresOn', 'permission evidence has expired');
      }
    }
  }

  for (const [field, value] of [
    ['scopeStatement', permission.scopeStatement],
    ['recordId', permission.recordId],
  ]) {
    if (containsPlaceholder(value)) {
      addIssue(issues, `${decisionPath}.permission`, field, 'must not contain placeholder language');
    }
    if (containsForbiddenBroadAssertion(value, governance.forbiddenBroadAssertions)) {
      counters.broadAssertionFindingCount += 1;
      addIssue(issues, `${decisionPath}.permission`, field, 'contains a forbidden broad rights assertion');
    }
  }

  if (absolutePath === null) {
    return null;
  }
  if (!existsSync(absolutePath)) {
    counters.missingPermissionEvidenceCount += 1;
    addIssue(issues, `${decisionPath}.permission`, 'evidencePath', 'permission evidence file is missing');
    return null;
  }

  let stats;
  try {
    stats = lstatSync(absolutePath);
  } catch (error) {
    addIssue(
      issues,
      `${decisionPath}.permission`,
      'evidencePath',
      `could not inspect permission evidence: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    return null;
  }
  if (stats.isSymbolicLink()) {
    addIssue(issues, `${decisionPath}.permission`, 'evidencePath', 'symbolic links are forbidden');
    return null;
  }
  if (!stats.isFile()) {
    addIssue(issues, `${decisionPath}.permission`, 'evidencePath', 'must reference a regular file');
    return null;
  }

  let realPath;
  try {
    realPath = realpathSync(absolutePath);
  } catch (error) {
    addIssue(
      issues,
      `${decisionPath}.permission`,
      'evidencePath',
      `could not resolve permission evidence: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    return null;
  }
  if (!isContainedPath(realpathSync(repositoryRootPath), realPath)) {
    addIssue(issues, `${decisionPath}.permission`, 'evidencePath', 'resolved outside the repository root');
    return null;
  }

  if (stats.size !== permission.sizeBytes) {
    addIssue(
      issues,
      `${decisionPath}.permission`,
      'sizeBytes',
      `declared ${permission.sizeBytes}; actual ${stats.size}`,
    );
  }
  if (stats.size === 0) {
    addIssue(issues, `${decisionPath}.permission`, 'sizeBytes', 'permission evidence must not be empty');
  }

  let content;
  try {
    content = readFileSync(absolutePath);
  } catch (error) {
    addIssue(
      issues,
      `${decisionPath}.permission`,
      'evidencePath',
      `could not read permission evidence: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    return null;
  }
  const actualHash = createHash('sha256').update(content).digest('hex');
  if (!isNonEmptyString(permission.sha256) || permission.sha256.toLowerCase() !== actualHash) {
    addIssue(
      issues,
      `${decisionPath}.permission`,
      'sha256',
      `declared digest does not match actual sha256:${actualHash}`,
    );
  }
  if (observedEvidenceHashes.has(actualHash)) {
    addIssue(
      issues,
      `${decisionPath}.permission`,
      'sha256',
      'actual permission evidence duplicates another permission record',
    );
  } else {
    observedEvidenceHashes.add(actualHash);
  }

  const detectedMime = detectEvidenceMimeType(content);
  if (detectedMime === null) {
    addIssue(issues, `${decisionPath}.permission`, 'mimeSignature', 'file signature is not recognised');
  } else {
    if (detectedMime !== permission.mimeType) {
      addIssue(
        issues,
        `${decisionPath}.permission`,
        'mimeSignature',
        `detected ${detectedMime}; declared ${permission.mimeType}`,
      );
    }
    if (expectedMime !== undefined && detectedMime !== expectedMime) {
      addIssue(
        issues,
        `${decisionPath}.permission`,
        'evidencePath',
        `detected ${detectedMime}; extension ${extension} expects ${expectedMime}`,
      );
    }
  }

  counters.permissionEvidenceFileCount += 1;
  return {
    recordId: permission.recordId,
    evidencePath: permission.evidencePath,
    sha256: actualHash,
  };
}

function validateDecisionFiles({
  decisionFiles,
  governance,
  submissionContract,
  manifestItems,
  repositoryRootPath,
  today,
  issues,
  counters,
}) {
  const decisionsById = new Map();
  const observedPermissionRecordIds = new Set();
  const observedEvidencePaths = new Set();
  const observedEvidenceHashes = new Set();

  for (const decisionFile of [...decisionFiles].sort((left, right) => left.path.localeCompare(right.path))) {
    const decisionPath = decisionFile.path;
    const initialIssueCount = issues.length;
    if (decisionFile.parseError !== undefined) {
      counters.malformedDecisionCount += 1;
      addIssue(issues, decisionPath, '(json)', `invalid JSON: ${decisionFile.parseError}`);
      continue;
    }
    if (!isObject(decisionFile.value)) {
      counters.malformedDecisionCount += 1;
      addIssue(issues, decisionPath, '(decision)', 'must be a JSON object');
      continue;
    }

    const decision = decisionFile.value;
    if (decision.schemaVersion !== 1) {
      addIssue(issues, decisionPath, 'schemaVersion', 'must be 1');
    }
    if (!isNonEmptyString(decision.decisionId) || !governance.decisionIdPattern.test(decision.decisionId)) {
      addIssue(issues, decisionPath, 'decisionId', 'must use SID-RGT-DEC-YYYYMMDD-NNN');
    } else {
      const expectedPath = `${governance.decisionPathPrefix}${decision.decisionId}.json`;
      if (decisionPath !== expectedPath) {
        addIssue(issues, decisionPath, 'decisionId', `file path must be ${expectedPath}`);
      }
      if (decisionsById.has(decision.decisionId)) {
        addIssue(issues, decisionPath, 'decisionId', 'must be unique');
      }
    }

    if (!isNonEmptyString(decision.packetId) || !PACKET_ID.test(decision.packetId)) {
      addIssue(issues, decisionPath, 'packetId', 'must use SID-SUB-YYYYMMDD-NNN');
    }
    if (
      !isNonEmptyString(decision.manifestItemId) ||
      !MANIFEST_ID.test(decision.manifestItemId) ||
      !manifestItems.has(decision.manifestItemId)
    ) {
      addIssue(issues, decisionPath, 'manifestItemId', 'must reference an existing SID-EV-* item');
    }
    if (!governance.authoritativeStatuses.includes(decision.rightsStatus)) {
      addIssue(
        issues,
        decisionPath,
        'rightsStatus',
        'decision records may contain only authoritative rights statuses',
      );
    }
    if (
      !isNonEmptyString(decision.rightsReviewerId) ||
      !governance.authorisedReviewerIds.has(decision.rightsReviewerId)
    ) {
      counters.unauthorisedRightsReviewerCount += 1;
      addIssue(
        issues,
        decisionPath,
        'rightsReviewerId',
        'must reference an authorised rights reviewer',
      );
    }
    if (!isIsoDate(decision.decidedOn)) {
      addIssue(issues, decisionPath, 'decidedOn', 'must use a real YYYY-MM-DD date');
    } else if (decision.decidedOn > today) {
      addIssue(issues, decisionPath, 'decidedOn', 'must not be in the future');
    }

    for (const field of ['rightsHolder', 'basis', 'reuseScope']) {
      if (!isNonEmptyString(decision[field])) {
        addIssue(issues, decisionPath, field, 'must be a non-empty string');
      } else {
        if (containsPlaceholder(decision[field])) {
          addIssue(issues, decisionPath, field, 'must not contain placeholder language');
        }
        if (
          containsForbiddenBroadAssertion(
            decision[field],
            governance.forbiddenBroadAssertions,
          )
        ) {
          counters.broadAssertionFindingCount += 1;
          addIssue(issues, decisionPath, field, 'contains a forbidden broad rights assertion');
        }
      }
    }
    const allowedScopes = governance.allowedReuseScopes.get(decision.rightsStatus) ?? [];
    if (!allowedScopes.includes(decision.reuseScope)) {
      addIssue(
        issues,
        decisionPath,
        'reuseScope',
        `is not allowed for ${decision.rightsStatus}`,
      );
    }

    if (!isObject(decision.declarations)) {
      addIssue(issues, decisionPath, 'declarations', 'must be an object');
    } else {
      for (const field of DECLARATION_FIELDS) {
        if (decision.declarations[field] !== true) {
          addIssue(issues, `${decisionPath}.declarations`, field, 'must be true');
        }
      }
    }

    let permissionSummary = null;
    if (decision.rightsStatus === 'PERMISSION_GRANTED') {
      permissionSummary = validatePermissionEvidence({
        permission: decision.permission,
        decision,
        decisionPath,
        governance,
        submissionContract,
        repositoryRootPath,
        today,
        issues,
        observedPermissionRecordIds,
        observedEvidencePaths,
        observedEvidenceHashes,
        counters,
      });
    } else if (decision.permission !== null) {
      addIssue(issues, decisionPath, 'permission', 'RESTRICTED decisions must set permission to null');
    }

    if (issues.length === initialIssueCount && isNonEmptyString(decision.decisionId)) {
      decisionsById.set(decision.decisionId, {
        ...decision,
        path: decisionPath,
        permissionSummary,
        referenceCount: 0,
      });
      if (decision.rightsStatus === 'PERMISSION_GRANTED') {
        counters.permissionGrantedDecisionCount += 1;
      } else if (decision.rightsStatus === 'RESTRICTED') {
        counters.restrictedDecisionCount += 1;
      }
    }
  }

  return decisionsById;
}

function validatePacketRights({
  packetFiles,
  decisionsById,
  governance,
  submissionContract,
  manifestItems,
  today,
  issues,
  counters,
}) {
  const packetIds = new Set();
  const summariesByManifest = new Map();

  for (const packetFile of [...packetFiles].sort((left, right) => left.path.localeCompare(right.path))) {
    const path = packetFile.path;
    if (packetFile.parseError !== undefined) {
      counters.malformedPacketCount += 1;
      addIssue(issues, path, '(json)', `invalid JSON: ${packetFile.parseError}`);
      continue;
    }
    if (!isObject(packetFile.value)) {
      counters.malformedPacketCount += 1;
      addIssue(issues, path, '(packet)', 'must be a JSON object');
      continue;
    }

    const packet = packetFile.value;
    const packetId = isNonEmptyString(packet.packetId) ? packet.packetId : null;
    const manifestItemId = isNonEmptyString(packet.manifestItemId)
      ? packet.manifestItemId
      : null;
    if (packetId === null || !PACKET_ID.test(packetId)) {
      addIssue(issues, path, 'packetId', 'must use SID-SUB-YYYYMMDD-NNN');
    } else if (packetIds.has(packetId)) {
      addIssue(issues, path, 'packetId', 'must be unique');
    } else {
      packetIds.add(packetId);
    }
    if (
      manifestItemId === null ||
      !MANIFEST_ID.test(manifestItemId) ||
      !manifestItems.has(manifestItemId)
    ) {
      addIssue(issues, path, 'manifestItemId', 'must reference an existing SID-EV-* item');
    }
    if (!isIsoDate(packet.submittedOn)) {
      addIssue(issues, path, 'submittedOn', 'must use a real YYYY-MM-DD date');
    } else if (packet.submittedOn > today) {
      addIssue(issues, path, 'submittedOn', 'must not be in the future');
    }
    if (packet.productionEligible !== false) {
      addIssue(issues, path, 'productionEligible', 'must remain false');
    }

    const rights = packet.rights;
    if (!isObject(rights)) {
      addIssue(issues, path, 'rights', 'must be an object');
      continue;
    }
    if (!submissionContract.rightsStatuses.includes(rights.status)) {
      addIssue(issues, `${path}.rights`, 'status', 'must use a canonical rights status');
      continue;
    }
    counters.packetRightsStatusCounts[rights.status] += 1;

    for (const field of ['rightsHolder', 'basis', 'permissionReference', 'reuseScope']) {
      if (!isNonEmptyString(rights[field])) {
        addIssue(issues, `${path}.rights`, field, 'must be a non-empty string');
      } else if (
        containsForbiddenBroadAssertion(rights[field], governance.forbiddenBroadAssertions)
      ) {
        counters.broadAssertionFindingCount += 1;
        addIssue(issues, `${path}.rights`, field, 'contains a forbidden broad rights assertion');
      }
    }
    const allowedScopes = governance.allowedReuseScopes.get(rights.status) ?? [];
    if (!allowedScopes.includes(rights.reuseScope)) {
      addIssue(issues, `${path}.rights`, 'reuseScope', `is not allowed for ${rights.status}`);
    }

    let assignmentState = 'UNRESOLVED';
    if (governance.nonAuthoritativeStatuses.includes(rights.status)) {
      assignmentState =
        rights.status === 'PUBLIC_DOMAIN_CLAIM_UNVERIFIED'
          ? 'PUBLIC_DOMAIN_UNVERIFIED'
          : 'UNRESOLVED';
      for (const [field, expected] of [
        ['decisionId', 'UNRESOLVED'],
        ['decisionRecordPath', 'UNRESOLVED'],
        ['rightsReviewerId', 'UNASSIGNED'],
        ['permissionReference', 'UNRESOLVED'],
        ['reuseScope', 'NO_REUSE_APPROVED'],
      ]) {
        if (rights[field] !== expected) {
          addIssue(
            issues,
            `${path}.rights`,
            field,
            `${rights.status} must use ${expected}`,
            packetId,
            manifestItemId,
          );
        }
      }
      if (rights.decidedOn !== null) {
        addIssue(
          issues,
          `${path}.rights`,
          'decidedOn',
          `${rights.status} must keep decidedOn null`,
          packetId,
          manifestItemId,
        );
      }
    } else {
      const decisionId = rights.decisionId;
      if (!isNonEmptyString(decisionId) || !governance.decisionIdPattern.test(decisionId)) {
        addIssue(
          issues,
          `${path}.rights`,
          'decisionId',
          'authoritative rights statuses require a SID-RGT-DEC-* decision ID',
          packetId,
          manifestItemId,
        );
      }
      const expectedDecisionPath = isNonEmptyString(decisionId)
        ? `${governance.decisionPathPrefix}${decisionId}.json`
        : null;
      if (expectedDecisionPath === null || rights.decisionRecordPath !== expectedDecisionPath) {
        addIssue(
          issues,
          `${path}.rights`,
          'decisionRecordPath',
          'must point to the matching controlled decision record',
          packetId,
          manifestItemId,
        );
      }
      if (!governance.authorisedReviewerIds.has(rights.rightsReviewerId)) {
        counters.unauthorisedRightsReviewerCount += 1;
        addIssue(
          issues,
          `${path}.rights`,
          'rightsReviewerId',
          'must reference an authorised rights reviewer',
          packetId,
          manifestItemId,
        );
      }
      if (!isIsoDate(rights.decidedOn)) {
        addIssue(
          issues,
          `${path}.rights`,
          'decidedOn',
          'must use a real YYYY-MM-DD date',
          packetId,
          manifestItemId,
        );
      } else {
        if (rights.decidedOn > today) {
          addIssue(issues, `${path}.rights`, 'decidedOn', 'must not be in the future');
        }
        if (isIsoDate(packet.submittedOn) && rights.decidedOn < packet.submittedOn) {
          addIssue(
            issues,
            `${path}.rights`,
            'decidedOn',
            'must not precede packet submission',
          );
        }
      }

      const decision = isNonEmptyString(decisionId) ? decisionsById.get(decisionId) : undefined;
      if (decision === undefined) {
        counters.missingDecisionReferenceCount += 1;
        addIssue(
          issues,
          `${path}.rights`,
          'decisionId',
          'referenced rights decision record is missing or invalid',
          packetId,
          manifestItemId,
        );
      } else {
        decision.referenceCount += 1;
        for (const [packetField, decisionField] of [
          ['status', 'rightsStatus'],
          ['rightsHolder', 'rightsHolder'],
          ['basis', 'basis'],
          ['reuseScope', 'reuseScope'],
          ['rightsReviewerId', 'rightsReviewerId'],
          ['decidedOn', 'decidedOn'],
        ]) {
          if (rights[packetField] !== decision[decisionField]) {
            addIssue(
              issues,
              `${path}.rights`,
              packetField,
              `must match ${decision.path}`,
              packetId,
              manifestItemId,
            );
          }
        }
        if (decision.packetId !== packetId) {
          addIssue(issues, `${path}.rights`, 'decisionId', 'decision packetId does not match');
        }
        if (decision.manifestItemId !== manifestItemId) {
          addIssue(issues, `${path}.rights`, 'decisionId', 'decision manifestItemId does not match');
        }
        const expectedReference =
          rights.status === 'PERMISSION_GRANTED'
            ? decision.permissionSummary?.recordId
            : decision.decisionId;
        if (expectedReference === undefined || rights.permissionReference !== expectedReference) {
          addIssue(
            issues,
            `${path}.rights`,
            'permissionReference',
            'must match the verified permission or restriction decision reference',
            packetId,
            manifestItemId,
          );
        }
        assignmentState =
          rights.status === 'PERMISSION_GRANTED'
            ? 'PERMISSION_GRANTED_REVIEWED'
            : 'RESTRICTED_REVIEWED';
      }
    }

    if (manifestItemId !== null && manifestItems.has(manifestItemId)) {
      const states = summariesByManifest.get(manifestItemId) ?? [];
      states.push(assignmentState);
      summariesByManifest.set(manifestItemId, states);
    }
  }

  return summariesByManifest;
}

function chooseManifestRightsState(states) {
  if (states.length === 0) {
    return 'NO_PACKET';
  }
  const priority = [
    'PERMISSION_GRANTED_REVIEWED',
    'RESTRICTED_REVIEWED',
    'PUBLIC_DOMAIN_UNVERIFIED',
    'UNRESOLVED',
  ];
  return priority.find((state) => states.includes(state)) ?? 'UNRESOLVED';
}

export function validateSiddharRightsProvenance({
  rightsGovernance,
  reviewerGovernance,
  manifest,
  packetFiles,
  decisionFiles,
  repositoryRootPath = repositoryRoot,
  submissionContract = SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT,
  today = new Date().toISOString().slice(0, 10),
}) {
  const issues = [];
  const manifestItems = buildManifestMap(manifest, issues);
  const governance = parseSiddharRightsGovernance({
    document: rightsGovernance,
    reviewerGovernance,
    submissionContract,
    issues,
  });
  const counters = {
    permissionGrantedDecisionCount: 0,
    restrictedDecisionCount: 0,
    permissionEvidenceFileCount: 0,
    missingPermissionEvidenceCount: 0,
    expiredPermissionCount: 0,
    broadAssertionFindingCount: 0,
    unauthorisedRightsReviewerCount: 0,
    malformedDecisionCount: 0,
    malformedPacketCount: 0,
    missingDecisionReferenceCount: 0,
    orphanDecisionCount: 0,
    duplicateDecisionReferenceCount: 0,
    packetRightsStatusCounts: Object.fromEntries(
      submissionContract.rightsStatuses.map((status) => [status, 0]),
    ),
  };

  if (!isIsoDate(today)) {
    addIssue(issues, '(runtime)', 'today', 'must use a real YYYY-MM-DD date');
  }

  const decisionsById = validateDecisionFiles({
    decisionFiles,
    governance,
    submissionContract,
    manifestItems,
    repositoryRootPath,
    today,
    issues,
    counters,
  });
  const summariesByManifest = validatePacketRights({
    packetFiles,
    decisionsById,
    governance,
    submissionContract,
    manifestItems,
    today,
    issues,
    counters,
  });

  for (const decision of decisionsById.values()) {
    if (decision.referenceCount === 0) {
      counters.orphanDecisionCount += 1;
      addIssue(
        issues,
        decision.path,
        'decisionId',
        'rights decision is orphaned and must be referenced by exactly one packet',
        decision.packetId,
        decision.manifestItemId,
      );
    } else if (decision.referenceCount > 1) {
      counters.duplicateDecisionReferenceCount += 1;
      addIssue(
        issues,
        decision.path,
        'decisionId',
        `rights decision is referenced by ${decision.referenceCount} packets; exactly one is required`,
        decision.packetId,
        decision.manifestItemId,
      );
    }
  }

  const rightsCoverageByManifestItem = [...manifestItems.values()]
    .map((item) => {
      const states = summariesByManifest.get(item.id) ?? [];
      return {
        manifestItemId: item.id,
        siddhar: item.siddhar,
        itemTitle: item.itemTitle,
        priority: item.priority,
        evidenceStatus: item.status,
        packetCount: states.length,
        rightsState: chooseManifestRightsState(states),
      };
    })
    .sort((left, right) => left.manifestItemId.localeCompare(right.manifestItemId));

  const reviewedManifestItems = rightsCoverageByManifestItem.filter((item) =>
    ['PERMISSION_GRANTED_REVIEWED', 'RESTRICTED_REVIEWED'].includes(item.rightsState),
  ).length;
  const nonProductionManifestItems = rightsCoverageByManifestItem.filter((item) =>
    ['NO_PACKET', 'PUBLIC_DOMAIN_UNVERIFIED', 'UNRESOLVED'].includes(item.rightsState),
  ).length;

  return {
    ok: issues.length === 0,
    governanceSchemaVersion: governance.schemaVersion,
    manifestItemCount: manifestItems.size,
    authorisedRightsReviewerCount: governance.authorisedReviewerIds.size,
    packetFileCount: packetFiles.length,
    decisionFileCount: decisionFiles.length,
    validDecisionCount: decisionsById.size,
    permissionGrantedDecisionCount: counters.permissionGrantedDecisionCount,
    restrictedDecisionCount: counters.restrictedDecisionCount,
    permissionEvidenceFileCount: counters.permissionEvidenceFileCount,
    missingPermissionEvidenceCount: counters.missingPermissionEvidenceCount,
    expiredPermissionCount: counters.expiredPermissionCount,
    broadAssertionFindingCount: counters.broadAssertionFindingCount,
    unauthorisedRightsReviewerCount: counters.unauthorisedRightsReviewerCount,
    malformedDecisionCount: counters.malformedDecisionCount,
    malformedPacketCount: counters.malformedPacketCount,
    missingDecisionReferenceCount: counters.missingDecisionReferenceCount,
    orphanDecisionCount: counters.orphanDecisionCount,
    duplicateDecisionReferenceCount: counters.duplicateDecisionReferenceCount,
    packetRightsStatusCounts: counters.packetRightsStatusCounts,
    reviewedManifestItems,
    nonProductionManifestItems,
    automaticStatusChanges: 0,
    productionEligibleItems: 0,
    rightsCoverageByManifestItem,
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
      const path = repositoryPath(repositoryRoot, absolutePath);
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
  const result = validateSiddharRightsProvenance({
    rightsGovernance: JSON.parse(readFileSync(rightsGovernancePath, 'utf8')),
    reviewerGovernance: JSON.parse(readFileSync(reviewerGovernancePath, 'utf8')),
    manifest: JSON.parse(readFileSync(manifestPath, 'utf8')),
    packetFiles: loadJsonFiles(submissionsDirectory),
    decisionFiles: loadJsonFiles(decisionsDirectory),
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
    `Siddhar rights provenance passed: ${result.authorisedRightsReviewerCount} authorised reviewers, ` +
      `${result.validDecisionCount}/${result.decisionFileCount} decisions valid, ` +
      `${result.permissionEvidenceFileCount} permission evidence files verified, ` +
      `${result.reviewedManifestItems}/${result.manifestItemCount} manifest items rights-reviewed, ` +
      '0 automatic status changes, 0 production-eligible items.',
  );
  console.log(`Evidence: ${repositoryPath(repositoryRoot, reportPath)}`);
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  run();
}
