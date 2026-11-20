# Contributor Guide and CI Reconciliation

Date: 2026-07-27

Branch: `quality/ci-gate`

Base branch: `audit/repository-baseline`

Implementation commit: `bf2befc327c90cdde1df1e1ae2f7c702120b10c0`

## Objective

Remove stale contributor instructions that described the temporary lockfile-candidate workflow and align local validation guidance with the repository's current immutable-install and JUnit-evidence Quality Gate.

## Repository evidence inspected

The current repository state showed:

- PR #2 is open, draft, unmerged, and targets `audit/repository-baseline` from `quality/ci-gate`.
- `package.json` contains `test:ci`, which runs Vitest with default and JUnit reporters and writes `quality-evidence/junit.xml`.
- the Quality Gate uses Node.js `22.13.0`, `npm ci --no-audit --no-fund`, and a lockfile drift check;
- the Quality Gate uploads `typecheck-evidence`, `test-evidence`, and `osb-admin-portal-dist`;
- the old `package-lock-candidate` artifact is no longer produced;
- the previous branch-head Quality Gate run `30289464968` completed successfully.

## Change completed

Updated `CONTRIBUTING.md` to:

- require Node.js `22.13.0` for CI-equivalent evidence;
- state that the committed lockfile must be installed with `npm ci`;
- remove the obsolete temporary `npm install` exception;
- document the lockfile drift check;
- use `npm run test:ci` in the CI-equivalent command sequence;
- describe the generated JUnit path;
- replace the retired `package-lock-candidate` guidance with the current three artifacts;
- explicitly state that JUnit success is not source-code coverage;
- retain the security, branch, review, and non-production-readiness boundaries.

No runtime source, dependency, lockfile, test implementation, secret, data, deployment configuration, or production infrastructure was changed.

## Command and CI evidence

No local repository execution environment was available for this documentation-only task.

The immediately preceding branch head was validated by GitHub Actions run:

```text
Run ID: 30289464968
Run number: 80
Conclusion: success
```

That evidence applies to the pre-change branch head. A separate Quality Gate result is required for the implementation and progress-document commits before those commits are described as CI-validated.

## Blockers and limitations

- The application remains a small scaffold.
- JUnit evidence records executed tests and outcomes but not source-code coverage.
- No coverage provider, measured baseline, or coverage threshold is currently committed.
- Authentication, authorization, API integration, persistence, audit logging, deployment verification, and production security acceptance remain incomplete.
- Production readiness is not established.

## Next task

Add the Vitest coverage provider through a reviewed `package.json` and `package-lock.json` update, publish deterministic coverage evidence in CI, measure the current baseline, and introduce only a conservative threshold supported by that measurement.
