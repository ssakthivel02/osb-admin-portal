# Node.js Runtime Single Source of Truth

Date: 2026-07-27

Branch: `quality/ci-gate`

Base branch: `audit/repository-baseline`

Implementation commits:

- `fb122019e537135780f76936df412312f0f3778a` — add `.nvmrc`
- `d252db13f1bf2dcd5a6cc31dcc036e0909572190` — make GitHub Actions read `.nvmrc`
- `1317da7b1679646185d360a4a3609a4cf765daa1` — reconcile contributor instructions

## Objective

Remove duplicated Node.js version declarations from local setup guidance and GitHub Actions by establishing `.nvmrc` as the single exact runtime-version source for CI-equivalent validation.

## Repository evidence inspected

Before this task:

- `package.json` required Node.js `>=22.13.0`.
- the Quality Gate independently hard-coded Node.js `22.13.0`.
- `CONTRIBUTING.md` independently repeated the CI runtime version.
- neither `.nvmrc` nor `.node-version` existed on `quality/ci-gate`.
- Quality Gate run `30294957625` (run number 84) had completed successfully for the previous branch head.

Maintaining the exact runtime version in multiple places created a drift risk during future runtime upgrades.

## Change completed

1. Added `.nvmrc` containing:

```text
22.13.0
```

2. Updated `.github/workflows/quality-gate.yml` to use:

```yaml
node-version-file: '.nvmrc'
```

instead of an independently hard-coded `node-version` value.

3. Added a workflow step that records `node --version` and `npm --version` in the job log.

4. Updated `CONTRIBUTING.md` to:

- identify `.nvmrc` as the exact CI-equivalent runtime source;
- document `nvm install` and `nvm use`;
- require runtime-version changes to be reviewed together with workflow and engine-floor changes;
- preserve immutable dependency installation, lint, strict type-check, JUnit tests, build, and artifact guidance.

## Safety impact

- no production deployment or infrastructure was changed;
- no secrets, credentials, data, dependencies, or lockfile content were changed;
- no application runtime behaviour was changed;
- no merge or auto-merge was performed;
- the pull request remains based on `audit/repository-baseline`, not `main`.

## Command and CI evidence

No local command execution was available for this repository task. Evidence was obtained directly from repository files, pull-request metadata, and GitHub Actions metadata.

The immediately preceding branch head passed Quality Gate run `30294957625` (run number 84). The new runtime-pin commits require their own completed Quality Gate result before they are described as CI-validated.

## Blockers and limitations

- deterministic source-code coverage reporting is still absent;
- no coverage baseline or threshold is enforced;
- the repository remains a small scaffold and is not production-ready;
- authentication, API integration, persistence, deployment validation, and production security acceptance remain incomplete.

## Next task

Add the matching Vitest coverage provider through a reviewed `package.json` and `package-lock.json` update, publish deterministic coverage evidence, measure the real baseline, and only then introduce a conservative evidence-based threshold.
