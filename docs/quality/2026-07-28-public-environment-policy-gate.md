# Public Environment Policy Gate

**Date:** 2026-07-28  
**Delivered branch:** `quality/ci-gate`  
**Prepared through child branch:** `quality/public-env-policy`  
**Task:** CI-only allow-list and secret-like-name guard for browser-visible environment configuration  
**Production impact:** None

## Objective

Implement the next verified remediation backlog item after runtime-configuration validation: scan committed public configuration examples and application-facing source references for unapproved or secret-like `VITE_*` names, fail closed in CI, and retain deterministic evidence.

## Repository inspection

Before implementation:

- `src/config/runtimeConfig.ts` already defined six approved browser-visible keys and rejected unknown or secret-like runtime keys;
- `.env.example` contained the same six intended public keys and no credentials;
- the quality workflow did not check committed source references or example-file drift against that policy;
- `package.json` had no dedicated public-environment policy command;
- no existing policy scanner or evidence artifact was present;
- the existing workflow already used immutable installation, lockfile drift checking, lint, strict TypeScript, Vitest, build, dependency audit, and pinned upload actions.

## Exact changes

### `scripts/check-public-env-policy.mjs`

Added a dependency-free Node.js policy scanner that:

- declares a closed six-key public allow-list;
- reads tracked files using `git ls-files` rather than scanning ignored or generated files;
- inspects `.env.example`, application source, public assets, Vite configuration, the HTML entry point, and GitHub workflow files;
- excludes synthetic `*.test.*` and `*.spec.*` fixtures from repository scanning while leaving the scanner itself unit-testable;
- rejects browser-visible key names containing secret, password, private-key, connection-string, storage-key, access-key, API-key, or token terminology;
- rejects unapproved `VITE_*` references;
- requires `.env.example` to exist;
- requires every approved key to be represented in `.env.example`;
- rejects unapproved assignments in `.env.example`;
- writes deterministic JSON evidence to `quality-evidence/public-env-policy.json`;
- exits non-zero on policy violations.

### `scripts/check-public-env-policy.test.mjs`

Added synthetic Vitest coverage for:

1. acceptance of the approved key surface;
2. rejection of secret-like and unknown keys;
3. rejection of an incomplete committed example;
4. fail-closed behaviour when `.env.example` is absent.

### `package.json`

Added:

```json
"check:public-env": "node scripts/check-public-env-policy.mjs"
```

No dependency or lockfile change was required.

### `eslint.config.js`

Added explicit read-only Node globals for scripts without weakening the existing JavaScript or strict TypeScript rules.

### `.github/workflows/quality-gate.yml`

Added:

- `Validate public environment policy` after immutable installation and lockfile verification;
- unconditional upload of `public-env-policy-evidence` using the existing commit-pinned upload action;
- seven-day evidence retention;
- fail-closed handling when the evidence file is absent.

## Commits

- scanner: `55420b1ce2c02246f288267b65482f4b236e2b76`
- synthetic tests: `384c885b80ae088344c1ceac6cc66841b45302f3`
- package command: `26af5564284867536a0ca7b2f41e9268e7174278`
- Node lint context: `9c591225c6ca6b5e7bc28807c11240e06fc2ac20`
- workflow gate: `283ce6634cbd17333cfd69891a54bb1726f95637`
- evidence-driven scanner correction: `87dd4e040521d28cf8efa7cce0e627e40b8aaeb0`

## Evidence-driven correction

The first Quality Gate execution, run `30333770873` (#191), failed at the new policy step as designed. Its evidence artifact identified two categories of false positives:

- deliberately invalid names inside synthetic runtime-validator tests;
- the documented wildcard label `VITE_AZURE_AD_*`, which is not a concrete environment key.

The scanner was corrected to:

- exclude test/spec fixtures from repository-wide source scanning;
- ignore wildcard policy labels ending in `*`;
- continue testing invalid examples directly through the exported pure inspection function.

The strict policy was not weakened for application source or `.env.example`.

Failed-run evidence artifact:

- artifact ID: `8678339781`;
- digest: `sha256:ddce8e998f7a996a78720365c92ce375d9062d3bb8be4c7b4501bba1c261310c`.

## Verified command and workflow evidence

For corrected implementation commit `87dd4e040521d28cf8efa7cce0e627e40b8aaeb0`:

- Quality Gate run `30333872964` (#193): **success**;
- CodeQL run `30333872998` (#87): **success**.

The successful Quality Gate completed:

```bash
npm ci --no-audit --no-fund
git diff --exit-code -- package-lock.json
npm run check:public-env
npm run lint
npm run typecheck
npm run test:ci
npm run build
npm audit --audit-level=high
```

It also uploaded:

- public-environment policy evidence;
- type-check evidence;
- JUnit test evidence;
- production build artifact;
- dependency-audit evidence.

Successful public-policy evidence artifact:

- artifact ID: `8678375643`;
- digest: `sha256:451fa30231b9a0f930dde998ae3f80facf5abd3343342f54f009fa6741449ccb`.

CodeQL completed JavaScript and TypeScript analysis successfully.

No local PASS result is claimed. Executable evidence comes from GitHub Actions.

## Safety impact

- no data was deleted;
- no secret or credential was added or exposed;
- no dependency or lockfile was changed;
- no runtime configuration was activated in the application bootstrap;
- no authentication, API, persistence, scoring, analytics, AI, or editorial workflow changed;
- no deployment or production infrastructure changed;
- no unverified Siddhar content was promoted;
- nothing was merged to `main`;
- PR #2 remains draft and unmerged.

## Blockers and limitations

1. The allow-list is currently duplicated between the runtime validator and CI scanner; drift is detected indirectly through source scanning, not through one shared generated contract.
2. The policy validates key names and example completeness, not whether deployment-platform values are correct.
3. The scanner does not inspect untracked files, ignored local files, repository secrets, or external deployment settings.
4. It does not perform entropy-based secret scanning; that requires a separate purpose-built security control.
5. Runtime validation remains intentionally disconnected from application bootstrap until real environment contracts are approved.
6. Browser-based accessibility, real authentication, APIs, persistence, and production-readiness assessment remain incomplete.

## Next task

Create a single machine-readable public-configuration contract consumed by both the runtime validator and CI policy scanner, with a deterministic drift test. Preserve the existing six-key surface, require no new dependency, and do not connect real environment values or authentication during that refactor.

## Status

PUBLIC ENVIRONMENT POLICY GATE COMPLETE  
QUALITY GATE AND CODEQL VERIFIED  
PRODUCTION CONFIGURATION AND DEPLOYMENT REMAIN BLOCKED
