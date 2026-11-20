# Lockfile Drift Guard

Date: 2026-07-27

Branch: `quality/ci-gate`

Base branch: `audit/repository-baseline`

Implementation commit: `4b636530885a2d81e96e71eb5a7c2e561e5c6b0c`

## Objective

Strengthen the reproducible npm installation gate by proving that `npm ci` does not rewrite the committed `package-lock.json`.

## Repository evidence inspected

- Pull request #2 is open, draft, unmerged, and targets `audit/repository-baseline` from `quality/ci-gate`.
- A committed `package-lock.json` is present and uses lockfile version 3.
- The quality workflow already uses Node.js `22.13.0`, npm caching, and `npm ci --no-audit --no-fund`.
- The workflow already enforces lint, strict TypeScript type-check, tests, build, and artifact publication.
- No lockfile drift check existed after dependency installation.

## Change completed

Updated `.github/workflows/quality-gate.yml` to run:

```bash
git diff --exit-code -- package-lock.json
```

immediately after `npm ci`.

This fails the job when the committed lockfile is not stable under the pinned CI toolchain. It does not modify dependencies, source code, production infrastructure, secrets, data, deployment settings, or branch targets.

## Evidence available

The workflow change was committed successfully. At the first check immediately after the commit, GitHub had not yet associated a workflow run with the implementation SHA.

No passing result is claimed for the implementation commit until its Quality Gate run completes successfully.

## Blockers and limitations

- The current test suite remains minimal.
- No coverage baseline or threshold is enforced.
- This guard proves lockfile stability only under the configured Ubuntu runner, Node.js `22.13.0`, and the npm version supplied with that runtime.
- Production readiness remains blocked by missing application capabilities and production security validation.

## Next task

After this guard is CI-validated, add deterministic Vitest coverage reporting. Measure the actual baseline first, then introduce only a conservative threshold supported by evidence. Preserve immutable installation, lockfile drift detection, lint, strict type-check, tests, build, and artifact evidence.
