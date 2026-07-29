import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const contractPath = resolve(repositoryRoot, 'config/siddhar-evidence-submission-contract.json');
const manifestPath = resolve(
  repositoryRoot,
  'docs/content-intake/evidence/siddhar-evidence-manifest.json',
);
const submissionsDirectory = resolve(
  repositoryRoot,
  'docs/content-intake/evidence/submissions',
);
const reportPath = resolve(
  repositoryRoot,
  'quality-evidence/siddhar-evidence-submissions.json',
);

const ARRAY_CONTRACT_FIELDS = [
  'packetStatuses',
  'sourceTypes',
  'reviewRoles',
  'reviewStatuses',
  'rightsStatuses',
  'proposedDispositions',
  'allowedMimeTypes',
  'allowedFileExtensions',
];
const SOURCE_FIELDS = [
  'type',
  'repository',
  'recordId',
  'title',
  'author',
  'editor',
  'publisher',
  'edition',
  'publicationYear',
  'language',
  'script',
  'officialUrl',
  'accessedOn',
];
const LOCATOR_FIELDS = [
  'bundleNumber',
  'workNumber',
  'accessionNumber',
  'folioOrPage',
  'verseOrLine',
];
const RIGHTS_FIELDS = [
  'status',
  'rightsHolder',
  'basis',
  'permissionReference',
  'reuseScope',
];
const DECLARATION_FIELDS = [
  'noAutomaticStatusPromotion',
  'noProductionUse',
  'noMedicalUse',
  'containsNoSecretsOrPersonalData',
];
const FORBIDDEN_PROMOTION_FIELDS = [
  'newManifestStatus',
  'manifestStatusProposed',
  'approvedEditorialStatus',
  'productionStatus',
];
const FORBIDDEN_AUTHENTICATION_LANGUAGE =
  /(PRIMARY[-_ ]TEXT ATTESTED|SCRIPTURALLY ATTESTED|HIGH CONFIDENCE|PRODUCTION[-_ ]READY|AUTHENTICATED)/i;
const PLACEHOLDER_LANGUAGE =
  /(REPLACE_|YYYY-MM-DD|UNASSIGNED|UNKNOWN_OR_DOCUMENTED|example\.invalid)/i;
const PACKET_ID = /^SID-SUB-(\d{8})-(\d{3})$/;
const MANIFEST_ID = /^SID-EV-\d{3}$/;
const SHA256 = /^[a-f0-9]{64}$/i;
const UPLOAD_PREFIX = 'docs/content-intake/evidence/uploads/';

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

function isHttpsUrl(value) {
  if (!isNonEmptyString(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname !== 'example.invalid' &&
      url.hostname !== 'localhost'
    );
  } catch {
    return false;
  }
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function parseSiddharEvidenceSubmissionContract(value) {
  if (!isObject(value)) {
    throw new TypeError('submission contract must be an object');
  }

  if (value.schemaVersion !== 1) {
    throw new TypeError('submission contract schemaVersion must be 1');
  }

  const parsed = { schemaVersion: 1 };

  for (const field of ARRAY_CONTRACT_FIELDS) {
    const entries = value[field];
    if (
      !Array.isArray(entries) ||
      entries.length === 0 ||
      entries.some((entry) => !isNonEmptyString(entry))
    ) {
      throw new TypeError(`submission contract ${field} must be a non-empty string array`);
    }

    const normalised = uniqueSorted(entries);
    if (normalised.length !== entries.length) {
      throw new TypeError(`submission contract ${field} must contain unique values`);
    }
    if (normalised.some((entry, index) => entry !== entries[index])) {
      throw new TypeError(`submission contract ${field} must be sorted`);
    }

    parsed[field] = Object.freeze(normalised);
  }

  if (!Number.isInteger(value.maxFileSizeBytes) || value.maxFileSizeBytes <= 0) {
    throw new TypeError('submission contract maxFileSizeBytes must be a positive integer');
  }
  parsed.maxFileSizeBytes = value.maxFileSizeBytes;

  return Object.freeze(parsed);
}

const contractDocument = JSON.parse(readFileSync(contractPath, 'utf8'));
export const SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT =
  parseSiddharEvidenceSubmissionContract(contractDocument);

function addIssue(issues, path, field, message) {
  issues.push({ path, field, message });
}

function requireStrings(object, fields, path, issues) {
  for (const field of fields) {
    if (!isNonEmptyString(object[field])) {
      addIssue(issues, path, field, 'must be a non-empty string');
    }
  }
}

function validateSource(packet, contract, path, issues) {
  const source = packet.source;
  if (!isObject(source)) {
    addIssue(issues, path, 'source', 'must be an object');
    return;
  }

  requireStrings(source, SOURCE_FIELDS, `${path}.source`, issues);

  if (!contract.sourceTypes.includes(source.type)) {
    addIssue(issues, `${path}.source`, 'type', 'must use an approved source type');
  }
  if (!isHttpsUrl(source.officialUrl)) {
    addIssue(issues, `${path}.source`, 'officialUrl', 'must be a non-placeholder HTTPS URL');
  }
  if (!isIsoDate(source.accessedOn)) {
    addIssue(issues, `${path}.source`, 'accessedOn', 'must use a real YYYY-MM-DD date');
  }
}

function validateLocator(packet, path, issues) {
  const locator = packet.locator;
  if (!isObject(locator)) {
    addIssue(issues, path, 'locator', 'must be an object');
    return;
  }

  for (const field of LOCATOR_FIELDS) {
    if (typeof locator[field] !== 'string') {
      addIssue(issues, `${path}.locator`, field, 'must be a string, including an empty string when unavailable');
    }
  }

  if (!LOCATOR_FIELDS.some((field) => isNonEmptyString(locator[field]))) {
    addIssue(issues, `${path}.locator`, '(locator)', 'must include at least one source locator');
  }
  if (typeof locator.adjacentContextIncluded !== 'boolean') {
    addIssue(issues, `${path}.locator`, 'adjacentContextIncluded', 'must be a boolean');
  }
}

function validateFiles(packet, contract, path, issues, globalFiles, globalHashes) {
  if (!Array.isArray(packet.files) || packet.files.length === 0) {
    addIssue(issues, path, 'files', 'must contain at least one evidence file');
    return 0;
  }

  const packetPaths = new Set();
  const packetHashes = new Set();

  packet.files.forEach((file, index) => {
    const filePath = `${path}.files[${index}]`;
    if (!isObject(file)) {
      addIssue(issues, filePath, '(file)', 'must be an object');
      return;
    }

    requireStrings(file, ['path', 'sha256', 'mimeType'], filePath, issues);

    if (
      !isNonEmptyString(file.path) ||
      !file.path.startsWith(UPLOAD_PREFIX) ||
      file.path.includes('..') ||
      file.path.includes('\\')
    ) {
      addIssue(issues, filePath, 'path', `must stay under ${UPLOAD_PREFIX}`);
    } else {
      const extension = extname(file.path).toLowerCase();
      if (!contract.allowedFileExtensions.includes(extension)) {
        addIssue(issues, filePath, 'path', 'uses an unapproved evidence-file extension');
      }
      if (packetPaths.has(file.path) || globalFiles.has(file.path)) {
        addIssue(issues, filePath, 'path', 'must be unique across all packets');
      }
      packetPaths.add(file.path);
      globalFiles.add(file.path);
    }

    if (!isNonEmptyString(file.sha256) || !SHA256.test(file.sha256) || /^0{64}$/.test(file.sha256)) {
      addIssue(issues, filePath, 'sha256', 'must be a non-placeholder 64-character SHA-256 digest');
    } else {
      const digest = file.sha256.toLowerCase();
      if (packetHashes.has(digest) || globalHashes.has(digest)) {
        addIssue(issues, filePath, 'sha256', 'must be unique across all packets');
      }
      packetHashes.add(digest);
      globalHashes.add(digest);
    }

    if (!contract.allowedMimeTypes.includes(file.mimeType)) {
      addIssue(issues, filePath, 'mimeType', 'must use an approved evidence MIME type');
    }
    if (
      !Number.isInteger(file.sizeBytes) ||
      file.sizeBytes <= 0 ||
      file.sizeBytes > contract.maxFileSizeBytes
    ) {
      addIssue(
        issues,
        filePath,
        'sizeBytes',
        `must be a positive integer not exceeding ${contract.maxFileSizeBytes}`,
      );
    }
  });

  return packet.files.length;
}

function validateReviews(packet, contract, path, issues) {
  const review = packet.review;
  if (!isObject(review)) {
    addIssue(issues, path, 'review', 'must be an object');
    return;
  }

  const observedRoles = Object.keys(review).sort((left, right) => left.localeCompare(right));
  for (const role of observedRoles) {
    if (!contract.reviewRoles.includes(role)) {
      addIssue(issues, `${path}.review`, role, 'is not an approved review role');
    }
  }

  for (const role of contract.reviewRoles) {
    const roleReview = review[role];
    const rolePath = `${path}.review.${role}`;
    if (!isObject(roleReview)) {
      addIssue(issues, `${path}.review`, role, 'must be present as an object');
      continue;
    }

    requireStrings(roleReview, ['status', 'reviewer', 'notes'], rolePath, issues);
    if (!contract.reviewStatuses.includes(roleReview.status)) {
      addIssue(issues, rolePath, 'status', 'must use an approved review status');
    }

    if (roleReview.status === 'COMPLETE') {
      if (roleReview.reviewer === 'UNASSIGNED') {
        addIssue(issues, rolePath, 'reviewer', 'must name the completing reviewer');
      }
      if (!isIsoDate(roleReview.reviewedOn)) {
        addIssue(issues, rolePath, 'reviewedOn', 'must use a real YYYY-MM-DD date when complete');
      }
    } else if (roleReview.reviewedOn !== null) {
      addIssue(issues, rolePath, 'reviewedOn', 'must be null until review is complete');
    }

    if (roleReview.status === 'NOT_APPLICABLE' && !isNonEmptyString(roleReview.notes)) {
      addIssue(issues, rolePath, 'notes', 'must justify why the review role is not applicable');
    }

    if (packet.submissionStatus === 'SUBMITTED_FOR_REVIEW' && roleReview.reviewer === 'UNASSIGNED') {
      addIssue(issues, rolePath, 'reviewer', 'must be assigned before submission for review');
    }
  }
}

function validateRights(packet, contract, path, issues) {
  const rights = packet.rights;
  if (!isObject(rights)) {
    addIssue(issues, path, 'rights', 'must be an object');
    return;
  }

  requireStrings(rights, RIGHTS_FIELDS, `${path}.rights`, issues);
  if (!contract.rightsStatuses.includes(rights.status)) {
    addIssue(issues, `${path}.rights`, 'status', 'must use an approved rights status');
  }

  if (
    rights.status === 'PERMISSION_GRANTED' &&
    (rights.rightsHolder === 'UNRESOLVED' || rights.permissionReference === 'UNRESOLVED')
  ) {
    addIssue(
      issues,
      `${path}.rights`,
      'permissionReference',
      'permission-granted packets must name the rights holder and permission reference',
    );
  }
}

function validateDeclarations(packet, path, issues) {
  const declarations = packet.declarations;
  if (!isObject(declarations)) {
    addIssue(issues, path, 'declarations', 'must be an object');
    return;
  }

  for (const field of DECLARATION_FIELDS) {
    if (declarations[field] !== true) {
      addIssue(issues, `${path}.declarations`, field, 'must remain true');
    }
  }
}

export function validateSiddharEvidenceSubmissions({ contract, manifest, packetFiles }) {
  const issues = [];

  if (!isObject(manifest) || !Array.isArray(manifest.items)) {
    return {
      ok: false,
      contractSchemaVersion: contract.schemaVersion,
      manifestItemCount: 0,
      packetCount: packetFiles.length,
      linkedManifestItems: 0,
      fileCount: 0,
      statusCounts: {},
      issues: [{ path: 'manifest', field: 'items', message: 'manifest must contain an item array' }],
    };
  }

  const manifestItems = new Map();
  for (const item of manifest.items) {
    if (isObject(item) && isNonEmptyString(item.id) && MANIFEST_ID.test(item.id)) {
      manifestItems.set(item.id, item);
    }
  }

  const packetIds = new Set();
  const linkedManifestIds = new Set();
  const globalFiles = new Set();
  const globalHashes = new Set();
  const statusCounts = {};
  let fileCount = 0;

  for (const packetFile of packetFiles) {
    const path = packetFile.path;
    const packet = packetFile.value;

    if (isNonEmptyString(packetFile.parseError)) {
      addIssue(issues, path, '(json)', packetFile.parseError);
      continue;
    }
    if (!isObject(packet)) {
      addIssue(issues, path, '(packet)', 'must be a JSON object');
      continue;
    }

    requireStrings(
      packet,
      [
        'packetId',
        'manifestItemId',
        'manifestStatusObserved',
        'submissionStatus',
        'submittedOn',
        'proposedDisposition',
        'notes',
      ],
      path,
      issues,
    );

    if (packet.schemaVersion !== contract.schemaVersion) {
      addIssue(issues, path, 'schemaVersion', `must be ${contract.schemaVersion}`);
    }

    if (!isNonEmptyString(packet.packetId) || !PACKET_ID.test(packet.packetId)) {
      addIssue(issues, path, 'packetId', 'must use SID-SUB-YYYYMMDD-NNN');
    } else {
      if (packetIds.has(packet.packetId)) {
        addIssue(issues, path, 'packetId', 'must be unique');
      }
      packetIds.add(packet.packetId);
      if (basename(path, '.json') !== packet.packetId) {
        addIssue(issues, path, 'packetId', 'must match the JSON filename');
      }
      const datePart = packet.packetId.slice(8, 16);
      const packetDate = `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`;
      if (packet.submittedOn !== packetDate) {
        addIssue(issues, path, 'submittedOn', 'must match the date encoded in packetId');
      }
    }

    const manifestItem = manifestItems.get(packet.manifestItemId);
    if (manifestItem === undefined) {
      addIssue(issues, path, 'manifestItemId', 'must reference an existing SID-EV-* manifest item');
    } else {
      linkedManifestIds.add(packet.manifestItemId);
      if (packet.manifestStatusObserved !== manifestItem.status) {
        addIssue(issues, path, 'manifestStatusObserved', 'must match the current manifest status');
      }
      if (
        manifestItem.status === 'CONTRADICTED_DO_NOT_PUBLISH' &&
        packet.proposedDisposition !== 'CORRECTION_EVIDENCE_ONLY'
      ) {
        addIssue(
          issues,
          path,
          'proposedDisposition',
          'contradicted items accept correction evidence only',
        );
      }
    }

    if (!contract.packetStatuses.includes(packet.submissionStatus)) {
      addIssue(issues, path, 'submissionStatus', 'must use an approved packet status');
    } else {
      statusCounts[packet.submissionStatus] = (statusCounts[packet.submissionStatus] ?? 0) + 1;
    }
    if (!isIsoDate(packet.submittedOn)) {
      addIssue(issues, path, 'submittedOn', 'must use a real YYYY-MM-DD date');
    }
    if (packet.productionEligible !== false) {
      addIssue(issues, path, 'productionEligible', 'must remain false');
    }
    if (!contract.proposedDispositions.includes(packet.proposedDisposition)) {
      addIssue(issues, path, 'proposedDisposition', 'must use an approved non-production disposition');
    }

    for (const forbiddenField of FORBIDDEN_PROMOTION_FIELDS) {
      if (Object.hasOwn(packet, forbiddenField)) {
        addIssue(issues, path, forbiddenField, 'automatic or proposed manifest promotion is forbidden');
      }
    }

    const serialisedPacket = JSON.stringify(packet);
    if (PLACEHOLDER_LANGUAGE.test(serialisedPacket)) {
      addIssue(issues, path, '(packet)', 'contains unresolved template placeholders');
    }
    if (FORBIDDEN_AUTHENTICATION_LANGUAGE.test(serialisedPacket)) {
      addIssue(issues, path, '(packet)', 'contains unsupported authentication or production language');
    }

    validateSource(packet, contract, path, issues);
    validateLocator(packet, path, issues);
    fileCount += validateFiles(packet, contract, path, issues, globalFiles, globalHashes);
    validateReviews(packet, contract, path, issues);
    validateRights(packet, contract, path, issues);
    validateDeclarations(packet, path, issues);
  }

  return {
    ok: issues.length === 0,
    contractSchemaVersion: contract.schemaVersion,
    manifestItemCount: manifestItems.size,
    packetCount: packetFiles.length,
    linkedManifestItems: linkedManifestIds.size,
    fileCount,
    statusCounts: Object.fromEntries(
      Object.entries(statusCounts).sort(([left], [right]) => left.localeCompare(right)),
    ),
    automaticStatusChanges: 0,
    productionEligiblePackets: 0,
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
    .map((entry) => {
      const absolutePath = resolve(submissionsDirectory, entry.name);
      const path = relative(repositoryRoot, absolutePath).replaceAll('\\', '/');
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
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const result = validateSiddharEvidenceSubmissions({
    contract: SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT,
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
    `Siddhar evidence submissions passed: ${result.packetCount} packets, ` +
      `${result.linkedManifestItems} linked manifest items, ${result.fileCount} files, ` +
      '0 automatic status changes, 0 production-eligible packets.',
  );
  console.log(`Evidence: ${relative(repositoryRoot, reportPath).replaceAll('\\', '/')}`);
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  run();
}
