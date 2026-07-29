# Canonical Public Environment Contract

**Date:** 2026-07-28  
**Delivered branch:** `quality/ci-gate`  
**Working child branch:** `quality/public-env-contract`  
**Task:** Remove duplicated browser-visible configuration allow-lists  
**Production impact:** None

## Objective

Replace the duplicated `VITE_*` allow-lists in the runtime validator and CI policy scanner with one machine-readable contract, then prove that malformed or drifting contracts fail closed.

## Repository inspection

Before this change:

- `src/config/runtimeConfig.ts` contained a local six-key `ALLOWED_PUBLIC_KEYS` set;
- `scripts/check-public-env-policy.mjs` independently contained the same six-key `APPROVED_PUBLIC_KEYS` array;
- the two controls could drift while each continued to pass its own tests;
- `.env.example` completeness was already enforced by the CI scanner;
- strict TypeScript, ESLint, Vitest, immutable dependency installation, lockfile drift detection, dependency audit, build evidence, and CodeQL were already active;
- no canonical public-environment contract existed in the repository.

## Exact changes

### `config/public-env-contract.json`

Added the single canonical contract:

- `schemaVersion: 1`;
- one sorted, unique list of the six approved browser-visible keys.

### `src/config/runtimeConfig.ts`

- removed the locally duplicated key list;
- imported `config/public-env-contract.json` through the existing `resolveJsonModule` TypeScript control;
- constructed the runtime allow-list from the canonical contract;
- preserved every existing environment, URL, semantic-version, Azure AD, secret-like-key, and fail-closed validation rule.

### `scripts/check-public-env-policy.mjs`

- removed the independently duplicated allow-list;
- loaded the same canonical JSON contract;
- added dependency-free contract validation for:
  - object shape;
  - supported schema version;
  - non-empty canonical `VITE_*` names;
  - uniqueness;
  - deterministic sorting;
- included the contract path and schema version in generated JSON evidence;
- included the contract file in tracked policy-file inspection.

### `scripts/check-public-env-policy.test.mjs`

Added deterministic regression coverage proving:

- the loaded key list matches the canonical contract and is frozen;
- malformed object shape fails;
- unsupported schema version fails;
- duplicate keys fail;
- unsorted keys fail;
- normal policy scanning records the canonical contract path and schema version.

## Commits

- canonical JSON contract: `f4edf7892823ee7e68c76d232f967fa0b8e853ec`;
- runtime validator consumption: `a3b613cb7f64c377b3b7990f83da7d749b7ea142`;
- CI scanner consumption: `73f180cde5827f84601db2a8665b92250a212896`;
- contract regression tests: `1e9454b17652618940711baeae177d4f14b4ccf2`.

## Command and workflow evidence

For implementation commit `1e9454b17652618940711baeae177d4f14b4ccf2`:

- Quality Gate run `30337040371` (#202): **success**;
- CodeQL run `30337040323` (#96): **success**.

The Quality Gate completed:

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

It also uploaded public-environment policy evidence, type-check evidence, JUnit evidence, the production build artifact, and dependency-audit evidence.

CodeQL completed JavaScript and TypeScript analysis successfully.

No local shell PASS is claimed; executable evidence comes from GitHub Actions.

## Safety impact

- no production environment value was added or changed;
- no secret, token, credential, client secret, or connection string was added;
- no dependency or lockfile changed;
- no authentication flow or Azure registration changed;
- no API integration, persistence, analytics, AI service, deployment, or infrastructure changed;
- no data was deleted;
- no merge to `main` was performed;
- PR #2 remains draft and unmerged.

## Blockers and limitations

1. The contract defines approved key names, not production values.
2. Runtime bootstrap still does not consume real environment values because deployment contracts remain unapproved.
3. Schema version 1 is intentionally small and does not describe per-key value types; those checks remain in the strict runtime validator.
4. A future contract change still requires code review because adding a browser-visible key expands the public attack surface.
5. Production identity, API, storage, retention, and observability requirements remain unresolved.

## Next task

Add a deterministic production bundle-size budget gate using the existing build output. Record JavaScript, CSS, and total static-asset sizes in CI evidence and fail only on a conservative repository-derived ceiling. Do not introduce a third-party dependency or change deployment behaviour.

## Status

DUPLICATED PUBLIC CONFIGURATION ALLOW-LISTS REMOVED  
CANONICAL CONTRACT, STRICT TESTS, QUALITY GATE, AND CODEQL VERIFIED  
PRODUCTION CONFIGURATION AND DEPLOYMENT REMAIN BLOCKED
