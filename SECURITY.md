# Security Policy

## Current security posture

This repository is not production-ready. It is currently being converted from documentation scaffolding into an executable admin portal. Until the security acceptance gates below pass, no production credentials, canonical datasets, Dataset B records, or privileged API endpoints may be connected to this repository.

## Reporting a vulnerability

Do not open a public issue containing credentials, tokens, personal data, exploitable endpoint details, or screenshots of sensitive configuration. Report the issue privately to the repository owner and include:

- affected file, component, endpoint, or dependency;
- reproduction steps;
- impact assessment;
- evidence with secrets redacted;
- recommended mitigation when known.

## Secret-handling rules

- Never commit passwords, client secrets, connection strings, access tokens, storage keys, certificates, private keys, or production `.env` files.
- `VITE_*` variables are embedded into browser-delivered JavaScript and must be treated as public configuration.
- Database credentials and confidential API keys must remain server-side.
- Use Microsoft Entra ID, workload identity, managed identity, GitHub OIDC, or an approved secret store instead of long-lived static credentials.
- Any suspected exposed credential must be revoked and rotated; deleting it from the latest commit is insufficient because Git history may retain it.

## Data-boundary rules

- Dataset B must never be exposed to anonymous or public clients.
- The browser must not connect directly to SQL Server.
- Canonical promotion and publication must be performed through approved server-side workflows with evidence, rights, safety, role, and concurrency checks.
- Client-supplied user identifiers must not be trusted for audit attribution.
- AI-generated text must not be treated as evidence or canonical content.

## Repository controls

- MFA is required for maintainers.
- Branch protection is required on `main`.
- All production-impacting changes require review.
- Dependency scanning, secret scanning, and code scanning must be enabled.

## Required production security gates

Production deployment is blocked until all of the following are evidenced:

1. Entra ID application registration and least-privilege scopes are documented.
2. MSAL initialization, redirect handling, token acquisition, expiry handling, and logout are tested.
3. Role enforcement is validated in both the UI and API.
4. Dataset B access is denied to public and anonymous roles.
5. Environment variables are validated at startup and contain no secrets in browser variables.
6. Dependency audit, secret scanning, code scanning, lint, type-check, tests, and build pass in CI.
7. Content Security Policy and secure HTTP headers are configured for the deployment target.
8. Rich text and rendered source material are sanitized against XSS.
9. File uploads enforce MIME type, extension, size, malware scanning, and storage isolation.
10. Audit logs exclude tokens and sensitive content while retaining correlation and actor identity.
11. Backup and restore procedures are tested for server-side data services.
12. A security review records no unresolved critical or high-severity finding.

## Supported versions

No production version is currently supported. This section must be updated when the first verified release is approved.
