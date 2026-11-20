# Dependency update monitoring baseline

Date: 2026-07-27

Branch: `quality/ci-gate`

## Task completed

Added `.github/dependabot.yml` to establish reviewable dependency-update monitoring for both the root npm project and GitHub Actions workflows.

## Repository evidence inspected

- Pull request #2 remains open, draft, unmerged, and targets `audit/repository-baseline` rather than `main`.
- The current branch head before this task was `119ad5e47c75b745fc7edbe2887bb532a3884f51`.
- GitHub Actions run `30265130200` completed successfully for that head, confirming that the immutable action pins did not break the existing scaffold quality gate.
- A committed `package-lock.json` is still absent, so npm dependency resolution is not yet reproducible.

## Exact change

Created `.github/dependabot.yml` with two weekly update streams:

1. npm dependencies in `/`
   - Monday at 06:00 Europe/London
   - maximum five open update pull requests
   - minor and patch updates grouped into one review unit
   - commit prefix `deps`

2. GitHub Actions dependencies in `/`
   - Monday at 06:30 Europe/London
   - maximum five open update pull requests
   - commit prefix `ci`

Implementation commit:

- `cafe73685d098c010c8f3692de776a427f39e439`

## Security and safety boundaries

- No production infrastructure or deployment settings changed.
- No secrets, credentials, registries, or authentication configuration were added.
- No branch was merged and no data was deleted.
- Dependabot pull requests must still pass the existing quality gate and receive human review; this configuration does not enable automatic merge.
- GitHub normally reads Dependabot version-update configuration from the repository default branch. Because this work remains on a draft child branch, monitoring must not be claimed active until the configuration reaches the appropriate protected branch through review.

## Command and service evidence

No local commands were required for the YAML-only change. GitHub accepted the file creation on `quality/ci-gate` and returned commit `cafe73685d098c010c8f3692de776a427f39e439`.

The previous pinned-action validation run was:

- workflow: `Quality Gate`
- run ID: `30265130200`
- conclusion: success

A new workflow result for this documentation commit must be inspected before claiming that the branch remains green.

## Remaining blockers

1. `package-lock.json` has not been committed.
2. CI still resolves dependencies using `npm install` rather than enforcing the lockfile with `npm ci`.
3. Dependabot monitoring is configured but cannot be claimed operational while the file exists only on the draft child branch.
4. Authentication, API integration, editorial workflows, deployment, monitoring, and production readiness remain intentionally blocked.

## Next task

Commit the previously validated `package-lock.json` candidate, replace `npm install --no-audit --no-fund` with `npm ci --no-audit --no-fund`, remove the temporary lockfile-candidate capture step, and require the complete quality gate to pass again. Do not extend the application feature set before reproducible installation is evidenced.

## Status

DEPENDENCY UPDATE MONITORING CONFIGURATION COMMITTED

ACTIVATION AND REPRODUCIBLE INSTALLATION REMAIN UNVERIFIED — PRODUCTION READINESS REMAINS BLOCKED
