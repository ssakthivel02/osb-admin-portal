## Purpose

Describe the single, reviewable change in this pull request.

## Repository truth

- [ ] The change is based on `audit/repository-baseline` or an approved child branch.
- [ ] The description distinguishes implemented behaviour from planned or blocked work.
- [ ] No production-readiness claim is made without executable evidence.
- [ ] No Dataset B or unverified devotional content is promoted for publication.

## Safety boundaries

- [ ] No secrets, credentials, tokens, private keys, certificates, or sensitive environment values are included.
- [ ] No production infrastructure, DNS, deployment target, or live data is changed.
- [ ] No destructive migration, data deletion, or force update is included.
- [ ] The pull request remains small enough to review and revert safely.

## Quality evidence

Record the exact commands and results. Mark unavailable commands explicitly rather than implying success.

```text
npm ci:
npm run lint:
npm run typecheck:
npm run test:
npm run build:
```

- [ ] CI result or local command evidence is linked or recorded.
- [ ] New or changed behaviour has an appropriate test, or the reason for no test is documented.
- [ ] Dependency and workflow changes are pinned or reproducible where applicable.

## Documentation and follow-up

- [ ] `PROGRESS.md` or a dated file under `docs/quality/` records exactly what changed.
- [ ] Known blockers and limitations are listed.
- [ ] The next safe remediation task is identified.
- [ ] No merge to `main` is requested as part of this quality-baseline work.
