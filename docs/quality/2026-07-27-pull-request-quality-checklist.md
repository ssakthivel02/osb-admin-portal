# Pull Request Quality Checklist Baseline

## Scope completed

Added `.github/pull_request_template.md` on `quality/ci-gate` to make repository-truth, safety, command evidence, documentation, and follow-up requirements visible on future pull requests.

This is a non-destructive governance control. It does not change application runtime behaviour, production infrastructure, deployment targets, data, authentication, or secrets.

## Exact change

The template requires contributors to record:

- the single reviewable purpose of the pull request;
- whether the work is based on `audit/repository-baseline` or an approved child branch;
- the distinction between implemented, planned, and blocked work;
- explicit confirmation that no unsupported production-readiness claim is made;
- secret, infrastructure, destructive-change, and Dataset B safety checks;
- exact `npm ci`, lint, type-check, test, and build evidence;
- test coverage or a documented reason for no test;
- progress-document updates, blockers, and the next remediation task;
- confirmation that this quality-baseline work is not requesting a merge to `main`.

## Evidence

Repository write completed successfully.

- Implementation commit: `b7ddeee4502898faa17cdacf537268aa4283fd60`
- Previous verified Quality Gate run: `30273574552`
- Previous run conclusion: `success`
- Previous run passed dependency installation, generated-lockfile verification, lint, type-check, tests, build, evidence upload, and build artifact upload.

The checklist itself is Markdown-only, so it does not alter or independently prove the executable baseline. The branch update must still be validated by the newly triggered GitHub Actions run before any new green status is claimed.

## Current blockers

1. `package-lock.json` is still not committed to the branch.
2. CI still uses `npm install` rather than `npm ci`.
3. Reproducible dependency installation is therefore not yet established.
4. Authentication, API contracts, editorial workflows, and production deployment remain intentionally blocked.
5. The new branch run triggered by this documentation change has not yet been inspected.

## Manual task

No immediate manual action is required for this checklist change.

The next lockfile task may require manual assistance only if the GitHub connector cannot commit the validated `package-lock.json` artifact directly. In that case, download the `package-lock-candidate` artifact from the latest successful Quality Gate run and upload its contained `package-lock.json` unchanged to `quality/ci-gate`. Do not edit or regenerate it with a different Node/npm toolchain.

## Next task

Inspect the workflow run triggered by commit `b7ddeee4502898faa17cdacf537268aa4283fd60`. If it passes, commit the already validated `package-lock.json` candidate unchanged, change the workflow install command to `npm ci --no-audit --no-fund`, remove the temporary lockfile-candidate generation/upload steps, and require the complete quality gate to pass again.

## Status

PULL REQUEST QUALITY CHECKLIST COMMITTED

REVALIDATION PENDING — REPRODUCIBLE INSTALLATION AND PRODUCTION READINESS REMAIN BLOCKED
