# Siddhar Evidence Manifest Quality Gate

**Date:** 2026-07-28  
**Prepared branch:** `quality/siddhar-evidence-manifest`  
**Delivered review branch:** `quality/ci-gate`  
**Task:** Machine-readable evidence backlog, fail-closed validator, CI evidence, and manual submission guidance  
**Production impact:** None

## Objective

Convert the previously documented Siddhar evidence gaps into one deterministic, machine-readable, non-production backlog. Prevent accidental deletion, unsupported authentication language, unsafe evidence URLs, silent publication of contradicted material, or production promotion before source, review, and rights evidence exists.

## Repository inspection

Before implementation:

- the complete user-supplied register was already preserved in `docs/content-intake/siddhar-devotional-register-unverified.md`;
- the resubmission audit already identified 22 missing evidence classes and confirmed that no duplicate raw intake should be created;
- a typed `SiddharSourceRecord` validator already existed and enforced `productionEligible: false`;
- no machine-readable evidence-gap manifest, manifest-specific command, CI gate, generated evidence report, manual evidence guide, or evidence submission template existed;
- package scripts already included the public-environment policy, lint, strict TypeScript, Vitest, build, and preview commands;
- the quality workflow already performed immutable installation, lockfile drift detection, environment policy validation, lint, type-check, tests, build, and dependency audit.

## Exact repository changes

### Added

1. `docs/content-intake/evidence/siddhar-evidence-manifest.json`
2. `scripts/check-siddhar-evidence-manifest.mjs`
3. `scripts/check-siddhar-evidence-manifest.test.mjs`
4. `docs/content-intake/evidence/README.md`
5. `docs/content-intake/evidence/siddhar-evidence-submission-template.md`
6. `docs/quality/2026-07-28-siddhar-evidence-manifest-gate.md`

### Updated

7. `package.json`
8. `.github/workflows/quality-gate.yml`

No dependency or lockfile change was required.

## Implementation commits

- machine-readable 24-control manifest: `7934618580acb9de40097e98c73eaf86bd565f38`
- fail-closed manifest validator: `81afc5aecf5dbc1151dc1e21a43d0925a46e8b22`
- deterministic validator tests: `9c13531594fdd8786bd6af066d8274532ab84c93`
- package validation command: `a0841be07acb3c429c5314dfb11cffb82221aebb`
- CI validation and evidence upload: `cdcc55be647bdc2de84fe7400ef6f3152153109c`
- manual evidence intake guide: `20bacec1e4761c6bec2d63a7a69884fbfe9c9b79`
- evidence submission template: `b82249a03bc8fe15fad918775a1aff63abadedf5`

## Forty-one quality controls completed

### Manifest integrity

1. Requires a top-level object.
2. Requires schema version `1`.
3. Requires a valid `YYYY-MM-DD` review date.
4. Requires top-level `productionEligible: false`.
5. Requires an item array.
6. Prevents reducing the established backlog below 24 controls.
7. Requires every item to be an object.
8. Requires a stable item ID.
9. Requires a Siddhar or collection name.
10. Requires an item title.
11. Requires a priority.
12. Requires an evidence scope.
13. Requires an evidence status.
14. Requires a manual action.
15. Requires a blocking note.
16. Requires contiguous `SID-EV-001` through `SID-EV-024` identifiers.
17. Rejects duplicate IDs.
18. Restricts priorities to `P0`–`P3`.
19. Restricts scopes to the approved seven-scope taxonomy.
20. Restricts statuses to the approved four-state evidence taxonomy.
21. Requires every item to remain `productionEligible: false`.
22. Requires at least one non-empty evidence requirement per item.

### Official-evidence controls

23. Requires `officialEvidence` to be an array.
24. Requires every evidence reference to be an object.
25. Requires evidence type, repository, record ID, title, locator, URL, and access date.
26. Restricts evidence types to six approved source classes.
27. Requires HTTPS.
28. Restricts official URLs to approved Tamil Virtual Academy or Tamil Nadu Archives/GOML hostnames.
29. Requires a valid access date.
30. Requires official evidence before a supported, verified, or contradicted status is used.
31. Restricts `WORK_CATALOGUE_VERIFIED` to work-level evidence.
32. Requires contradicted records to state `do not publish` explicitly.
33. Rejects unsupported labels such as `PRIMARY-TEXT ATTESTED`, `SCRIPTURALLY ATTESTED`, or `High confidence`.

### Non-regression controls

34. Preserves the Bogar 7000 record as a work-level catalogue witness only.
35. Preserves the submitted Karuvoorar attribution as `CONTRADICTED_DO_NOT_PUBLISH`.
36. Calculates deterministic status, priority, evidence, and production-eligibility counts.
37. Generates a machine-readable CI evidence report.
38. Adds the `npm run check:siddhar-evidence` command.
39. Runs the validator before lint, type-check, tests, and build in CI.
40. Uploads the generated evidence report as a seven-day workflow artifact.
41. Adds eight focused tests covering the valid baseline, promotion rejection, ID integrity, safe hosts, valid dates, evidence requirements, protected Bogar/Karuvoorar states, unsupported labels, and backlog deletion.

## Manifest status

The canonical manifest contains:

- 24 evidence controls;
- 13 `P0` controls;
- 8 `P1` controls;
- 3 `P2` controls;
- 21 `UNRESOLVED` controls;
- 1 `SUPPORTED_ASSOCIATION` control;
- 1 `WORK_CATALOGUE_VERIFIED` control;
- 1 `CONTRADICTED_DO_NOT_PUBLISH` control;
- 3 official evidence references;
- 0 production-eligible items.

The three official references preserve previously reviewed evidence for:

- the Thirumoolar opening-text association;
- the work-level GOML catalogue witness for `Bogar 7000`, `TR 1016 / R 5664`;
- the Periyapuranam evidence contradicting the submitted Karuvoorar attribution.

No devotional item was newly authenticated by this implementation.

## Command and CI evidence

Implementation evidence commit: `b82249a03bc8fe15fad918775a1aff63abadedf5`.

GitHub Actions results:

- Quality Gate run `30363411091`, run #216: **completed / success**;
- CodeQL run `30363411094`, run #110: **completed / success**.

The Quality Gate completed:

```bash
npm ci --no-audit --no-fund
git diff --exit-code -- package-lock.json
npm run check:public-env
npm run check:siddhar-evidence
npm run lint
npm run typecheck
npm run test:ci
npm run build
npm audit --audit-level=high
```

The job uploaded public-environment, Siddhar evidence, type-check, JUnit, production-build, and dependency-audit artifacts.

Siddhar evidence report artifact:

- artifact ID: `8689747699`;
- SHA-256 digest: `73af066efed1d526924bdd7863c147705847e7eac7540292cbeb8d6db150b380`;
- retention: 7 days.

CodeQL completed JavaScript and TypeScript analysis successfully.

No local shell PASS result is claimed. Repository validation evidence comes from GitHub Actions.

## Manual work required

The highest-priority manual evidence pack remains:

1. Official GOML record or catalogue scan for `R.No. 3215 — Agastiyar Parippooranam 400`.
2. Title page, colophon, contents page, and verse-1 page for the claimed 1899 Agastiyar edition.
3. Exact Agastiyar invocation page plus adjacent context.
4. Exact `Bogar 7000` folios for the submitted moola mantra and dhyana sloka.
5. Exact catalogue record and folio for the submitted Korakkar `Chandra Regai` verse.
6. Official GOML record and refrain folio for `R.No. 121 — Pambatti Siddhar Padalgal`.
7. Recognised Ninth Tirumurai page and verse for the intended Karuvoorar item.
8. Named Tamil transcription, transliteration, translation, rights, and editorial reviewers.

The repository now contains a full manual checklist, image-quality rules, filename convention, rights controls, and a submission template.

## Safety impact

- No raw intake was duplicated.
- No devotional wording was silently corrected or replaced.
- No content was promoted into application or production data.
- No dependencies or lockfile changed.
- No secrets, credentials, private correspondence, or personal identification were added.
- No authentication, API, persistence, AI service, deployment, or infrastructure changed.
- The Karuvoorar contradiction remains blocked.
- PR #2 remains draft and unmerged.

## Blockers

1. Most item-level source pages and manuscript folios remain unavailable.
2. GOML `R.No. 3215` and `R.No. 121` remain unresolved.
3. Work-level evidence for Bogar 7000 does not prove the submitted item text.
4. Translation, transliteration, and transcription reviewers are not nominated.
5. Publication and image reuse rights are not documented.
6. The manual template is Markdown; completed evidence submissions are not yet machine-readable or automatically linked to source records.
7. Production publication remains prohibited.

## Next task

Add a machine-readable, non-production evidence-submission packet format and validator. It must reference an existing `SID-EV-*` manifest ID, require document metadata, reviewer metadata, rights status, source locators, and file/URL integrity, and must never change manifest status automatically. Use synthetic fixtures only in tests.

## Status

24-CONTROL EVIDENCE BACKLOG COMPLETE  
41 QUALITY CONTROLS IMPLEMENTED  
QUALITY GATE AND CODEQL VERIFIED  
MANUAL SOURCE, REVIEW, AND RIGHTS EVIDENCE STILL REQUIRED  
PRODUCTION PUBLICATION BLOCKED
