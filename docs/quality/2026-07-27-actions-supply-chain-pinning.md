# GitHub Actions supply-chain pinning

Date: 2026-07-27
Branch: `quality/ci-gate`

## Scope completed

Pinned every third-party action used by the Quality Gate workflow to the exact immutable commit previously resolved by GitHub Actions. This removes mutable major-version tags from the executable workflow while retaining readable version comments.

## Files changed

- `.github/workflows/quality-gate.yml`
- `docs/quality/2026-07-27-actions-supply-chain-pinning.md`

## Exact changes

- `actions/checkout@v4` → `actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4`
- `actions/setup-node@v4` → `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4`
- All three `actions/upload-artifact@v4` references → `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4`

No workflow permissions, triggers, commands, application source, infrastructure, secrets, deployment behaviour, or production resources were changed.

## Evidence

GitHub Actions run `30245752675` recorded the exact action commits downloaded by the runner:

- checkout: `11d5960a326750d5838078e36cf38b85af677262`
- setup-node: `49933ea5288caeca8642d1e84afbd3f7d6820020`
- upload-artifact: `ea165f8d65b6e75b540449e92b4886f43607fa02`

Implementation commit:

- `13bad1bc4c7c03cd55ad47adec8eb5dba9df2d30`

## Command evidence

No local command result is claimed. The workflow change must be validated by the GitHub Actions run triggered by the branch commits. A green result from an earlier mutable-tag workflow does not prove the pinned workflow passes.

## Current blockers

1. The new pinned-action workflow run has not yet been inspected.
2. `package-lock.json` is still not committed, so dependency installation remains non-reproducible.
3. CI still uses `npm install`; `npm ci` cannot be enforced until the validated lockfile is committed.
4. Authentication, API integration, editorial workflows, deployment, and production readiness remain intentionally blocked.

## Next task

Inspect the workflow run triggered by this change. If the complete gate passes, commit the already validated `package-lock.json` candidate unchanged, replace `npm install --no-audit --no-fund` with `npm ci --no-audit --no-fund`, and require the complete gate to pass again.

## Status

ACTION SUPPLY-CHAIN PINNING COMMITTED

REVALIDATION PENDING — PRODUCTION READINESS REMAINS BLOCKED
