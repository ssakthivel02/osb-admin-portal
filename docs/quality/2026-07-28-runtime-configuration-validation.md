# Runtime Configuration Validation Quality Record

**Date:** 2026-07-28  
**Working branch:** `quality/runtime-config-validation`  
**Parent branch:** `quality/ci-gate`  
**Task:** Typed, fail-closed public runtime configuration validation  
**Production impact:** None

## Objective

Implement the next verified remediation backlog item: a dependency-free validator for browser-visible `VITE_*` configuration. The validator must reject malformed values and secret-like keys without enabling authentication, API access, persistence, deployment, or production infrastructure.

## Repository inspection

Before implementation:

- `.env.example` declared six browser configuration keys;
- its comments warned against client secrets, database credentials, storage keys, and private API keys;
- no runtime configuration parser or validator existed in the current PR file inventory;
- `src/main.tsx` mounted the application without consuming these values;
- strict TypeScript, ESLint, Vitest, immutable npm installation, lockfile drift detection, dependency audit, build evidence, and CodeQL were already configured;
- no dependency was needed for a small closed validation contract.

## Exact changes

### `src/config/runtimeConfig.ts`

Added:

- a closed environment taxonomy: `development`, `test`, `staging`, and `production`;
- typed `RuntimeConfig`, validation issue, and discriminated result contracts;
- an explicit allow-list for all supported public `VITE_*` keys;
- rejection of secret-like browser key names, including secret, password, private-key, connection-string, storage-key, access-key, API-key, and token patterns;
- trimming and type checking for all configured values;
- safe local defaults for environment and application version;
- semantic-version validation;
- HTTPS enforcement for API URLs, with HTTP allowed only for localhost addresses;
- UUID validation for Azure AD client and tenant identifiers;
- `api://<application-id>/<scope-name>` validation for the API scope;
- all-or-none validation for the Azure AD configuration group;
- fail-closed rejection of unknown `VITE_*` keys.

### `src/config/runtimeConfig.test.ts`

Added synthetic tests covering:

1. safe defaults when optional values are absent;
2. a complete valid staging configuration;
3. localhost HTTP exceptions and rejection of non-local HTTP;
4. secret-like and unapproved browser keys;
5. partial and malformed Azure AD settings;
6. invalid environments, versions, and non-string values.

No real tenant, client, endpoint, credential, token, or production identifier is included in the tests.

## Commits

- validator: `e863349a9635ae9ca41dfcf7547bb11cc3356311`
- tests: `5a95d76d7dba8d0a8a6d4e8ba0537c366db6cd60`

## Command evidence

No local install, lint, type-check, test, build, dependency-audit, or CodeQL PASS is claimed. The branch must be delivered through `quality/ci-gate` so the existing GitHub Actions workflows can provide independent evidence.

Expected workflow commands:

```bash
npm ci --no-audit --no-fund
git diff --exit-code -- package-lock.json
npm run lint
npm run typecheck
npm run test:ci
npm run build
npm audit --audit-level=high
```

## Safety impact

- no data deleted;
- no secrets added or exposed;
- no dependency or lockfile changed;
- no application bootstrap behaviour changed;
- no runtime environment values connected to the user interface;
- no authentication, API, persistence, analytics, AI, deployment, or infrastructure change;
- no Siddhar content or publication status changed;
- no merge to `main` performed.

## Blockers

1. The validator is not intentionally wired into application bootstrap because the current environment values are optional placeholders and no approved runtime contract exists.
2. Azure AD registration, API scope, and API endpoint values remain unverified.
3. Validation errors have no approved operator-facing reporting channel.
4. Vite replaces browser configuration at build time; this validator does not protect secrets already committed or injected into a build.
5. Repository secret scanning and deployment-time environment governance remain separate controls.

## Next task

Add a CI-only public-environment policy check that scans committed configuration examples and source references for secret-like `VITE_*` names, then fails closed with deterministic evidence. Do not add credentials, real tenant values, deployment secrets, or production configuration.

## Status

RUNTIME CONFIGURATION VALIDATOR IMPLEMENTED  
CI VALIDATION PENDING  
PRODUCTION CONFIGURATION AND INTEGRATION REMAIN BLOCKED
