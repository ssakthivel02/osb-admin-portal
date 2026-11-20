# CI Quality Run 16 — ESLint typed-rule scope correction

## Scope

Inspected GitHub Actions Quality Gate run `30238747891` for pull request #2 on branch `quality/ci-gate` and corrected one isolated ESLint configuration defect.

## Evidence inspected

- Workflow: `Quality Gate`
- Run ID: `30238747891`
- Job ID: `89891490835`
- Result: `failure`
- Checkout: passed
- Node setup: passed
- Dependency installation: passed
- Lint: failed
- Type-check: skipped
- Tests: skipped
- Build: skipped
- Artifact upload: skipped

The previous explicit Vitest imports were present in `src/App.test.tsx`, but lint still failed. The next inspection therefore focused on the shared ESLint configuration rather than changing application code again.

## Configuration defect

`eslint.config.js` applied `typescript-eslint`'s `recommendedTypeChecked` configuration globally, while `parserOptions.projectService` was added only for `*.ts` and `*.tsx` files.

That arrangement allowed type-aware TypeScript rules to be evaluated for JavaScript configuration files such as `eslint.config.js`, even though those files were outside the typed TypeScript project service. Typed rules must be restricted to files for which type information is configured.

## Change made

Reworked the flat ESLint configuration so that:

- `@eslint/js` recommended rules apply only to `*.js`, `*.mjs`, and `*.cjs` files;
- `typescript-eslint` recommended type-checked rules apply only to `*.ts` and `*.tsx` files;
- TypeScript project-service configuration remains scoped to TypeScript files;
- existing strict rules prohibiting explicit `any`, floating promises, and misused promises remain enabled.

Implementation commit:

- `15c719f6bf9a48009d326313c06f314841c1de63`

No dependencies, application behavior, infrastructure, secrets, database configuration, or production settings were changed.

## Command evidence

GitHub Actions run `30238747891` executed:

```text
npm install --no-audit --no-fund
npm run lint
```

Observed result before this correction:

- dependency installation: passed;
- lint: failed;
- every later gate was skipped.

Local execution was attempted, but the current execution environment could not resolve `github.com`; therefore no local PASS result is claimed. The branch update must be validated by a new GitHub Actions run.

## Current blockers

1. The post-correction workflow run has not yet been inspected.
2. No committed `package-lock.json` exists.
3. Type-check, tests, build, and artifact generation remain unverified.
4. Authentication, API integration, editorial workflows, and deployment remain intentionally blocked.

## Next task

Inspect the workflow run triggered by commit `15c719f6bf9a48009d326313c06f314841c1de63`. Fix only the first evidenced failing gate. Generate and commit `package-lock.json` only after a clean install baseline is available, then change CI from `npm install` to `npm ci`.

## Status

ESLINT TYPED-RULE SCOPE CORRECTION COMMITTED

REVALIDATION PENDING — PRODUCTION READINESS REMAINS BLOCKED
