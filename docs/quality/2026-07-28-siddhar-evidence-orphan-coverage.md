# Siddhar Evidence Orphan and Coverage Gate

**Date:** 2026-07-28  
**Prepared branch:** `quality/siddhar-evidence-coverage-working`  
**Delivered review branch:** `quality/ci-gate`  
**Task:** Reconcile controlled evidence uploads with valid submission packets and the 24-item evidence manifest  
**Production impact:** None

## Objective

Complete the next verified remediation-backlog item without duplicating the evidence manifest, fabricating archival files, or changing any editorial status. Require every future file under the controlled Siddhar uploads path to be owned by exactly one valid `SID-SUB-*` packet, report manifest-level coverage, and preserve the truthful zero-file baseline until real archival evidence and human reviews are supplied.

## Repository and attachment inspection

Before implementation:

- the repository already validated the 24-item evidence manifest;
- submission packets already had structural, source, locator, reviewer, rights, and no-promotion controls;
- committed evidence bytes already had path, size, SHA-256, extension, MIME, and signature checks;
- no control enumerated every file under `docs/content-intake/evidence/uploads/` and reconciled it with exactly one valid packet;
- no report showed packet/file coverage for all 24 manifest controls;
- the current repository still had zero completed packets and zero controlled evidence files;
- the available Gemini conversation PDF remained classified as secondary working notes rather than an archival witness, so it was not copied into the controlled uploads path or used to change any manifest state.

## Exact repository changes

### Added

1. `scripts/check-siddhar-evidence-coverage.mjs`
2. `scripts/check-siddhar-evidence-coverage.test.mjs`
3. `docs/quality/2026-07-28-siddhar-evidence-orphan-coverage.md`

### Updated

4. `package.json`
5. `.github/workflows/quality-gate.yml`
6. `docs/content-intake/evidence/submissions/README.md`

No dependency or lockfile change was required.

## Implementation commits

- orphan and coverage validator: `8c03b71d7029e772b1cce737f0b86e693400cfd1`;
- deterministic regression tests: `bca5e6fcd00d4ac274f2bba3cf5eaaa4eeb52acf`;
- package command: `28c3eeb979da94115e6ead2039f47bd0b5f1f921`;
- CI validation and report upload: `5091c5c66bb0cbd7a231b8d8b8d3d3603660a104`;
- one-packet ownership guidance: `87a4d9f3cac967c58b2c03857f9dcb378baba01e`;
- lint correction without policy weakening: `89449c7b8099cfae9888e821c45934d1d226ddd7`.

## Forty-six quality controls completed

### Manifest and packet eligibility

1. Uses the canonical evidence-submission contract rather than creating a second extension or packet-status policy.
2. Preserves a successful zero-packet and zero-upload baseline.
3. Requires the manifest to contain an item array.
4. Requires non-empty manifest item IDs.
5. Rejects duplicate manifest item IDs.
6. Sorts packet inputs deterministically.
7. Fails closed for packet JSON parse errors.
8. Requires every packet to be a JSON object.
9. Requires `SID-SUB-YYYYMMDD-NNN` packet IDs.
10. Rejects duplicate packet IDs.
11. Requires each packet to reference an existing `SID-EV-*` manifest item.
12. Requires `manifestStatusObserved` to match the current manifest status.
13. Requires an approved non-production packet status.
14. Requires `productionEligible: false`.
15. Requires at least one evidence-file declaration for a valid packet.
16. Restricts declarations to the controlled uploads prefix.
17. Rejects traversal, backslash, null-byte, and non-normalised declaration paths.
18. Restricts declared extensions to the canonical evidence allow-list.
19. Prevents any malformed or stale packet from satisfying file coverage.

### Controlled uploads discovery and containment

20. Treats a missing uploads directory as a valid zero-file state.
21. Converts uploads-root inspection errors into deterministic findings.
22. Rejects a symbolic-link uploads root.
23. Requires the uploads root to be a directory.
24. Resolves the uploads root and confirms repository containment.
25. Recursively scans nested evidence directories.
26. Sorts filesystem entries deterministically.
27. Converts upload-entry inspection errors into findings.
28. Rejects symbolic links within the uploads tree.
29. Allows directories only for organisation and requires evidence entries to be regular files.
30. Resolves each real file and rechecks controlled-directory containment.
31. Rejects unsupported actual-file extensions.
32. Ignores files outside the controlled uploads directory.

### One-packet ownership and coverage reporting

33. Fails for an orphan controlled upload with no valid packet declaration.
34. Fails for a valid packet declaration whose file is missing.
35. Fails when one upload path is declared more than once, including repeated declarations within one packet.
36. Counts a file as covered only when it exists and has exactly one valid packet owner.
37. Records total packet files, valid packets, declarations, unique declarations, uploads, covered files, orphans, missing files, and duplicate paths.
38. Reports packet count, declared-file count, and observed-file count for every manifest control.
39. Reports deterministic `NO_PACKET`, `PACKET_WITHOUT_FILES`, `FILES_MISSING`, `PARTIAL`, and `COVERED` states.
40. Reports covered and uncovered manifest-item counts.
41. Calculates a deterministic coverage percentage.
42. Sorts the complete manifest coverage matrix by `SID-EV-*` ID.
43. Reports zero automatic status changes.
44. Reports zero production-eligible evidence files.
45. Runs the coverage gate in CI before lint, strict TypeScript, tests, build, and dependency audit, and uploads a seven-day machine-readable report.
46. Adds 19 focused tests covering the zero state, valid ownership, orphan and missing files, duplicate ownership, unknown or stale manifest links, production blocking, malformed packets, unsafe paths, unsupported extensions, symlinks, nested paths, partial coverage, deterministic ordering, and malformed manifests.

## Evidence-driven correction

The first pull-request Quality Gate run confirmed that all four Siddhar evidence gates, including the new orphan-and-coverage gate, passed. It then failed at ESLint because the new script retained one unused `uploadsDirectory` constant.

Quality Gate run `30399521434`, run #270:

- immutable installation: passed;
- lockfile drift check: passed;
- public-environment policy: passed;
- Siddhar manifest validation: passed;
- Siddhar packet validation: passed;
- Siddhar file-integrity validation: passed;
- Siddhar orphan-and-coverage validation: passed;
- lint: failed with `no-unused-vars` for `uploadsDirectory`;
- later type-check, test, build, and audit steps were skipped.

The constant was removed in commit `89449c7b8099cfae9888e821c45934d1d226ddd7`. No ESLint rule, TypeScript setting, validation rule, or CI requirement was weakened.

## Verified command and workflow evidence

Corrected implementation commit: `89449c7b8099cfae9888e821c45934d1d226ddd7`.

GitHub Actions results:

- Quality Gate run `30399769413`, run #273: **completed / success**;
- CodeQL run `30399769489`, run #167: **completed / success**.

The successful Quality Gate completed:

```bash
npm ci --no-audit --no-fund
git diff --exit-code -- package-lock.json
npm run check:public-env
npm run check:siddhar-evidence
npm run check:siddhar-submissions
npm run check:siddhar-files
npm run check:siddhar-coverage
npm run lint
npm run typecheck
npm run test:ci
npm run build
npm audit --audit-level=high
```

JUnit evidence reported:

- 88 tests;
- 0 failures;
- 0 errors;
- 19 focused Siddhar orphan-and-coverage tests.

The generated coverage report recorded:

```json
{
  "ok": true,
  "manifestItemCount": 24,
  "packetFileCount": 0,
  "validPacketCount": 0,
  "declaredFileCount": 0,
  "uniqueDeclaredFileCount": 0,
  "uploadFileCount": 0,
  "coveredFileCount": 0,
  "orphanFileCount": 0,
  "missingDeclaredFileCount": 0,
  "duplicateDeclarationPathCount": 0,
  "coveredManifestItems": 0,
  "uncoveredManifestItems": 24,
  "coveragePercent": 0,
  "automaticStatusChanges": 0,
  "productionEligibleFiles": 0,
  "issues": []
}
```

The report also includes a deterministically sorted coverage entry for each `SID-EV-001` through `SID-EV-024`. Every item is currently `NO_PACKET`, which accurately reflects the repository state rather than inventing evidence coverage.

### Evidence artifacts

- coverage report artifact ID: `8704230100`;
- coverage report digest: `sha256:49056523d7da98791aec72f94f9e9bebbfe0f0eb51f3485b458e92792a49c092`;
- test evidence artifact ID: `8704238407`;
- test evidence digest: `sha256:1f6bb871164382c108a7afa9096a445d0531a4537f6c1be05d64a4a7eebbae0f`;
- retention: 7 days.

No local-shell PASS is claimed for the complete repository. The recorded command evidence comes from GitHub Actions and downloaded workflow artifacts.

## Data appended without fabrication

The generated report now appends the previously missing coverage dimension for all 24 evidence controls:

- whether a control has any packet;
- how many files its packets declare;
- how many declared files are actually present and uniquely owned;
- its current coverage state;
- overall coverage and exception counts.

No archival text, catalogue record, manuscript folio, rights approval, reviewer identity, or devotional classification was added merely to improve the coverage percentage.

## Manual work required

The current attachment and repository still do not contain a primary-source evidence file. Manual work remains necessary:

1. Obtain an official archival or recognised canonical source for an existing `SID-EV-*` control.
2. Save the original PDF, JPEG, PNG, or TIFF under `docs/content-intake/evidence/uploads/` using a non-sensitive filename.
3. Calculate its exact SHA-256 digest and byte size.
4. Record the official repository, record identifier, title, bibliographic details, access date, and stable URL.
5. Record bundle, work, accession, folio/page, verse/line, and adjacent-context details where available.
6. Create one completed machine-readable `SID-SUB-*` packet that uniquely declares each uploaded file.
7. Assign real, named transcription, transliteration, translation, and editorial reviewers; do not use synthetic identities.
8. Establish item-level publication and image rights, including a permission reference or explicit no-reuse restriction.
9. Run all three intake commands: `check:siddhar-submissions`, `check:siddhar-files`, and `check:siddhar-coverage`.
10. Keep the manifest status unchanged until a separate human editorial decision is completed.

Highest-priority unresolved evidence remains:

- Agastiyar `R.No. 3215` official GOML record;
- claimed 1899 Agastiyar title page, colophon, contents, invocation, verse 1, and adjacent pages;
- exact Bogar 7000 folios for the submitted moola mantra and dhyana sloka;
- Korakkar Chandra Regai catalogue record and exact verse folio;
- Pambatti `R.No. 121` catalogue record and refrain folio;
- stable official Ninth Tirumurai source evidence for a Karuvoorar correction;
- named reviewer and item-level rights records.

## Safety impact

- No evidence file or packet was fabricated.
- No AI chat export was treated as an archival witness.
- No manifest or editorial status changed.
- No production-eligible item or file was permitted.
- No dependency or lockfile changed.
- No secret, credential, private correspondence, or unnecessary personal data was added.
- No authentication, API, database, persistence, AI service, deployment, or infrastructure changed.
- The contradicted Karuvoorar record remains blocked.
- PR #2 remains draft and unmerged.

## Blockers

1. There are still zero completed evidence packets.
2. There are still zero files under the controlled uploads path.
3. All 24 manifest controls therefore remain uncovered.
4. Named human reviewers and review dates remain unavailable.
5. Rights and reuse permissions remain unresolved.
6. Structural, byte-integrity, and coverage checks cannot establish manuscript authenticity, textual correctness, translation quality, or lawful reuse.
7. Production publication remains prohibited.

## Next task

Add a dependency-free reviewer identity and separation-of-duties gate. It should require stable non-sensitive reviewer IDs, prohibit synthetic or placeholder identities, prevent one person from completing incompatible transcription and approval roles for the same packet, report assignment coverage by manifest control, pass safely with zero packets, and never change manifest, editorial, or production status.

## Status

46 ORPHAN-AND-COVERAGE CONTROLS COMPLETE  
88 TESTS PASSED, INCLUDING 19 COVERAGE TESTS  
QUALITY GATE AND CODEQL VERIFIED  
24 MANIFEST CONTROLS REPORTED, 0 FABRICATED COVERAGE  
0 COMPLETED PACKETS AND 0 CONTROLLED EVIDENCE FILES  
PRODUCTION PUBLICATION BLOCKED
