# Deterministic JUnit Test Evidence

Date: 2026-07-27

Branch: `quality/ci-gate`

Base branch: `audit/repository-baseline`

Implementation commits:

- `fa38c0844fb60be1bd9b18e2bb50f39036af5fb3` — add the deterministic CI test command
- `b57f13e4621334f9fc02fde35012b387d202ff67` — execute the command and publish JUnit evidence in the Quality Gate

## Objective

Add machine-readable, deterministic test-result evidence to the existing quality gate without changing application runtime behaviour, dependencies, the lockfile, production infrastructure, or deployment configuration.

## Repository evidence inspected

Before this task:

- Pull request #2 was open, draft, unmerged, and targeted `audit/repository-baseline` from `quality/ci-gate`.
- Quality Gate run `30287526348` completed successfully for the previous branch head.
- The workflow used immutable `npm ci`, verified lockfile stability, linted, type-checked, ran Vitest, built the application, and uploaded type-check/build artifacts.
- Test output was visible in the job log, but no machine-readable test-result artifact was retained.
- `package.json` contained `test: vitest run` but no dedicated CI report command.

## Change completed

### `package.json`

Added:

```text
"test:ci": "vitest run --reporter=default --reporter=junit --outputFile=quality-evidence/junit.xml"
```

This preserves normal terminal output while producing a JUnit XML report for CI consumers. No dependency versions changed, so `package-lock.json` did not require modification.

### `.github/workflows/quality-gate.yml`

Replaced the plain test step with a CI-specific test step that:

1. creates `quality-evidence/`;
2. runs `npm run test:ci`;
3. uploads `quality-evidence/junit.xml` as the `test-evidence` artifact even when a later workflow step fails.

The artifact retention period is seven days. Missing evidence produces a warning rather than masking the actual test command result.

## Verified command evidence

GitHub Actions Quality Gate run `30289348321` (run number 78) completed successfully for implementation commit `b57f13e4621334f9fc02fde35012b387d202ff67`.

The successful job included:

```text
Install dependencies from lockfile: success
Verify lockfile remains unchanged: success
Lint: success
Type-check: success
Test with JUnit evidence: success
Upload test evidence: success
Build: success
Upload production build artifact: success
```

The `test-evidence` artifact was created with:

```text
Artifact ID: 8662139974
Artifact digest: sha256:c6fec0b8b08bf23656d96339de9f7902cde4707f8366faf6bddb9cc666a771fc
Expired: false
```

The downloaded JUnit XML was inspected and recorded:

```text
Test suites: 1
Tests: 3
Failures: 0
Errors: 0
Skipped: 0
Suite: src/App.test.tsx
```

The three recorded test cases cover repository/production status messaging, the accessible labelled status region, and semantic pairing of status terms with their values.

## Safety impact

- No application runtime code changed.
- No dependency or lockfile content changed.
- No secrets, credentials, or private data were added.
- No data was deleted.
- No production infrastructure or deployment behaviour changed.
- No merge or auto-merge was enabled.

## Limitations and blockers

- The repository still has only one test file and three tests.
- JUnit evidence records test execution, not source-code coverage.
- No coverage provider is currently declared in `devDependencies`.
- No coverage baseline or threshold is enforced.
- Authentication, authorization, APIs, persistence, audit logging, deployment verification, and production security assessment remain outside the verified scaffold baseline.
- Production readiness is not established.

## Next task

Add the Vitest coverage provider through a reviewed dependency and lockfile update, generate deterministic text/JSON coverage evidence, measure the actual baseline, and introduce only a conservative threshold supported by that measured result. Preserve immutable installation, lockfile drift detection, lint, strict type-checking, JUnit evidence, tests, build, and artifact publication.
