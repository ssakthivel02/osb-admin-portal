import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
export const SIDDHAR_EVIDENCE_MANIFEST_PATH = resolve(
  repositoryRoot,
  'docs/content-intake/evidence/siddhar-evidence-manifest.json',
);

const ALLOWED_STATUSES = new Set([
  'SUPPORTED_ASSOCIATION',
  'WORK_CATALOGUE_VERIFIED',
  'UNRESOLVED',
  'CONTRADICTED_DO_NOT_PUBLISH',
]);
const ALLOWED_PRIORITIES = new Set(['P0', 'P1', 'P2', 'P3']);
const ALLOWED_SCOPES = new Set([
  'ITEM',
  'WORK',
  'EDITION',
  'TEMPLE_TRADITION',
  'RESEARCH_CLAIM',
  'EDITORIAL_CONTROL',
  'RIGHTS_CONTROL',
]);
const ALLOWED_EVIDENCE_TYPES = new Set([
  'OFFICIAL_TEXT_PORTAL',
  'OFFICIAL_MANUSCRIPT_CATALOGUE',
  'OFFICIAL_TEMPLE_PUBLICATION',
  'PRIMARY_SOURCE_IMAGE',
  'PRINT_EDITION_IMAGE',
  'REPOSITORY_CONFIRMATION',
]);
const ALLOWED_OFFICIAL_HOSTS = ['tamilvu.org', 'tnarch.gov.in'];
const UNSUPPORTED_AUTHENTICITY_LABEL =
  /(PRIMARY-TEXT ATTESTED|SCRIPTURALLY ATTESTED|HIGH CONFIDENCE)/i;
const MINIMUM_BACKLOG_ITEMS = 24;

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
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value);
}

function isAllowedOfficialUrl(value) {
  if (!isNonEmptyString(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol === 'https:' &&
      ALLOWED_OFFICIAL_HOSTS.some(
        (allowedHost) =>
          hostname === allowedHost || hostname.endsWith(`.${allowedHost}`),
      )
    );
  } catch {
    return false;
  }
}

function addIssue(issues, path, message) {
  issues.push({ path, message });
}

function validateStringArray(value, path, issues) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((entry) => !isNonEmptyString(entry))
  ) {
    addIssue(issues, path, 'must be a non-empty array of non-empty strings');
  }
}

function validateEvidenceReference(reference, path, issues) {
  if (!isObject(reference)) {
    addIssue(issues, path, 'must be an object');
    return;
  }

  for (const field of [
    'type',
    'repository',
    'recordId',
    'title',
    'locator',
    'url',
    'accessedOn',
  ]) {
    if (!isNonEmptyString(reference[field])) {
      addIssue(issues, `${path}.${field}`, 'must be a non-empty string');
    }
  }

  if (
    isNonEmptyString(reference.type) &&
    !ALLOWED_EVIDENCE_TYPES.has(reference.type)
  ) {
    addIssue(issues, `${path}.type`, 'must use an approved evidence type');
  }

  if (!isAllowedOfficialUrl(reference.url)) {
    addIssue(
      issues,
      `${path}.url`,
      'must be an HTTPS URL on an approved official host',
    );
  }

  if (!isIsoDate(reference.accessedOn)) {
    addIssue(issues, `${path}.accessedOn`, 'must use a valid YYYY-MM-DD date');
  }
}

function validateItem(item, index, issues) {
  const path = `items[${index}]`;
  if (!isObject(item)) {
    addIssue(issues, path, 'must be an object');
    return;
  }

  for (const field of [
    'id',
    'siddhar',
    'itemTitle',
    'priority',
    'scope',
    'status',
    'manualAction',
    'blockingNote',
  ]) {
    if (!isNonEmptyString(item[field])) {
      addIssue(issues, `${path}.${field}`, 'must be a non-empty string');
    }
  }

  const expectedId = `SID-EV-${String(index + 1).padStart(3, '0')}`;
  if (item.id !== expectedId) {
    addIssue(issues, `${path}.id`, `must be the contiguous identifier ${expectedId}`);
  }

  if (isNonEmptyString(item.priority) && !ALLOWED_PRIORITIES.has(item.priority)) {
    addIssue(issues, `${path}.priority`, 'must use P0, P1, P2, or P3');
  }

  if (isNonEmptyString(item.scope) && !ALLOWED_SCOPES.has(item.scope)) {
    addIssue(issues, `${path}.scope`, 'must use an approved evidence scope');
  }

  if (isNonEmptyString(item.status) && !ALLOWED_STATUSES.has(item.status)) {
    addIssue(issues, `${path}.status`, 'must use an approved evidence status');
  }

  if (item.productionEligible !== false) {
    addIssue(
      issues,
      `${path}.productionEligible`,
      'must remain false for every evidence-backlog item',
    );
  }

  validateStringArray(item.evidenceNeeded, `${path}.evidenceNeeded`, issues);

  if (!Array.isArray(item.officialEvidence)) {
    addIssue(issues, `${path}.officialEvidence`, 'must be an array');
  } else {
    item.officialEvidence.forEach((reference, evidenceIndex) => {
      validateEvidenceReference(
        reference,
        `${path}.officialEvidence[${evidenceIndex}]`,
        issues,
      );
    });
  }

  if (
    item.status !== 'UNRESOLVED' &&
    (!Array.isArray(item.officialEvidence) || item.officialEvidence.length === 0)
  ) {
    addIssue(
      issues,
      `${path}.officialEvidence`,
      'supported, verified, or contradicted statuses require official evidence',
    );
  }

  if (item.status === 'WORK_CATALOGUE_VERIFIED' && item.scope !== 'WORK') {
    addIssue(
      issues,
      `${path}.scope`,
      'WORK_CATALOGUE_VERIFIED records must remain work-level evidence',
    );
  }

  if (
    item.status === 'CONTRADICTED_DO_NOT_PUBLISH' &&
    !/do not publish/i.test(item.manualAction ?? '')
  ) {
    addIssue(
      issues,
      `${path}.manualAction`,
      'contradicted records must explicitly state do not publish',
    );
  }

  if (UNSUPPORTED_AUTHENTICITY_LABEL.test(JSON.stringify(item))) {
    addIssue(
      issues,
      path,
      'must not use unsupported authenticity or confidence labels',
    );
  }
}

export function validateSiddharEvidenceManifest(value) {
  const issues = [];

  if (!isObject(value)) {
    return {
      ok: false,
      issues: [{ path: 'manifest', message: 'must be an object' }],
      summary: null,
    };
  }

  if (value.schemaVersion !== 1) {
    addIssue(issues, 'schemaVersion', 'must be 1');
  }

  if (!isIsoDate(value.reviewDate)) {
    addIssue(issues, 'reviewDate', 'must use a valid YYYY-MM-DD date');
  }

  if (value.productionEligible !== false) {
    addIssue(issues, 'productionEligible', 'must remain false for the intake');
  }

  if (!Array.isArray(value.items)) {
    addIssue(issues, 'items', 'must be an array');
  } else {
    if (value.items.length < MINIMUM_BACKLOG_ITEMS) {
      addIssue(
        issues,
        'items',
        `must retain at least ${MINIMUM_BACKLOG_ITEMS} evidence controls`,
      );
    }

    value.items.forEach((item, index) => validateItem(item, index, issues));

    const ids = value.items
      .filter(isObject)
      .map((item) => item.id)
      .filter(isNonEmptyString);
    if (new Set(ids).size !== ids.length) {
      addIssue(issues, 'items', 'must not contain duplicate identifiers');
    }
  }

  const items = Array.isArray(value.items) ? value.items.filter(isObject) : [];
  const statusCounts = {};
  const priorityCounts = {};
  let officialEvidenceCount = 0;

  for (const item of items) {
    if (isNonEmptyString(item.status)) {
      statusCounts[item.status] = (statusCounts[item.status] ?? 0) + 1;
    }
    if (isNonEmptyString(item.priority)) {
      priorityCounts[item.priority] = (priorityCounts[item.priority] ?? 0) + 1;
    }
    if (Array.isArray(item.officialEvidence)) {
      officialEvidenceCount += item.officialEvidence.length;
    }
  }

  const bogarWitness = items.find((item) => item.id === 'SID-EV-002');
  if (bogarWitness?.status !== 'WORK_CATALOGUE_VERIFIED') {
    addIssue(
      issues,
      'items[1].status',
      'Bogar 7000 must retain its work-level catalogue-verified status',
    );
  }

  const karuvoorarContradiction = items.find((item) => item.id === 'SID-EV-003');
  if (karuvoorarContradiction?.status !== 'CONTRADICTED_DO_NOT_PUBLISH') {
    addIssue(
      issues,
      'items[2].status',
      'the contradicted Karuvoorar attribution must remain blocked',
    );
  }

  return {
    ok: issues.length === 0,
    issues: issues.sort((left, right) =>
      `${left.path}:${left.message}`.localeCompare(`${right.path}:${right.message}`),
    ),
    summary: {
      itemCount: items.length,
      officialEvidenceCount,
      statusCounts,
      priorityCounts,
      productionEligibleCount: items.filter(
        (item) => item.productionEligible === true,
      ).length,
    },
  };
}

export function loadSiddharEvidenceManifest(path = SIDDHAR_EVIDENCE_MANIFEST_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function run() {
  const evidencePath = resolve(
    repositoryRoot,
    'quality-evidence/siddhar-evidence-manifest.json',
  );
  const result = validateSiddharEvidenceManifest(loadSiddharEvidenceManifest());

  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  if (!result.ok) {
    for (const issue of result.issues) {
      console.error(`${issue.path}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Siddhar evidence manifest passed: ${result.summary.itemCount} controls, ` +
      `${result.summary.officialEvidenceCount} official evidence references, ` +
      `${result.summary.productionEligibleCount} production-eligible items.`,
  );
  console.log(
    `Evidence: ${relative(repositoryRoot, evidencePath).replaceAll('\\', '/')}`,
  );
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  run();
}
