# Deployment and Go-Live Plan

## Current disposition

**GO-LIVE BLOCKED**

The repository does not yet contain a verified executable portal. Production deployment must not be enabled from documentation-only scaffolding.

## Stage 0 — Baseline approval

- Review the draft repository-baseline pull request.
- Confirm `osb-admin-portal` is the authoritative portal repository.
- Keep architecture PDFs and generated conversations under documentation/reference paths only.
- Do not treat snippets in those documents as deployed source code.

Exit evidence:

- approved actual-state report;
- approved remediation backlog;
- no unresolved repository-ownership ambiguity.

## Stage 1 — Executable foundation

Create a review branch containing:

- React 19 + TypeScript + Vite application;
- strict TypeScript configuration;
- ESLint flat configuration;
- Vitest and React Testing Library;
- validated environment schema;
- error boundary and accessible loading/error pages;
- package lockfile;
- basic health/version screen.

Required commands:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Every command must exit successfully.

## Stage 2 — Authentication and authorisation

Implement:

- asynchronous MSAL initialisation;
- Entra login/logout;
- silent access-token acquisition;
- typed role parsing;
- Administrator, Editor, Reviewer, Publisher and Auditor routes;
- unauthorised and forbidden handling;
- server-side enforcement in the API tier.

Exit evidence:

- unit tests for role parsing and route access;
- test-account login smoke test;
- no token or sensitive-claim logging.

## Stage 3 — First vertical slice

Implement one complete editorial workflow before adding more dashboards:

1. Read an assigned Dataset B review item through the secured API.
2. Display source and provenance metadata.
3. Capture corrected/diplomatic text without overwriting raw evidence.
4. Submit a review decision.
5. Invoke an approved server-side workflow.
6. Display immutable audit outcome.

The browser must not directly promote or update canonical Dataset A tables.

## Stage 4 — Preview environment

Deploy a preview only after CI passes.

Preview requirements:

- separate Entra registration or redirect URI;
- separate API configuration;
- non-production test database;
- environment-specific CORS;
- no real credentials in source or workflow files;
- smoke tests for login, forbidden access and the first vertical slice.

## Stage 5 — Production readiness review

Required sign-offs:

- application security;
- database security;
- editorial governance;
- accessibility;
- operational support;
- backup and restoration;
- privacy and retention;
- release owner approval.

Required evidence:

- CI results;
- dependency audit;
- DAB configuration validation;
- database migration validation;
- penetration/security review;
- performance smoke test;
- backup restore test;
- monitoring and alert test;
- release and rollback runbook.

## Stage 6 — Controlled go-live

1. Tag the approved release.
2. Deploy the exact CI artifact.
3. Run production health check.
4. Run authenticated role smoke tests.
5. Verify API/database telemetry.
6. Confirm Dataset B remains non-public.
7. Confirm publication requires the approved workflow.
8. Record deployment identifiers and timestamp.
9. Begin heightened monitoring.

## Rollback triggers

Rollback immediately for:

- authentication failure;
- incorrect role access;
- exposure of Dataset B or internal notes;
- canonical write bypass;
- elevated error rate;
- missing audit records;
- migration inconsistency;
- security or privacy incident.

## Manual prerequisites

The following require owner/administrator access and cannot be safely inferred:

- Entra tenant, application registration and role assignments;
- Azure subscription/resource group;
- production SQL/DAB endpoint;
- Key Vault or deployment secrets;
- approved custom domain;
- GitHub environment protection and branch rules;
- production editorial approvers.

## Next approved engineering task

Build the executable foundation and first vertical slice on a review branch. Do not switch on production deployment until command evidence and sign-offs satisfy this plan.
