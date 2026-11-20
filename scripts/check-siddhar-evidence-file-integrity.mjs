import { Buffer } from 'node:buffer';
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
import { SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT } from './check-siddhar-evidence-submissions.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const submissionsDirectory = resolve(
  repositoryRoot,
  'docs/content-intake/evidence/submissions',
);
const reportPath = resolve(
  repositoryRoot,
  'quality-evidence/siddhar-evidence-file-integrity.json',
);

const UPLOAD_PREFIX = 'docs/content-intake/evidence/uploads/';
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

function startsWithBytes(buffer, signature) {
  if (buffer.length < signature.length) {
    return false;
  }

  return signature.every((byte, index) => buffer[index] === byte);
}

export function detectEvidenceMimeType(buffer) {
  if (
    startsWithBytes(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d]) &&
    buffer.subarray(Math.max(0, buffer.length - 4096)).includes(Buffer.from('%%EOF'))
  ) {
    return 'application/pdf';
  }

  if (startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }

  if (startsWithBytes(buffer, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg';
  }

  if (
    startsWithBytes(buffer, [0x49, 0x49, 0x2a, 0x00]) ||
    startsWithBytes(buffer, [0x4d, 0x4d, 0x00, 0x2a])
  ) {
    return 'image/tiff';
  }

  return null;
}

function addIssue(issues, packetPath, filePath, field, message) {
  issues.push({ packetPath, filePath, field, message });
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

function validateDeclaredPath(root, packetPath, declaration, issues) {
  const declaredPath = declaration.path;
  if (
    !isNonEmptyString(declaredPath) ||
    !declaredPath.startsWith(UPLOAD_PREFIX) ||
    declaredPath.includes('..') ||
    declaredPath.includes('\\') ||
    declaredPath.includes('\u0000')
  ) {
    addIssue(
      issues,
      packetPath,
      isNonEmptyString(declaredPath) ? declaredPath : '(missing)',
      'path',
      `must be a normalised repository path under ${UPLOAD_PREFIX}`,
    );
    return null;
  }

  const absolutePath = resolve(root, declaredPath);
  const normalisedPath = relative(root, absolutePath).replaceAll('\\', '/');
  if (!isContainedPath(root, absolutePath) || normalisedPath !== declaredPath) {
    addIssue(issues, packetPath, declaredPath, 'path', 'must resolve inside the repository root');
    return null;
  }

  return absolutePath;
}

function inspectOneFile({
  root,
  packetPath,
  declaration,
  contract,
  issues,
  observedPaths,
  observedDigests,
}) {
  if (!isObject(declaration)) {
    addIssue(issues, packetPath, '(invalid declaration)', '(file)', 'must be an object');
    return { checked: false, missing: false };
  }

  const absolutePath = validateDeclaredPath(root, packetPath, declaration, issues);
  if (absolutePath === null) {
    return { checked: false, missing: false };
  }

  const extension = extname(declaration.path).toLowerCase();
  const expectedMimeForExtension = MIME_BY_EXTENSION[extension];
  if (!contract.allowedFileExtensions.includes(extension) || expectedMimeForExtension === undefined) {
    addIssue(issues, packetPath, declaration.path, 'extension', 'is not an approved evidence extension');
  }
  if (!contract.allowedMimeTypes.includes(declaration.mimeType)) {
    addIssue(issues, packetPath, declaration.path, 'mimeType', 'is not an approved evidence MIME type');
  }
  if (
    expectedMimeForExtension !== undefined &&
    isNonEmptyString(declaration.mimeType) &&
    declaration.mimeType !== expectedMimeForExtension
  ) {
    addIssue(
      issues,
      packetPath,
      declaration.path,
      'mimeType',
      `does not match extension ${extension}`,
    );
  }

  if (observedPaths.has(declaration.path)) {
    addIssue(issues, packetPath, declaration.path, 'path', 'is declared more than once');
  }
  observedPaths.add(declaration.path);

  if (!existsSync(absolutePath)) {
    addIssue(issues, packetPath, declaration.path, 'path', 'declared evidence file is missing');
    return { checked: false, missing: true };
  }

  let stats;
  try {
    stats = lstatSync(absolutePath);
  } catch (error) {
    addIssue(
      issues,
      packetPath,
      declaration.path,
      'path',
      `could not inspect evidence file: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    return { checked: false, missing: false };
  }

  if (stats.isSymbolicLink()) {
    addIssue(issues, packetPath, declaration.path, 'path', 'symbolic links are forbidden');
    return { checked: false, missing: false };
  }
  if (!stats.isFile()) {
    addIssue(issues, packetPath, declaration.path, 'path', 'must reference a regular file');
    return { checked: false, missing: false };
  }

  let realPath;
  try {
    realPath = realpathSync(absolutePath);
  } catch (error) {
    addIssue(
      issues,
      packetPath,
      declaration.path,
      'path',
      `could not resolve evidence file: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    return { checked: false, missing: false };
  }
  if (!isContainedPath(realpathSync(root), realPath)) {
    addIssue(issues, packetPath, declaration.path, 'path', 'resolved outside the repository root');
    return { checked: false, missing: false };
  }

  if (
    !Number.isInteger(declaration.sizeBytes) ||
    declaration.sizeBytes <= 0 ||
    declaration.sizeBytes > contract.maxFileSizeBytes
  ) {
    addIssue(
      issues,
      packetPath,
      declaration.path,
      'sizeBytes',
      `must be a positive integer not exceeding ${contract.maxFileSizeBytes}`,
    );
  }
  if (stats.size !== declaration.sizeBytes) {
    addIssue(
      issues,
      packetPath,
      declaration.path,
      'sizeBytes',
      `declared ${declaration.sizeBytes}; actual ${stats.size}`,
    );
  }
  if (stats.size === 0) {
    addIssue(issues, packetPath, declaration.path, 'sizeBytes', 'evidence file must not be empty');
  }

  let content;
  try {
    content = readFileSync(absolutePath);
  } catch (error) {
    addIssue(
      issues,
      packetPath,
      declaration.path,
      'path',
      `could not read evidence file: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    return { checked: false, missing: false };
  }

  const actualDigest = createHash('sha256').update(content).digest('hex');
  if (!isNonEmptyString(declaration.sha256) || declaration.sha256.toLowerCase() !== actualDigest) {
    addIssue(
      issues,
      packetPath,
      declaration.path,
      'sha256',
      `declared digest does not match actual sha256:${actualDigest}`,
    );
  }
  if (observedDigests.has(actualDigest)) {
    addIssue(
      issues,
      packetPath,
      declaration.path,
      'sha256',
      'actual file content duplicates another evidence file',
    );
  }
  observedDigests.add(actualDigest);

  const detectedMimeType = detectEvidenceMimeType(content);
  if (detectedMimeType === null) {
    addIssue(issues, packetPath, declaration.path, 'mimeSignature', 'file signature is not recognised');
  } else {
    if (detectedMimeType !== declaration.mimeType) {
      addIssue(
        issues,
        packetPath,
        declaration.path,
        'mimeSignature',
        `detected ${detectedMimeType}; declared ${declaration.mimeType}`,
      );
    }
    if (expectedMimeForExtension !== undefined && detectedMimeType !== expectedMimeForExtension) {
      addIssue(
        issues,
        packetPath,
        declaration.path,
        'extension',
        `detected ${detectedMimeType}; extension ${extension} expects ${expectedMimeForExtension}`,
      );
    }
  }

  return { checked: true, missing: false };
}

export function validateSiddharEvidenceFileIntegrity({
  contract = SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT,
  packetFiles,
  repositoryRootPath = repositoryRoot,
}) {
  const issues = [];
  const observedPaths = new Set();
  const observedDigests = new Set();
  let declaredFileCount = 0;
  let checkedFileCount = 0;
  let missingFileCount = 0;

  const sortedPackets = [...packetFiles].sort((left, right) => left.path.localeCompare(right.path));
  for (const packetFile of sortedPackets) {
    if (packetFile.parseError !== undefined) {
      addIssue(issues, packetFile.path, '(packet)', '(json)', `invalid JSON: ${packetFile.parseError}`);
      continue;
    }
    if (!isObject(packetFile.value)) {
      addIssue(issues, packetFile.path, '(packet)', '(packet)', 'must be a JSON object');
      continue;
    }
    if (!Array.isArray(packetFile.value.files)) {
      addIssue(issues, packetFile.path, '(packet)', 'files', 'must be an array');
      continue;
    }

    declaredFileCount += packetFile.value.files.length;
    for (const declaration of packetFile.value.files) {
      const outcome = inspectOneFile({
        root: repositoryRootPath,
        packetPath: packetFile.path,
        declaration,
        contract,
        issues,
        observedPaths,
        observedDigests,
      });
      if (outcome.checked) {
        checkedFileCount += 1;
      }
      if (outcome.missing) {
        missingFileCount += 1;
      }
    }
  }

  return {
    ok: issues.length === 0,
    contractSchemaVersion: contract.schemaVersion,
    packetCount: packetFiles.length,
    declaredFileCount,
    checkedFileCount,
    missingFileCount,
    mismatchCount: issues.length,
    automaticStatusChanges: 0,
    productionEligibleFiles: 0,
    issues: issues.sort((left, right) =>
      `${left.packetPath}:${left.filePath}:${left.field}:${left.message}`.localeCompare(
        `${right.packetPath}:${right.filePath}:${right.field}:${right.message}`,
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
  const result = validateSiddharEvidenceFileIntegrity({
    packetFiles: loadPacketFiles(),
  });

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  if (!result.ok) {
    for (const issue of result.issues) {
      console.error(`${issue.packetPath}: ${issue.filePath}: ${issue.field}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Siddhar evidence file integrity passed: ${result.packetCount} packets, ` +
      `${result.checkedFileCount}/${result.declaredFileCount} files checked, ` +
      '0 automatic status changes, 0 production-eligible files.',
  );
  console.log(`Evidence: ${relative(repositoryRoot, reportPath).replaceAll('\\', '/')}`);
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  run();
}
