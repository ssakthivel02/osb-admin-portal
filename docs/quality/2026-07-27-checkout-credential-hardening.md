# Checkout Credential Hardening

Date: 2026-07-27

Branch: `quality/ci-gate`

Base branch: `audit/repository-baseline`

Implementation commit: `b74704f51bef0dae32017b4acacd1f8d31f80ffb`

## Objective

Reduce unnecessary credential exposure inside the GitHub Actions workspace by preventing `actions/checkout` from persisting the workflow token in the local Git configuration.

## Repository evidence inspected

Before this task:

- the Quality Gate granted only `contents: read`;
- GitHub Actions were pinned to immutable commit SHAs;
- the workflow used `actions/checkout` without an explicit `persist-credentials` setting;
- the preceding workflow logs showed the checkout action using its default credential-persistence behaviour;
- Quality Gate run `30300132366` had completed successfully for the preceding branch head.

The quality job performs only read, install, validation, evidence-upload, and build operations. It does not require authenticated Git pushes or other repository writes after checkout.

## Change completed

Updated `.github/workflows/quality-gate.yml` so the checkout step now contains:

```yaml
with:
  persist-credentials: false
```

This prevents the checkout action from retaining the GitHub token in repository-local Git configuration after checkout.

No application code, dependency, lockfile, production infrastructure, deployment configuration, data, or secret value was changed.

## Expected validation

The complete Quality Gate must pass with persisted checkout credentials disabled:

```text
checkout
runtime setup and version evidence
npm ci
lockfile drift check
lint
type-check and evidence upload
JUnit tests and evidence upload
build and artifact upload
high-severity npm audit and evidence upload
```

A completed successful workflow run is required before this implementation is described as CI-validated.

## Security impact

- reduces the period and locations in which the workflow token is available;
- limits the effect of a later step unintentionally invoking authenticated Git commands;
- preserves the existing read-only workflow permission;
- does not prove that third-party packages, build scripts, or source code are free from malicious behaviour.

## Blockers and limitations

- secret scanning and code scanning are not yet evidenced;
- source-code coverage reporting and thresholds remain absent;
- the repository remains a small scaffold and is not production-ready;
- authentication, authorisation, API integration, persistence, deployment validation, and production security acceptance remain incomplete.

## Next task

Add deterministic source-code coverage using a Vitest-compatible coverage provider through a reviewed `package.json` and `package-lock.json` update. Publish coverage evidence, measure the actual baseline, and introduce a threshold only after the baseline is verified.
