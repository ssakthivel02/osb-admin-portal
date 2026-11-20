import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SIDDHAR_SUBJECT_FINGERPRINT_ALGORITHM,
  fingerprintCanonicalJson,
} from './siddhar-subject-fingerprint.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const ALLOWED_PREFIXES = [
  'docs/content-intake/evidence/submissions/',
  'docs/content-intake/evidence/rights/decisions/',
];

function toRepositoryPath(root, absolutePath) {
  return relative(root, absolutePath).replaceAll('\\', '/');
}

function isInside(root, absolutePath) {
  const path = relative(root, absolutePath);
  return (
    path !== '' &&
    path !== '..' &&
    !path.startsWith(`..${sep}`) &&
    !isAbsolute(path)
  );
}

export function fingerprintSiddharSubjectFile({
  repositoryRootPath = repositoryRoot,
  path,
}) {
  if (typeof path !== 'string' || path.length === 0) {
    throw new TypeError('path must be a non-empty repository-relative string');
  }
  if (
    path.includes('..') ||
    path.includes('\\') ||
    path.includes('\u0000') ||
    !path.endsWith('.json') ||
    !ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))
  ) {
    throw new Error(
      'path must be a normalised JSON path under submissions/ or rights/decisions/',
    );
  }

  const absolutePath = resolve(repositoryRootPath, path);
  if (
    !isInside(repositoryRootPath, absolutePath) ||
    toRepositoryPath(repositoryRootPath, absolutePath) !== path
  ) {
    throw new Error('path must resolve inside the repository root');
  }
  if (!existsSync(absolutePath)) {
    throw new Error(`subject file does not exist: ${path}`);
  }

  const stats = lstatSync(absolutePath);
  if (stats.isSymbolicLink()) {
    throw new Error(`subject file must not be a symbolic link: ${path}`);
  }
  if (!stats.isFile()) {
    throw new Error(`subject path must reference a regular file: ${path}`);
  }

  const rootReal = realpathSync(repositoryRootPath);
  const subjectReal = realpathSync(absolutePath);
  if (!isInside(rootReal, subjectReal)) {
    throw new Error(`subject file resolves outside the repository root: ${path}`);
  }

  let value;
  try {
    value = JSON.parse(readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    throw new Error(
      `subject file must contain valid JSON: ${error instanceof Error ? error.message : 'parse error'}`,
      { cause: error },
    );
  }

  return {
    path,
    algorithm: SIDDHAR_SUBJECT_FINGERPRINT_ALGORITHM,
    fingerprint: fingerprintCanonicalJson(value),
  };
}

function run() {
  const paths = process.argv.slice(2);
  if (paths.length === 0) {
    console.error(
      'Usage: npm run fingerprint:siddhar -- <packet.json> [rights-decision.json ...]',
    );
    process.exitCode = 1;
    return;
  }

  try {
    const results = paths.map((path) =>
      fingerprintSiddharSubjectFile({ path }),
    );
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Fingerprint generation failed');
    process.exitCode = 1;
  }
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  run();
}
