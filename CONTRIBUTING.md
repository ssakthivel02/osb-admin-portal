# Contributing

## Repository safety

Keep changes small, reviewable, and evidence-based.

- Do not commit secrets, credentials, tokens, private keys, or production data.
- Do not change production infrastructure or deployment configuration as part of a repository-quality task.
- Do not merge directly to `main`.
- Do not claim production readiness from scaffold, lint, test, or build evidence alone.

## Branching during the remediation baseline

The active remediation base is `audit/repository-baseline`.

Create clearly named child branches from that base, for example:

```text
quality/<task-name>
docs/<task-name>
security/<task-name>
```

Pull requests for remediation work must target `audit/repository-baseline`. A later merge to `main` requires separate review and approval.

## Local prerequisites

Use the runtime declared by the repository and validated by CI:

- Node.js `22.13.0` for CI-equivalent evidence
- npm `10.0.0` or later

Confirm the active versions:

```bash
node --version
npm --version
```

`package.json` permits Node.js `22.13.0` or later, but results intended to match the current Quality Gate should use Node.js `22.13.0`.

## Dependency installation

The repository contains a committed `package-lock.json`. Use the immutable installation command:

```bash
npm ci --no-audit --no-fund
```

Do not use `npm install` for CI-equivalent validation. Do not regenerate or hand-edit the lockfile during unrelated changes. A lockfile change must be explained in the pull request and reviewed together with the related `package.json` change.

The Quality Gate verifies that `npm ci` leaves `package-lock.json` unchanged.

## Required quality checks

Run the same checks enforced by GitHub Actions:

```bash
npm run lint
npm run typecheck
npm run test:ci
npm run build
```

`npm run test` remains available for a concise local test run. `npm run test:ci` also creates machine-readable JUnit evidence at `quality-evidence/junit.xml`.

Record command results in the pull request or its linked progress document. A successful build does not override a failed lint, type-check, or test command.

Coverage reporting and a coverage threshold are not yet enforced. Do not infer source-code coverage from passing tests or JUnit output.

## GitHub Actions artifacts

Current Quality Gate artifacts are evidence and must not be committed back into source control:

- `typecheck-evidence`: diagnostic TypeScript output for review.
- `test-evidence`: JUnit XML proving the executed test count and results; it does not measure source coverage.
- `osb-admin-portal-dist`: disposable production-build output for inspection; do not commit `dist/`.

Before using an artifact, confirm that it belongs to the expected workflow run, branch, and commit. Artifact retention is currently seven days.

## Commit format

Use clear conventional-style commit messages where practical:

```text
ci: ...
test: ...
docs: ...
chore: ...
fix: ...
```

Keep one logical quality task per commit whenever possible.

## Pull requests

Every pull request must state:

- exact scope and files changed;
- branch and base branch;
- validation commands and results;
- security and infrastructure impact;
- known blockers and limitations;
- the next remediation task.

Use `.github/pull_request_template.md` and keep remediation pull requests in draft until the evidence is complete.

## Architecture changes

Any material architectural deviation requires an Architecture Decision Record. Repository-quality changes must not silently introduce new services, authentication models, data stores, or production dependencies.
