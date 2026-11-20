# Quality Gate Runner Image Pin

Date: 2026-07-27

Branch: `quality/ci-gate`

Base branch: `audit/repository-baseline`

Implementation commit: `bd8c95332859bf253d465fc331881b2c2295e36c`

## Objective

Remove an avoidable source of CI drift by replacing the moving `ubuntu-latest` runner label with the explicit `ubuntu-24.04` image used by the most recently inspected successful GitHub Actions run.

## Repository evidence inspected

Before this task:

- pull request #2 was open, draft, unmerged, and targeted `audit/repository-baseline` from `quality/ci-gate`;
- the Quality Gate used `runs-on: ubuntu-latest`;
- the latest inspected successful workflow logs reported Ubuntu 24.04.4 LTS and runner image `ubuntu-24.04`;
- the workflow already used read-only permissions, disabled persisted checkout credentials, pinned action SHAs, `.nvmrc`, immutable `npm ci`, lockfile drift detection, lint, strict type-check, JUnit evidence, build evidence, and a high-severity npm audit gate.

Using `ubuntu-latest` allows GitHub to move the job to a different operating-system image in the future without a repository change. That weakens reproducibility and can introduce toolchain or package behaviour changes unexpectedly.

## Exact change

Updated `.github/workflows/quality-gate.yml`:

```yaml
runs-on: ubuntu-24.04
```

replacing:

```yaml
runs-on: ubuntu-latest
```

No other workflow step was changed.

## Safety impact

- no application source code changed;
- no dependency or lockfile changed;
- no secret, credential, data, production infrastructure, or deployment configuration changed;
- no destructive operation was performed;
- no merge or auto-merge was enabled;
- the change remains on `quality/ci-gate` and targets `audit/repository-baseline`.

## Command and CI evidence

No local command execution was available for this task. Evidence was taken directly from repository files, pull-request metadata, and GitHub Actions logs.

The runner-image commit and this progress record require their own completed Quality Gate result before they are described as CI-validated.

## Blockers and limitations

- pinning `ubuntu-24.04` improves reproducibility but does not freeze the exact hosted-runner image revision;
- GitHub may update packages within the Ubuntu 24.04 runner image;
- source-code coverage reporting is still absent;
- secret scanning and code scanning are not yet evidenced in this repository;
- authentication, authorization, API integration, persistence, deployment validation, and production security acceptance remain incomplete;
- production readiness is not established.

## Next task

Add deterministic Vitest source-code coverage through a reviewed `package.json` and `package-lock.json` change, publish coverage evidence, measure the actual baseline, and introduce only a conservative evidence-based threshold after the measured result is reviewed.
