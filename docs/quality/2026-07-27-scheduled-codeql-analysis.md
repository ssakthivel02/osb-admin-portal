# Scheduled CodeQL Analysis

Date: 2026-07-27

Branch: `quality/ci-gate`

Base branch: `audit/repository-baseline`

Implementation commit: `474a32866168390b953478161ccdfdc9881ae0a7`

## Objective

Add a recurring CodeQL trigger so static analysis is not limited to pull-request, push, or manual activity.

## Repository evidence inspected

Before this task, `.github/workflows/codeql.yml` already provided:

- pull-request analysis for `audit/repository-baseline`;
- push analysis for `audit/repository-baseline` and `quality/**`;
- manual `workflow_dispatch` execution;
- JavaScript and TypeScript analysis;
- read-only repository access plus `security-events: write`;
- immutable CodeQL and checkout action pins;
- persisted checkout credentials disabled;
- Ubuntu 24.04 and a 15-minute timeout.

No scheduled trigger was present. That meant a dormant repository could receive no fresh CodeQL analysis until another qualifying repository event occurred.

## Change completed

Added this weekly trigger to `.github/workflows/codeql.yml`:

```yaml
schedule:
  - cron: '17 3 * * 1'
```

This requests CodeQL analysis every Monday at 03:17 UTC, while preserving all existing pull-request, push, and manual triggers.

The non-round minute reduces avoidable contention with workflows commonly scheduled at the top of the hour.

## Command and CI evidence

A local clone was attempted for independent repository validation but the execution environment could not resolve `github.com`:

```text
fatal: unable to access 'https://github.com/ssakthivel02/osb-admin-portal.git/': Could not resolve host: github.com
```

Repository validation therefore used GitHub file, pull-request, workflow-run, and job metadata.

The implementation commit completed both configured workflows successfully:

- CodeQL run `30309073124`, run number `6` — `success`;
- Quality Gate run `30309073128`, run number `112` — `success`.

This proves the revised workflow parsed and executed successfully for the implementation commit. It does not prove that a future scheduled invocation has already occurred.

## Safety impact

- no application code, dependency, lockfile, secret, or data changed;
- no production infrastructure or deployment configuration changed;
- no merge or auto-merge was performed;
- the work remains on `quality/ci-gate` targeting `audit/repository-baseline`;
- the existing least-privilege permissions and credential protections were preserved.

## Blockers and limitations

- GitHub scheduled workflows run from the default branch, so this schedule will not become operational merely by existing on the unmerged quality branch;
- the task does not establish that the CodeQL alert list is empty;
- source-code coverage reporting and a coverage threshold remain absent;
- authentication, authorization, API integration, persistence, audit logging, deployment validation, and production security acceptance remain incomplete;
- the repository is not production-ready.

## Next task

Complete the reviewed Vitest coverage-provider and lockfile update, publish deterministic coverage evidence, measure the actual baseline, and only then introduce a conservative coverage threshold. If dependency-lockfile modification remains blocked, reconcile the stale pull-request summary so it cites the latest verified Quality Gate and CodeQL evidence without overstating production readiness.
