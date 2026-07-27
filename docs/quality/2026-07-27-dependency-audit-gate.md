# Dependency Audit Gate

Date: 2026-07-27

Branch: `quality/ci-gate`

Base branch: `audit/repository-baseline`

Implementation commit: `a50661dfa2310cefa90b64dc98a85f51893d6fa8`

## Objective

Add an executable dependency-security check to the existing Quality Gate without changing application behaviour, production infrastructure, secrets, data, or deployment configuration.

## Repository evidence inspected

Before this task:

- the workflow already used the committed lockfile with `npm ci --no-audit --no-fund`;
- lockfile drift, lint, strict TypeScript type-check, JUnit tests, and production build were enforced;
- no `npm audit` command or dependency-audit evidence artifact was present;
- `SECURITY.md` required dependency audit evidence as part of the production security gates;
- pull request #2 was open, draft, unmerged, and targeted `audit/repository-baseline` from `quality/ci-gate`.

## Exact change

Updated `.github/workflows/quality-gate.yml` to:

1. rename the job to `Lint, type-check, test, build, and audit`;
2. run the following command after the build artifact is produced:

```bash
mkdir -p quality-evidence
npm audit --audit-level=high --json > quality-evidence/npm-audit.json
```

3. upload `quality-evidence/npm-audit.json` as the `dependency-audit-evidence` artifact;
4. retain the evidence for seven days;
5. fail the Quality Gate when npm reports a high- or critical-severity dependency vulnerability.

The audit runs after the existing build and build-artifact steps so lint, type-check, tests, and build evidence remain available even when a future dependency audit fails.

## Verified CI evidence

GitHub Actions Quality Gate run `30300026020` (run number 96) completed successfully for implementation commit `a50661dfa2310cefa90b64dc98a85f51893d6fa8`.

The job completed:

- Node.js setup from `.nvmrc`;
- runtime-version recording;
- immutable `npm ci` installation;
- lockfile drift verification;
- lint;
- strict TypeScript type-check and evidence upload;
- JUnit tests and evidence upload;
- production build and artifact upload;
- high-severity dependency audit and evidence upload.

The downloaded audit evidence contained:

```text
Audit report version: 2
Info: 0
Low: 0
Moderate: 0
High: 0
Critical: 0
Total vulnerabilities: 0
Dependencies reported: 226
```

Artifact evidence:

```text
Name: dependency-audit-evidence
Artifact ID: 8666176125
Artifact digest: sha256:559aded9217a6c16b4d3fc86bfe9d51fb2881f30376f2089660d46e9008f8b70
Head SHA: a50661dfa2310cefa90b64dc98a85f51893d6fa8
```

This evidence applies to the dependency graph resolved by the committed lockfile at that commit. It is not a guarantee against future disclosures, malicious packages, source-code vulnerabilities, exposed secrets, or production misconfiguration.

## Safety impact

- no main-branch merge or auto-merge was performed;
- no secrets, credentials, datasets, or production configuration were added;
- no application source or runtime behaviour changed;
- no dependency or lockfile content changed;
- workflow permissions remain read-only for repository contents;
- production readiness is not claimed.

## Blockers and limitations

- GitHub secret scanning and code scanning are not evidenced by this task;
- source-code coverage reporting and thresholds remain absent;
- the application remains a small scaffold with no verified authentication, authorisation, API integration, persistence, audit logging, deployment validation, or production security assessment;
- `npm audit` depends on the npm advisory service and cannot detect every supply-chain or code-level risk.

## Next task

Add deterministic Vitest source-code coverage using the matching coverage provider, update `package.json` and `package-lock.json` together, publish coverage evidence, measure the actual baseline, and only then introduce a conservative evidence-based threshold.
