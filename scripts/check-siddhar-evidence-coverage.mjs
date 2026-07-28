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
const manifestPath = resolve(
  repositoryRoot,
  'docs/content-intake/evidence/siddhar-evidence-manifest.json',
);
const submissionsDirectory = resolve(
  repositoryRoot,
  'docs/content-intake/evidence/submissions',
);
const reportPath = resolve(repositoryRoot, 'quality-evidence/siddhar-evidence-coverage.json');
const uploadPrefix = 'docs/content-intake/evidence/uploads/';
const packetIdPattern = /^SID-SUB-\d{8}-\d{3}$/;

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function toRepositoryPath(root, absolutePath) {
  return relative(root, absolutePath).replaceAll('\\', '/');
}

function isInside(parent, child) {
  const relativePath = relative(parent, child);
  return (
    relativePath !== '' &&
    relativePath !== '..' &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath)
  );
}

function addIssue(issues, path, field, message, manifestItemId = null) {
  issues.push({ path, field, message, manifestItemId });
}

function buildManifestMap(manifest, issues) {
  const items = new Map();
  const path = 'docs/content-intake/evidence/siddhar-evidence-manifest.json';
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

function isSafeDeclaredPath(value, root) {
  if (
    !isNonEmptyString(value) ||
    !value.startsWith(uploadPrefix) ||
    value.includes('..') ||
    value.includes('\\') ||
    value.includes('\u0000')
  ) {
    return false;
  }

  return toRepositoryPath(root, resolve(root, value)) === value;
}

function scanUploads(root, contract, issues) {
  const uploadsRoot = resolve(root, 'docs/content-intake/evidence/uploads');
  if (!existsSync(uploadsRoot)) {
    return [];
  }

  let uploadsStats;
  try {
    uploadsStats = lstatSync(uploadsRoot);
  } catch (error) {
    addIssue(
      issues,
      'docs/content-intake/evidence/uploads',
      'path',
      `could not inspect uploads directory: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    return [];
  }

  if (uploadsStats.isSymbolicLink()) {
    addIssue(
      issues,
      'docs/content-intake/evidence/uploads',
      'path',
      'uploads directory must not be a symbolic link',
    );
    return [];
  }
  if (!uploadsStats.isDirectory()) {
    addIssue(
      issues,
      'docs/content-intake/evidence/uploads',
      'path',
      'uploads path must be a directory',
    );
    return [];
  }

  const rootReal = realpathSync(root);
  const uploadsReal = realpathSync(uploadsRoot);
  if (!isInside(rootReal, uploadsReal)) {
    addIssue(
      issues,
      'docs/content-intake/evidence/uploads',
      'path',
      'uploads directory must resolve inside the repository root',
    );
    return [];
  }

  const files = [];
  function visit(directory) {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    );

    for (const entry of entries) {
      const absolutePath = resolve(directory, entry.name);
      const path = toRepositoryPath(root, absolutePath);
      let stats;
      try {
        stats = lstatSync(absolutePath);
      } catch (error) {
        addIssue(
          issues,
          path,
          'path',
          `could not inspect upload entry: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
        continue;
      }

      if (stats.isSymbolicLink()) {
        addIssue(issues, path, 'path', 'symbolic links are forbidden in the uploads directory');
        continue;
      }
      if (stats.isDirectory()) {
        visit(absolutePath);
        continue;
      }
      if (!stats.isFile()) {
        addIssue(issues, path, 'path', 'only regular files and directories are allowed');
        continue;
      }

      let resolvedFile;
      try {
        resolvedFile = realpathSync(absolutePath);
      } catch (error) {
        addIssue(
          issues,
          path,
          'path',
          `could not resolve upload file: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
        continue;
      }
      if (!isInside(uploadsReal, resolvedFile)) {
        addIssue(issues, path, 'path', 'upload file must resolve inside the controlled uploads directory');
        continue;
      }

      if (!contract.allowedFileExtensions.includes(extname(path).toLowerCase())) {
        addIssue(issues, path, 'extension', 'is not an approved evidence extension');
      }
      files.push(path);
    }
  }

  visit(uploadsRoot);
  return files.sort((left, right) => left.localeCompare(right));
}

function collectValidPackets({ packetFiles, manifestItems, contract, root, issues }) {
  const packetIds = new Set();
  const declarationsByPath = new Map();
  const validPackets = [];

  const sortedPackets = [...packetFiles].sort((left, right) => left.path.localeCompare(right.path));
  for (const packetFile of sortedPackets) {
    const initialIssueCount = issues.length;
    if (packetFile.parseError !== undefined) {
      addIssue(issues, packetFile.path, '(json)', `invalid JSON: ${packetFile.parseError}`);
      continue;
    }
    if (!isObject(packetFile.value)) {
      addIssue(issues, packetFile.path, '(packet)', 'must be a JSON object');
      continue;
    }

    const packet = packetFile.value;
    if (!isNonEmptyString(packet.packetId) || !packetIdPattern.test(packet.packetId)) {
      addIssue(issues, packetFile.path, 'packetId', 'must use SID-SUB-YYYYMMDD-NNN');
    } else if (packetIds.has(packet.packetId)) {
      addIssue(issues, packetFile.path, 'packetId', 'must be unique');
    } else {
      packetIds.add(packet.packetId);
    }

    const manifestItem = manifestItems.get(packet.manifestItemId);
    if (manifestItem === undefined) {
      addIssue(
        issues,
        packetFile.path,
        'manifestItemId',
        'must reference an existing SID-EV-* manifest item',
      );
    } else if (packet.manifestStatusObserved !== manifestItem.status) {
      addIssue(
        issues,
        packetFile.path,
        'manifestStatusObserved',
        'must match the current manifest status',
        packet.manifestItemId,
      );
    }

    if (!contract.packetStatuses.includes(packet.submissionStatus)) {
      addIssue(
        issues,
        packetFile.path,
        'submissionStatus',
        'must use an approved packet status',
        packet.manifestItemId,
      );
    }
    if (packet.productionEligible !== false) {
      addIssue(
        issues,
        packetFile.path,
        'productionEligible',
        'must remain false',
        packet.manifestItemId,
      );
    }
    if (!Array.isArray(packet.files) || packet.files.length === 0) {
      addIssue(
        issues,
        packetFile.path,
        'files',
        'must contain at least one evidence-file declaration',
        packet.manifestItemId,
      );
    }

    const paths = [];
    if (Array.isArray(packet.files)) {
      for (const [index, declaration] of packet.files.entries()) {
        const field = `files[${index}].path`;
        if (!isObject(declaration) || !isSafeDeclaredPath(declaration.path, root)) {
          addIssue(
            issues,
            packetFile.path,
            field,
            `must be a normalised path under ${uploadPrefix}`,
            packet.manifestItemId,
          );
          continue;
        }
        if (!contract.allowedFileExtensions.includes(extname(declaration.path).toLowerCase())) {
          addIssue(
            issues,
            packetFile.path,
            field,
            'uses an unsupported evidence extension',
            packet.manifestItemId,
          );
        }
        paths.push(declaration.path);
      }
    }

    if (issues.length !== initialIssueCount || manifestItem === undefined) {
      continue;
    }

    const validPacket = {
      packetId: packet.packetId,
      packetPath: packetFile.path,
      manifestItemId: packet.manifestItemId,
      paths,
    };
    validPackets.push(validPacket);
    for (const path of paths) {
      const declarations = declarationsByPath.get(path) ?? [];
      declarations.push(validPacket);
      declarationsByPath.set(path, declarations);
    }
  }

  return { declarationsByPath, validPackets };
}

function buildCoverageByManifestItem({ manifestItems, validPackets, uploadFileSet, declarationsByPath }) {
  const summaries = new Map();
  for (const packet of validPackets) {
    const summary = summaries.get(packet.manifestItemId) ?? {
      packetIds: new Set(),
      declaredPaths: new Set(),
      observedPaths: new Set(),
    };
    summary.packetIds.add(packet.packetId);
    for (const path of packet.paths) {
      summary.declaredPaths.add(path);
      if (uploadFileSet.has(path) && (declarationsByPath.get(path) ?? []).length === 1) {
        summary.observedPaths.add(path);
      }
    }
    summaries.set(packet.manifestItemId, summary);
  }

  return [...manifestItems.values()]
    .map((item) => {
      const summary = summaries.get(item.id) ?? {
        packetIds: new Set(),
        declaredPaths: new Set(),
        observedPaths: new Set(),
      };
      let coverageState = 'NO_PACKET';
      if (summary.packetIds.size > 0 && summary.declaredPaths.size === 0) {
        coverageState = 'PACKET_WITHOUT_FILES';
      } else if (summary.declaredPaths.size > 0 && summary.observedPaths.size === 0) {
        coverageState = 'FILES_MISSING';
      } else if (summary.observedPaths.size < summary.declaredPaths.size) {
        coverageState = 'PARTIAL';
      } else if (summary.declaredPaths.size > 0) {
        coverageState = 'COVERED';
      }

      return {
        manifestItemId: item.id,
        siddhar: item.siddhar,
        itemTitle: item.itemTitle,
        priority: item.priority,
        status: item.status,
        packetCount: summary.packetIds.size,
        declaredFileCount: summary.declaredPaths.size,
        observedFileCount: summary.observedPaths.size,
        coverageState,
      };
    })
    .sort((left, right) => left.manifestItemId.localeCompare(right.manifestItemId));
}

export function validateSiddharEvidenceCoverage({
  manifest,
  packetFiles,
  repositoryRootPath = repositoryRoot,
  contract = SIDDHAR_EVIDENCE_SUBMISSION_CONTRACT,
}) {
  const issues = [];
  const manifestItems = buildManifestMap(manifest, issues);
  const uploadFiles = scanUploads(repositoryRootPath, contract, issues);
  const { declarationsByPath, validPackets } = collectValidPackets({
    packetFiles,
    manifestItems,
    contract,
    root: repositoryRootPath,
    issues,
  });

  const uploadFileSet = new Set(uploadFiles);
  let orphanFileCount = 0;
  let missingDeclaredFileCount = 0;
  let duplicateDeclarationPathCount = 0;
  let coveredFileCount = 0;

  for (const uploadPath of uploadFiles) {
    const declarations = declarationsByPath.get(uploadPath) ?? [];
    if (declarations.length === 0) {
      orphanFileCount += 1;
      addIssue(
        issues,
        uploadPath,
        'coverage',
        'upload file is orphaned and must be declared by exactly one valid packet',
      );
    } else if (declarations.length === 1) {
      coveredFileCount += 1;
    }
  }

  const sortedDeclarations = [...declarationsByPath.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
  for (const [declaredPath, declarations] of sortedDeclarations) {
    if (!uploadFileSet.has(declaredPath)) {
      missingDeclaredFileCount += 1;
      addIssue(
        issues,
        declarations[0].packetPath,
        'coverage',
        `declared evidence file is missing: ${declaredPath}`,
        declarations[0].manifestItemId,
      );
    }
    if (declarations.length > 1) {
      duplicateDeclarationPathCount += 1;
      addIssue(
        issues,
        declaredPath,
        'coverage',
        `evidence path is declared by ${declarations.length} packets; exactly one is required`,
      );
    }
  }

  const coverageByManifestItem = buildCoverageByManifestItem({
    manifestItems,
    validPackets,
    uploadFileSet,
    declarationsByPath,
  });
  const coveredManifestItems = coverageByManifestItem.filter(
    (item) => item.coverageState === 'COVERED',
  ).length;
  const manifestItemCount = coverageByManifestItem.length;
  const coveragePercent =
    manifestItemCount === 0
      ? 0
      : Number(((coveredManifestItems / manifestItemCount) * 100).toFixed(2));

  return {
    ok: issues.length === 0,
    contractSchemaVersion: contract.schemaVersion,
    manifestItemCount,
    packetFileCount: packetFiles.length,
    validPacketCount: validPackets.length,
    declaredFileCount: sortedDeclarations.reduce(
      (total, [, declarations]) => total + declarations.length,
      0,
    ),
    uniqueDeclaredFileCount: declarationsByPath.size,
    uploadFileCount: uploadFiles.length,
    coveredFileCount,
    orphanFileCount,
    missingDeclaredFileCount,
    duplicateDeclarationPathCount,
    coveredManifestItems,
    uncoveredManifestItems: manifestItemCount - coveredManifestItems,
    coveragePercent,
    automaticStatusChanges: 0,
    productionEligibleFiles: 0,
    coverageByManifestItem,
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
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const result = validateSiddharEvidenceCoverage({
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
    `Siddhar evidence coverage passed: ${result.validPacketCount} valid packets, ` +
      `${result.coveredFileCount}/${result.uploadFileCount} upload files covered, ` +
      `${result.coveredManifestItems}/${result.manifestItemCount} manifest items covered, ` +
      '0 automatic status changes, 0 production-eligible files.',
  );
  console.log(`Evidence: ${toRepositoryPath(repositoryRoot, reportPath)}`);
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  run();
}
