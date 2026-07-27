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

Use the versions declared by `package.json`:

- Node.js `22.13.0` or later compatible 22.x release
- npm `10.0.0` or later

Confirm the active versions:

```bash
node --version
npm --version
```

## Dependency installation

Once `package-lock.json` is committed, use the immutable installation command:

```bash
npm ci --no-audit --no-fund
```

Do not regenerate or hand-edit the lockfile during unrelated changes. A lockfile change must be explained in the pull request and reviewed with the related `package.json` change.

The current quality branch may temporarily use `npm install --no-audit --no-fund` only while the validated lockfile candidate is being committed. This exception must be removed when the `npm ci` migration is complete.

## Required quality checks

Run the same checks enforced by GitHub Actions:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Record the command results in the pull request or its linked progress document. A successful build does not override a failed lint, type-check, or test command.

## GitHub Actions artifacts

Quality Gate artifacts are evidence, not source files, except for an explicitly reviewed lockfile candidate.

- `package-lock-candidate`: extract and commit only `package-lock.json`, unchanged, to the approved quality branch.
- `typecheck-evidence`: diagnostic log for review; do not commit unless a progress record requires a short, sanitised excerpt.
- `osb-admin-portal-dist`: disposable build output for inspection; do not commit `dist/` to source control.

Before using an artifact, confirm that it belongs to the expected workflow run, branch, and commit.

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
