# Immutable npm Installation Evidence

Date: 2026-07-27

Branch: `quality/ci-gate`

Base branch: `audit/repository-baseline`

Implementation commit: `94c8b5ae211529feca15187581c72870f71edfe3`

## Objective

Complete the verified reproducible-install remediation task after `package-lock.json` was committed to the quality branch.

## Repository evidence inspected

- Pull request #2 remains open, draft, unmerged, and targets `audit/repository-baseline` from `quality/ci-gate`.
- `package-lock.json` exists at repository root on `quality/ci-gate`.
- The committed lockfile reports `lockfileVersion: 3` and root dependency versions matching `package.json`.
- Before this change, `.github/workflows/quality-gate.yml` still used `npm install --no-audit --no-fund`, verified a generated lockfile, and uploaded `package-lock-candidate`.

## Change completed

Updated `.github/workflows/quality-gate.yml` to:

- replace `npm install --no-audit --no-fund` with `npm ci --no-audit --no-fund`;
- enable the npm cache in `actions/setup-node`, which now keys dependency caching from the committed lockfile;
- remove temporary generated-lockfile verification;
- remove temporary `package-lock-candidate` artifact publication;
- retain immutable action commit pinning;
- retain read-only workflow permissions;
- retain lint, strict TypeScript type-check, unit tests, build, diagnostic evidence upload, and build artifact upload.

No application runtime code, dependency versions, secrets, production data, deployment configuration, authentication, APIs, or infrastructure were changed.

## GitHub Actions evidence

Quality Gate run:

```text
Run ID: 30280915970
Run number: 64
Implementation commit: 94c8b5ae211529feca15187581c72870f71edfe3
Conclusion: success
```

The following steps completed successfully:

```text
Checkout repository
Set up Node.js
Install dependencies from lockfile
Lint
Type-check
Upload type-check evidence
Test
Build
Upload production build artifact
```

This establishes that the committed lockfile supported immutable dependency installation and the complete configured scaffold quality sequence in GitHub Actions at the implementation commit.

## Local preview note

The downloaded `osb-admin-portal-dist` artifact is disposable build output. The reported Windows command error occurred because the Python launcher command `py` is not installed or is not available in `PATH`; it is not a repository or build failure.

A Node.js-based local preview can be used instead:

```powershell
cd C:\Users\SAKTHIVEL\Downloads\osb-admin-portal-dist
npx --yes serve -s . -l 4173
```

Then browse to `http://localhost:4173`. The extracted `dist` artifact must not be committed to the repository.

## Blockers and limitations

- This evidence covers the current small React/Vite scaffold only.
- One test file and one passing test do not establish adequate functional coverage.
- No authentication, authorization, API integration, audit logging, persistence, deployment verification, or production security assessment has been completed.
- Production readiness is not established.
- The Siddhar devotional register supplied separately has not been added to this repository because its intended schema, product scope, licensing, and source-verification workflow are not established in the current admin-portal remediation baseline.

## Next task

Add deterministic test coverage reporting to the existing Vitest gate, with a conservative initial threshold based on measured repository coverage rather than an invented target. Record the baseline, exclusions, commands, CI evidence, blockers, and follow-on threshold plan in a separate progress document.
