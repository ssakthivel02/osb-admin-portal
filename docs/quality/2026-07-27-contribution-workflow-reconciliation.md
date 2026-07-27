# Contribution Workflow Reconciliation

Date: 2026-07-27

Branch: `quality/ci-gate`

Base branch: `audit/repository-baseline`

Implementation commit: `83d13002868fa3caa28eaf8a70b7ecc7515a127f`

## Objective

Reconcile the repository contribution instructions with the verified remediation workflow and remove misleading guidance that directed all pull requests straight to `main`.

## Repository evidence inspected

- Pull request #2 is open, draft, unmerged, and targets `audit/repository-baseline` from `quality/ci-gate`.
- Quality Gate run `30274202933` (run number 54) completed successfully for the previous branch head.
- The workflow currently installs dependencies with `npm install --no-audit --no-fund`, generates a temporary lockfile, and uploads it as `package-lock-candidate`.
- No committed `package-lock.json` existed on `quality/ci-gate` when checked.

## Change completed

Updated `CONTRIBUTING.md` to document:

- remediation pull requests targeting `audit/repository-baseline`, not direct merges to `main`;
- repository safety and secret-handling boundaries;
- Node.js and npm prerequisites from `package.json`;
- the required `npm ci` end-state and the current temporary `npm install` exception;
- the required lint, type-check, test, and build commands;
- correct handling of `package-lock-candidate`, `typecheck-evidence`, and `osb-admin-portal-dist` artifacts;
- pull-request evidence and blocker requirements;
- Architecture Decision Record requirements for material architecture changes.

No application runtime code, dependencies, secrets, production data, deployment configuration, or infrastructure were changed.

## Command and artifact evidence

The downloaded `package-lock-candidate` ZIP was inspected outside the repository:

```text
Archive member: package-lock.json
Uncompressed size: 115410 bytes
SHA-256: 56e798f9ff5f6929a80d98a9f2cd88c40a0dadb3e80993d136ddc20ed66aa786
lockfileVersion: 3
package records: 227
```

Its root dependencies and development dependencies match `package.json` exactly.

The latest verified pre-change Quality Gate passed dependency installation, lockfile verification, lint, type-check, tests, build, and artifact uploads. This does not establish reproducible installation because the lockfile is not yet committed.

## Validation status

The documentation change is committed. A new Quality Gate result for the implementation and this progress record must be inspected before claiming that these commits passed CI.

## Blockers

- `package-lock.json` is still absent from the repository branch.
- CI still uses `npm install` and therefore does not yet prove immutable dependency installation.
- The downloaded build artifact is inspection evidence only and must not be committed as `dist/`.
- Production readiness is not established.

## Next task

1. Extract `package-lock.json` from the downloaded `package-lock-candidate` ZIP.
2. Commit that file unchanged to the root of `quality/ci-gate`.
3. Replace `npm install --no-audit --no-fund` with `npm ci --no-audit --no-fund`.
4. Remove the temporary lockfile verification and upload steps.
5. Require the complete Quality Gate to pass again before extending the application baseline.
