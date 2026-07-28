import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const APPROVED_PUBLIC_KEYS = Object.freeze([
  'VITE_API_BASE_URL',
  'VITE_APP_ENV',
  'VITE_APP_VERSION',
  'VITE_AZURE_AD_API_SCOPE',
  'VITE_AZURE_AD_CLIENT_ID',
  'VITE_AZURE_AD_TENANT_ID',
]);

const APPROVED_PUBLIC_KEY_SET = new Set(APPROVED_PUBLIC_KEYS);
const SECRET_LIKE_KEY =
  /(SECRET|PASSWORD|PRIVATE[_-]?KEY|CONNECTION[_-]?STRING|STORAGE[_-]?KEY|ACCESS[_-]?KEY|API[_-]?KEY|TOKEN)/i;
const PUBLIC_KEY_REFERENCE = /\bVITE_[A-Z0-9_]+\b(?!\*)/g;
const ENV_ASSIGNMENT = /^\s*(VITE_[A-Z0-9_]+)\s*=/gm;
const TEXT_FILE = /(?:^|\/)(?:\.env(?:\.example)?|[^/]+\.(?:[cm]?[jt]sx?|json|html|ya?ml))$/;
const SYNTHETIC_FIXTURE = /(?:^|\/).*\.(?:test|spec)\.[cm]?[jt]sx?$/;

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function inspectPublicEnvironmentPolicy(files) {
  const issues = [];
  const references = [];
  const envExample = files.find((file) => file.path === '.env.example');

  if (envExample === undefined) {
    issues.push({
      path: '.env.example',
      key: '(file)',
      message: 'required public configuration example is missing',
    });
  }

  for (const file of files) {
    const keys = file.content.match(PUBLIC_KEY_REFERENCE) ?? [];

    for (const key of uniqueSorted(keys)) {
      references.push({ path: file.path, key });

      if (SECRET_LIKE_KEY.test(key)) {
        issues.push({
          path: file.path,
          key,
          message: 'secret-like key must never be exposed through Vite browser configuration',
        });
        continue;
      }

      if (!APPROVED_PUBLIC_KEY_SET.has(key)) {
        issues.push({
          path: file.path,
          key,
          message: 'key is not present in the approved public configuration allow-list',
        });
      }
    }
  }

  if (envExample !== undefined) {
    const assignments = [...envExample.content.matchAll(ENV_ASSIGNMENT)].map(
      (match) => match[1],
    );
    const assignedKeys = uniqueSorted(assignments.filter(Boolean));

    for (const key of APPROVED_PUBLIC_KEYS) {
      if (!assignedKeys.includes(key)) {
        issues.push({
          path: '.env.example',
          key,
          message: 'approved key is missing from the committed example',
        });
      }
    }

    for (const key of assignedKeys) {
      if (!APPROVED_PUBLIC_KEY_SET.has(key)) {
        issues.push({
          path: '.env.example',
          key,
          message: 'example contains an unapproved public configuration key',
        });
      }
    }
  }

  return {
    ok: issues.length === 0,
    approvedKeys: APPROVED_PUBLIC_KEYS,
    inspectedFiles: files.map((file) => file.path).sort(),
    references: references.sort((left, right) =>
      `${left.path}:${left.key}`.localeCompare(`${right.path}:${right.key}`),
    ),
    issues: issues.sort((left, right) =>
      `${left.path}:${left.key}:${left.message}`.localeCompare(
        `${right.path}:${right.key}:${right.message}`,
      ),
    ),
  };
}

function listTrackedPolicyFiles(repositoryRoot) {
  const output = execFileSync('git', ['ls-files', '-z'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });

  return output
    .split('\0')
    .filter(Boolean)
    .filter((path) => TEXT_FILE.test(path))
    .filter((path) => !SYNTHETIC_FIXTURE.test(path))
    .filter(
      (path) =>
        path === '.env.example' ||
        path === 'index.html' ||
        path === 'vite.config.ts' ||
        path.startsWith('src/') ||
        path.startsWith('public/') ||
        path.startsWith('.github/'),
    )
    .map((path) => ({
      path,
      content: readFileSync(resolve(repositoryRoot, path), 'utf8'),
    }));
}

function run() {
  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const repositoryRoot = resolve(scriptDirectory, '..');
  const evidencePath = resolve(
    repositoryRoot,
    'quality-evidence/public-env-policy.json',
  );
  const result = inspectPublicEnvironmentPolicy(
    listTrackedPolicyFiles(repositoryRoot),
  );

  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  if (!result.ok) {
    for (const issue of result.issues) {
      console.error(`${issue.path}: ${issue.key}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Public environment policy passed: ${result.approvedKeys.length} approved keys, ` +
      `${result.inspectedFiles.length} files inspected, ${result.references.length} references checked.`,
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
