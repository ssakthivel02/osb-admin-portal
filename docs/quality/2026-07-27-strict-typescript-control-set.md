# Strict TypeScript Control Set

Date: 2026-07-27

Branch: `quality/ci-gate`

Base branch: `audit/repository-baseline`

Implementation commits:

- `92333b76fea4b0819aa8d02cc3fe99faf43aa275` — harden application TypeScript checks
- `9271692eda073a29f449845473ada0e793e7364a` — harden tooling TypeScript checks

## Objective

Strengthen compile-time defect prevention consistently across the browser application and TypeScript-based repository tooling without changing runtime behaviour, dependencies, production infrastructure, or data.

## Repository evidence inspected

Before this task:

- `tsconfig.app.json` already enabled `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, unused-symbol checks, and full library checking.
- `tsconfig.node.json` enabled only a subset of those additional controls.
- neither configuration explicitly enabled `noImplicitReturns`, `noPropertyAccessFromIndexSignature`, or `forceConsistentCasingInFileNames`.
- the previous branch head `474a32866168390b953478161ccdfdc9881ae0a7` passed Quality Gate run `30309073128` and CodeQL run `30309073124`.

Repository search did not identify a prior remediation task implementing this same control set.

## Changes completed

### `tsconfig.app.json`

Added:

```json
"noImplicitReturns": true,
"noPropertyAccessFromIndexSignature": true,
"forceConsistentCasingInFileNames": true
```

### `tsconfig.node.json`

Added the same controls and reconciled the tooling configuration with the established application checks:

```json
"noImplicitOverride": true,
"noImplicitReturns": true,
"noFallthroughCasesInSwitch": true,
"noPropertyAccessFromIndexSignature": true,
"noUnusedLocals": true,
"noUnusedParameters": true,
"forceConsistentCasingInFileNames": true
```

The existing `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noEmit`, and `skipLibCheck: false` settings were preserved.

## Quality rationale

- `noImplicitReturns` prevents functions with declared execution paths from silently omitting a return value.
- `noPropertyAccessFromIndexSignature` makes dictionary-style access explicit and reduces accidental assumptions about dynamically named properties.
- `forceConsistentCasingInFileNames` detects import-path casing drift that can pass on a case-insensitive workstation and fail on Linux CI.
- aligning the application and tooling configurations reduces future configuration drift.

## Command and CI evidence

No local repository checkout was available for this task. Validation was performed by the repository's executable GitHub Actions workflows.

For implementation head `9271692eda073a29f449845473ada0e793e7364a`:

- Quality Gate run `30309195721` (run number 118) completed successfully.
- CodeQL run `30309195755` (run number 12) completed successfully.

The successful Quality Gate executed:

```text
node --version
npm --version
npm ci --no-audit --no-fund
git diff --exit-code -- package-lock.json
npm run lint
npm run typecheck
npm run test:ci
npm run build
npm audit --audit-level=high --json
```

The Type-check step completed successfully with the strengthened compiler options. Lint, tests, build, dependency audit, and evidence uploads also passed.

## Safety impact

- no application runtime code changed;
- no dependency or lockfile content changed;
- no secrets, credentials, user data, or canonical content changed;
- no deployment or production infrastructure changed;
- no branch was merged and no auto-merge was enabled;
- PR #2 remains a draft from `quality/ci-gate` to `audit/repository-baseline`.

## Blockers and limitations

- the repository remains a small executable scaffold and is not production-ready;
- source-code coverage is not measured or enforced;
- authentication, authorisation, API integration, persistence, audit logging, deployment verification, and production security acceptance remain incomplete;
- successful TypeScript compilation cannot prove runtime correctness or security;
- CodeQL workflow success confirms analysis execution, not the absence of unresolved alerts.

## Next task

Add the Vitest coverage provider through a reviewed `package.json` and `package-lock.json` update, publish deterministic coverage evidence, measure the actual baseline, and introduce only a conservative threshold supported by that baseline.
