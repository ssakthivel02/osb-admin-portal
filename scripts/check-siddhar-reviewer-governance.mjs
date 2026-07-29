import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT } from './check-siddhar-evidence-submissions.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const governancePath = resolve(repositoryRoot, 'config/siddhar-reviewer-governance.json');
const manifestPath = resolve(
  repositoryRoot,
  'docs/content-intake/evidence/siddhar-evidence-manifest.json',
);
const submissionsDirectory = resolve(
  repositoryRoot,
  'docs/content-intake/evidence/submissions',
);
const reportPath = resolve(repositoryRoot, 'quality-evidence/siddhar-reviewer-governance.json');
const packetIdPattern = /^SID-SUB-\d{8}-\d{3}$/;
const contactPattern = /(https?:\/\/|www\.|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\+?\d[\d\s().-]{7,}\d)/i;
const genericIdentityPattern = /^(reviewer|person|user|member|expert)[-_ ]?\d*$/i;
const reviewerFields = [
  'active',
  'affiliation',
  'approvedRoles',
  'attestationReference',
  'conflictOfInterestDeclared',
  'publicLabel',
  'registeredOn',
  'reviewerId',
];

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

function toRepositoryPath(root, absolutePath) {
  return relative(root, absolutePath).replaceAll('\\', '/');
}

function addIssue(issues, path, field, message, manifestItemId = null, packetId = null) {
  issues.push({ path, field, message, manifestItemId, packetId });
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function parseSortedArray(document, field, issues, path) {
  const value = document[field];
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((entry) => !isNonEmptyString(entry))
  ) {
    addIssue(issues, path, field, 'must be a non-empty string array');
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

function compileAnchoredPattern(value, field, issues, path) {
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

function containsForbiddenIdentityTerm(value, forbiddenTerms) {
  const upper = value.toUpperCase();
  return forbiddenTerms.some((term) => upper.includes(term.toUpperCase()));
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
    if (!isObject(item) || !isNonEmptyString(item.id)) {
      addIssue(issues, itemPath, 'id', 'must be a non-empty manifest item ID');
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

function parseGovernance(governance, submissionContract, issues, today) {
  const path = 'config/siddhar-reviewer-governance.json';
  const defaults = {
    reviewerIdPattern: /a^/,
    attestationPattern: /a^/,
    unassignedValue: 'UNASSIGNED',
    reviewRoles: submissionContract.reviewRoles,
    approvalRoles: [],
    preparationRoles: [],
    forbiddenIdentityTerms: [],
    reviewersById: new Map(),
    reviewerCount: 0,
    activeReviewerCount: 0,
  };

  if (!isObject(governance)) {
    addIssue(issues, path, '(document)', 'must be a JSON object');
    return defaults;
  }
  if (governance.schemaVersion !== 1) {
    addIssue(issues, path, 'schemaVersion', 'must be 1');
  }

  const reviewerIdPattern = compileAnchoredPattern(
    governance.reviewerIdPattern,
    'reviewerIdPattern',
    issues,
    path,
  );
  const attestationPattern = compileAnchoredPattern(
    governance.attestationPattern,
    'attestationPattern',
    issues,
    path,
  );
  const reviewRoles = parseSortedArray(governance, 'reviewRoles', issues, path);
  const approvalRoles = parseSortedArray(governance, 'approvalRoles', issues, path);
  const preparationRoles = parseSortedArray(governance, 'preparationRoles', issues, path);
  const forbiddenIdentityTerms = parseSortedArray(
    governance,
    'forbiddenIdentityTerms',
    issues,
    path,
  );

  if (JSON.stringify(reviewRoles) !== JSON.stringify(submissionContract.reviewRoles)) {
    addIssue(issues, path, 'reviewRoles', 'must exactly match the canonical submission review roles');
  }
  for (const role of [...approvalRoles, ...preparationRoles]) {
    if (!reviewRoles.includes(role)) {
      addIssue(issues, path, 'roleSeparation', `${role} must be an approved review role`);
    }
  }
  for (const role of approvalRoles) {
    if (preparationRoles.includes(role)) {
      addIssue(issues, path, 'roleSeparation', `${role} cannot be both approval and preparation`);
    }
  }
  const separatedRoles = uniqueSorted([...approvalRoles, ...preparationRoles]);
  if (JSON.stringify(separatedRoles) !== JSON.stringify(reviewRoles)) {
    addIssue(issues, path, 'roleSeparation', 'approval and preparation roles must cover every review role');
  }
  if (governance.unassignedValue !== 'UNASSIGNED') {
    addIssue(issues, path, 'unassignedValue', 'must remain UNASSIGNED');
  }

  const reviewersById = new Map();
  const attestationReferences = new Set();
  let activeReviewerCount = 0;
  if (!Array.isArray(governance.reviewers)) {
    addIssue(issues, path, 'reviewers', 'must be an array');
  } else {
    governance.reviewers.forEach((reviewer, index) => {
      const reviewerPath = `${path}#reviewers[${index}]`;
      if (!isObject(reviewer)) {
        addIssue(issues, reviewerPath, '(reviewer)', 'must be an object');
        return;
      }
      for (const field of Object.keys(reviewer)) {
        if (!reviewerFields.includes(field)) {
          addIssue(
            issues,
            reviewerPath,
            field,
            'is not permitted; keep contact details and private identity mapping outside the repository',
          );
        }
      }
      for (const field of ['reviewerId', 'publicLabel', 'affiliation', 'attestationReference', 'registeredOn']) {
        if (!isNonEmptyString(reviewer[field])) {
          addIssue(issues, reviewerPath, field, 'must be a non-empty string');
        }
      }

      if (!isNonEmptyString(reviewer.reviewerId) || !reviewerIdPattern.test(reviewer.reviewerId)) {
        addIssue(issues, reviewerPath, 'reviewerId', 'must match the stable reviewer ID pattern');
      } else if (reviewersById.has(reviewer.reviewerId)) {
        addIssue(issues, reviewerPath, 'reviewerId', 'must be unique');
      } else {
        reviewersById.set(reviewer.reviewerId, reviewer);
      }

      for (const field of ['publicLabel', 'affiliation']) {
        const value = reviewer[field];
        if (!isNonEmptyString(value)) {
          continue;
        }
        if (
          containsForbiddenIdentityTerm(value, forbiddenIdentityTerms) ||
          genericIdentityPattern.test(value.trim())
        ) {
          addIssue(issues, reviewerPath, field, 'must not use a synthetic, placeholder, or generic identity');
        }
        if (contactPattern.test(value)) {
          addIssue(issues, reviewerPath, field, 'must not contain email, phone, URL, or other contact data');
        }
      }

      const approvedRoles = Array.isArray(reviewer.approvedRoles)
        ? reviewer.approvedRoles
        : [];
      if (
        approvedRoles.length === 0 ||
        approvedRoles.some((role) => !isNonEmptyString(role))
      ) {
        addIssue(issues, reviewerPath, 'approvedRoles', 'must be a non-empty string array');
      } else {
        const normalised = uniqueSorted(approvedRoles);
        if (normalised.length !== approvedRoles.length) {
          addIssue(issues, reviewerPath, 'approvedRoles', 'must contain unique values');
        }
        if (normalised.some((role, roleIndex) => role !== approvedRoles[roleIndex])) {
          addIssue(issues, reviewerPath, 'approvedRoles', 'must be sorted');
        }
        for (const role of normalised) {
          if (!reviewRoles.includes(role)) {
            addIssue(issues, reviewerPath, 'approvedRoles', `${role} is not an approved review role`);
          }
        }
      }

      if (typeof reviewer.active !== 'boolean') {
        addIssue(issues, reviewerPath, 'active', 'must be a boolean');
      }
      if (typeof reviewer.conflictOfInterestDeclared !== 'boolean') {
        addIssue(issues, reviewerPath, 'conflictOfInterestDeclared', 'must be a boolean');
      }
      if (reviewer.active === true) {
        activeReviewerCount += 1;
        if (reviewer.conflictOfInterestDeclared !== true) {
          addIssue(
            issues,
            reviewerPath,
            'conflictOfInterestDeclared',
            'must be true before an active reviewer can be assigned',
          );
        }
      }

      if (
        !isNonEmptyString(reviewer.attestationReference) ||
        !attestationPattern.test(reviewer.attestationReference)
      ) {
        addIssue(
          issues,
          reviewerPath,
          'attestationReference',
          'must match the non-sensitive reviewer attestation pattern',
        );
      } else if (attestationReferences.has(reviewer.attestationReference)) {
        addIssue(issues, reviewerPath, 'attestationReference', 'must be unique');
      } else {
        attestationReferences.add(reviewer.attestationReference);
      }

      if (!isIsoDate(reviewer.registeredOn)) {
        addIssue(issues, reviewerPath, 'registeredOn', 'must use a real YYYY-MM-DD date');
      } else if (reviewer.registeredOn > today) {
        addIssue(issues, reviewerPath, 'registeredOn', 'must not be in the future');
      }
    });
  }

  return {
    reviewerIdPattern,
    attestationPattern,
    unassignedValue: 'UNASSIGNED',
    reviewRoles,
    approvalRoles,
    preparationRoles,
    forbiddenIdentityTerms,
    reviewersById,
    reviewerCount: Array.isArray(governance.reviewers) ? governance.reviewers.length : 0,
    activeReviewerCount,
  };
}

function validatePacketReviews({
  packetFile,
  governance,
  manifestItems,
  submissionContract,
  today,
  issues,
  counters,
}) {
  const { path } = packetFile;
  if (packetFile.parseError !== undefined) {
    counters.malformedPacketCount += 1;
    addIssue(issues, path, '(json)', `invalid JSON: ${packetFile.parseError}`);
    return null;
  }
  if (!isObject(packetFile.value)) {
    counters.malformedPacketCount += 1;
    addIssue(issues, path, '(packet)', 'must be a JSON object');
    return null;
  }

  const packet = packetFile.value;
  const packetId = isNonEmptyString(packet.packetId) ? packet.packetId : null;
  const manifestItemId = isNonEmptyString(packet.manifestItemId) ? packet.manifestItemId : null;
  if (packetId === null || !packetIdPattern.test(packetId)) {
    addIssue(issues, path, 'packetId', 'must use SID-SUB-YYYYMMDD-NNN', manifestItemId, packetId);
  }
  if (manifestItemId === null || !manifestItems.has(manifestItemId)) {
    addIssue(
      issues,
      path,
      'manifestItemId',
      'must reference an existing SID-EV-* manifest item',
      manifestItemId,
      packetId,
    );
  }
  if (!isIsoDate(packet.submittedOn)) {
    addIssue(issues, path, 'submittedOn', 'must use a real YYYY-MM-DD date', manifestItemId, packetId);
  } else if (packet.submittedOn > today) {
    addIssue(issues, path, 'submittedOn', 'must not be in the future', manifestItemId, packetId);
  }
  if (!isObject(packet.review)) {
    addIssue(issues, path, 'review', 'must be an object', manifestItemId, packetId);
    return {
      packetId,
      manifestItemId,
      assignedRoles: new Set(),
      completedRoles: new Set(),
      reviewerIds: new Set(),
      separationConflictCount: 0,
    };
  }

  const assignedRoles = new Set();
  const completedRoles = new Set();
  const reviewerIds = new Set();
  const rolesByReviewer = new Map();

  for (const role of governance.reviewRoles) {
    const review = packet.review[role];
    const rolePath = `${path}.review.${role}`;
    if (!isObject(review)) {
      addIssue(issues, `${path}.review`, role, 'must be present as an object', manifestItemId, packetId);
      continue;
    }
    if (!submissionContract.reviewStatuses.includes(review.status)) {
      addIssue(issues, rolePath, 'status', 'must use an approved review status', manifestItemId, packetId);
    }
    if (!isNonEmptyString(review.reviewer)) {
      addIssue(issues, rolePath, 'reviewer', 'must be a non-empty reviewer ID or UNASSIGNED', manifestItemId, packetId);
      continue;
    }

    const isUnassigned = review.reviewer === governance.unassignedValue;
    let reviewer = null;
    if (isUnassigned) {
      if (review.status === 'COMPLETE') {
        addIssue(issues, rolePath, 'reviewer', 'completed reviews must name a registered reviewer ID', manifestItemId, packetId);
      }
      if (packet.submissionStatus === 'SUBMITTED_FOR_REVIEW' && review.status !== 'NOT_APPLICABLE') {
        addIssue(issues, rolePath, 'reviewer', 'must be assigned before submission for review', manifestItemId, packetId);
      }
    } else if (!governance.reviewerIdPattern.test(review.reviewer)) {
      counters.placeholderIdentityFindingCount += 1;
      addIssue(issues, rolePath, 'reviewer', 'must match the stable SID-REV-* reviewer ID pattern', manifestItemId, packetId);
    } else {
      reviewer = governance.reviewersById.get(review.reviewer) ?? null;
      if (reviewer === null) {
        counters.unknownReviewerReferenceCount += 1;
        addIssue(issues, rolePath, 'reviewer', 'must reference a reviewer in the governance registry', manifestItemId, packetId);
      } else {
        if (reviewer.active !== true) {
          counters.inactiveReviewerReferenceCount += 1;
          addIssue(issues, rolePath, 'reviewer', 'must reference an active reviewer', manifestItemId, packetId);
        }
        if (reviewer.conflictOfInterestDeclared !== true) {
          counters.conflictDeclarationFindingCount += 1;
          addIssue(issues, rolePath, 'reviewer', 'reviewer must have a recorded conflict-of-interest declaration', manifestItemId, packetId);
        }
        if (!Array.isArray(reviewer.approvedRoles) || !reviewer.approvedRoles.includes(role)) {
          counters.unauthorisedRoleReferenceCount += 1;
          addIssue(issues, rolePath, 'reviewer', `reviewer is not authorised for ${role}`, manifestItemId, packetId);
        }
        assignedRoles.add(role);
        reviewerIds.add(review.reviewer);
        const roles = rolesByReviewer.get(review.reviewer) ?? new Set();
        roles.add(role);
        rolesByReviewer.set(review.reviewer, roles);
        counters.assignedReviewCount += 1;
      }
    }

    if (review.status === 'COMPLETE') {
      if (!isIsoDate(review.reviewedOn)) {
        addIssue(issues, rolePath, 'reviewedOn', 'must use a real YYYY-MM-DD date when complete', manifestItemId, packetId);
      } else {
        if (review.reviewedOn > today) {
          addIssue(issues, rolePath, 'reviewedOn', 'must not be in the future', manifestItemId, packetId);
        }
        if (isIsoDate(packet.submittedOn) && review.reviewedOn < packet.submittedOn) {
          addIssue(issues, rolePath, 'reviewedOn', 'must not predate packet submission', manifestItemId, packetId);
        }
      }
      if (!isUnassigned && reviewer !== null) {
        completedRoles.add(role);
        counters.completedReviewCount += 1;
      }
    } else if (review.reviewedOn !== null) {
      addIssue(issues, rolePath, 'reviewedOn', 'must be null until the review is complete', manifestItemId, packetId);
    }
  }

  let separationConflictCount = 0;
  for (const [reviewerId, roles] of rolesByReviewer.entries()) {
    const approvalAssignments = governance.approvalRoles.filter((role) => roles.has(role));
    const preparationAssignments = governance.preparationRoles.filter((role) => roles.has(role));
    if (approvalAssignments.length > 0 && preparationAssignments.length > 0) {
      separationConflictCount += 1;
      counters.separationConflictCount += 1;
      addIssue(
        issues,
        path,
        'review.separationOfDuties',
        `${reviewerId} cannot hold approval role ${approvalAssignments.join(', ')} and preparation role ${preparationAssignments.join(', ')} in the same packet`,
        manifestItemId,
        packetId,
      );
    }
  }

  return {
    packetId,
    manifestItemId,
    assignedRoles,
    completedRoles,
    reviewerIds,
    separationConflictCount,
  };
}

function buildCoverage(manifestItems, packetSummaries, roleCount) {
  const byManifest = new Map();
  for (const item of manifestItems.values()) {
    byManifest.set(item.id, {
      manifestItemId: item.id,
      siddhar: item.siddhar,
      itemTitle: item.itemTitle,
      priority: item.priority,
      status: item.status,
      packetCount: 0,
      assignedRoleCount: 0,
      completedRoleCount: 0,
      distinctReviewerCount: 0,
      separationConflictCount: 0,
      assignmentState: 'NO_PACKET',
      assignedRoles: new Set(),
      completedRoles: new Set(),
      reviewerIds: new Set(),
    });
  }

  for (const summary of packetSummaries) {
    if (summary === null || !byManifest.has(summary.manifestItemId)) {
      continue;
    }
    const item = byManifest.get(summary.manifestItemId);
    item.packetCount += 1;
    for (const role of summary.assignedRoles) item.assignedRoles.add(role);
    for (const role of summary.completedRoles) item.completedRoles.add(role);
    for (const reviewerId of summary.reviewerIds) item.reviewerIds.add(reviewerId);
    item.separationConflictCount += summary.separationConflictCount;
  }

  return [...byManifest.values()]
    .map((item) => {
      item.assignedRoleCount = item.assignedRoles.size;
      item.completedRoleCount = item.completedRoles.size;
      item.distinctReviewerCount = item.reviewerIds.size;
      if (item.packetCount === 0) {
        item.assignmentState = 'NO_PACKET';
      } else if (item.assignedRoleCount === 0) {
        item.assignmentState = 'UNASSIGNED';
      } else if (
        item.assignedRoleCount === roleCount &&
        item.completedRoleCount === roleCount &&
        item.separationConflictCount === 0
      ) {
        item.assignmentState = 'COMPLETE';
      } else if (item.completedRoleCount > 0) {
        item.assignmentState = 'PARTIALLY_COMPLETE';
      } else if (item.assignedRoleCount === roleCount) {
        item.assignmentState = 'FULLY_ASSIGNED';
      } else {
        item.assignmentState = 'PARTIALLY_ASSIGNED';
      }
      return {
        manifestItemId: item.manifestItemId,
        siddhar: item.siddhar,
        itemTitle: item.itemTitle,
        priority: item.priority,
        status: item.status,
        packetCount: item.packetCount,
        assignedRoleCount: item.assignedRoleCount,
        completedRoleCount: item.completedRoleCount,
        distinctReviewerCount: item.distinctReviewerCount,
        separationConflictCount: item.separationConflictCount,
        assignmentState: item.assignmentState,
      };
    })
    .sort((left, right) => left.manifestItemId.localeCompare(right.manifestItemId));
}

export function validateSiddharReviewerGovernance({
  governance,
  manifest,
  packetFiles,
  submissionContract = SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT,
  today = new Date().toISOString().slice(0, 10),
}) {
  const issues = [];
  const counters = {
    assignedReviewCount: 0,
    completedReviewCount: 0,
    placeholderIdentityFindingCount: 0,
    unknownReviewerReferenceCount: 0,
    inactiveReviewerReferenceCount: 0,
    conflictDeclarationFindingCount: 0,
    unauthorisedRoleReferenceCount: 0,
    separationConflictCount: 0,
    malformedPacketCount: 0,
  };
  const manifestItems = buildManifestMap(manifest, issues);
  const parsedGovernance = parseGovernance(governance, submissionContract, issues, today);
  const packetSummaries = [...packetFiles]
    .sort((left, right) => left.path.localeCompare(right.path))
    .map((packetFile) =>
      validatePacketReviews({
        packetFile,
        governance: parsedGovernance,
        manifestItems,
        submissionContract,
        today,
        issues,
        counters,
      }),
    );
  const reviewerCoverageByManifestItem = buildCoverage(
    manifestItems,
    packetSummaries,
    parsedGovernance.reviewRoles.length,
  );
  const distinctAssignedReviewerIds = new Set();
  for (const summary of packetSummaries) {
    if (summary !== null) {
      for (const reviewerId of summary.reviewerIds) distinctAssignedReviewerIds.add(reviewerId);
    }
  }

  return {
    ok: issues.length === 0,
    governanceSchemaVersion: isObject(governance) ? governance.schemaVersion : null,
    manifestItemCount: manifestItems.size,
    registryReviewerCount: parsedGovernance.reviewerCount,
    activeReviewerCount: parsedGovernance.activeReviewerCount,
    packetFileCount: packetFiles.length,
    assignedReviewCount: counters.assignedReviewCount,
    completedReviewCount: counters.completedReviewCount,
    distinctAssignedReviewerCount: distinctAssignedReviewerIds.size,
    placeholderIdentityFindingCount: counters.placeholderIdentityFindingCount,
    unknownReviewerReferenceCount: counters.unknownReviewerReferenceCount,
    inactiveReviewerReferenceCount: counters.inactiveReviewerReferenceCount,
    conflictDeclarationFindingCount: counters.conflictDeclarationFindingCount,
    unauthorisedRoleReferenceCount: counters.unauthorisedRoleReferenceCount,
    separationConflictCount: counters.separationConflictCount,
    malformedPacketCount: counters.malformedPacketCount,
    assignmentReadyManifestItems: reviewerCoverageByManifestItem.filter((item) =>
      ['FULLY_ASSIGNED', 'PARTIALLY_COMPLETE', 'COMPLETE'].includes(item.assignmentState),
    ).length,
    completedManifestItems: reviewerCoverageByManifestItem.filter(
      (item) => item.assignmentState === 'COMPLETE',
    ).length,
    automaticStatusChanges: 0,
    productionEligibleItems: 0,
    reviewerCoverageByManifestItem,
    issues: issues.sort((left, right) =>
      `${left.path}:${left.field}:${left.message}`.localeCompare(
        `${right.path}:${right.field}:${right.message}`,
      ),
    ),
  };
}

function loadPacketFiles() {
  if (!existsSync(submissionsDirectory)) {
    return [];
  }
  return readdirSync(submissionsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => {
      const absolutePath = resolve(submissionsDirectory, entry.name);
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
  const governance = JSON.parse(readFileSync(governancePath, 'utf8'));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const result = validateSiddharReviewerGovernance({
    governance,
    manifest,
    packetFiles: loadPacketFiles(),
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
    `Siddhar reviewer governance passed: ${result.registryReviewerCount} registered reviewers, ` +
      `${result.assignedReviewCount} assignments, ${result.separationConflictCount} conflicts, ` +
      '0 automatic status changes, 0 production-eligible items.',
  );
  console.log(`Evidence: ${toRepositoryPath(repositoryRoot, reportPath)}`);
}

const isDirectExecution =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  run();
}
