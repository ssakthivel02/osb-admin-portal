# Siddhar Evidence Submission Packet Gate

**Date:** 2026-07-28  
**Prepared branch:** `quality/siddhar-evidence-submission-packets`  
**Delivered review branch:** `quality/ci-gate`  
**Task:** Machine-readable evidence packet contract, validator, regression tests, CI evidence, and manual intake controls  
**Production impact:** None

## Objective

Implement the next verified remediation backlog item without duplicating the existing 24-control Siddhar evidence manifest. Provide a safe, machine-readable packet format for future source documents while preventing automatic authentication, manifest status changes, production promotion, unsafe file references, incomplete reviewer metadata, or unsupported rights claims.

## Repository inspection

Before implementation:

- `docs/content-intake/evidence/siddhar-evidence-manifest.json` already contained 24 stable `SID-EV-*` evidence controls;
- the manifest validator already protected the work-level Bogar witness and the contradicted Karuvoorar attribution;
- the repository had a Markdown submission template but no machine-readable packet contract;
- there was no committed directory for completed submission packets;
- there was no validator linking a submission to an existing manifest control;
- no CI evidence report covered packet identity, file integrity, reviewers, rights, or status-promotion prevention;
- no completed source packet or evidence image was available, so none was fabricated.

## Exact repository changes

### Added

1. `config/siddhar-evidence-submission-contract.json`
2. `docs/content-intake/evidence/siddhar-evidence-submission-packet-template.json`
3. `docs/content-intake/evidence/submissions/README.md`
4. `scripts/check-siddhar-evidence-submissions.mjs`
5. `scripts/check-siddhar-evidence-submissions.test.mjs`
6. `docs/quality/2026-07-28-siddhar-evidence-submission-packets.md`

### Updated

7. `package.json`
8. `.github/workflows/quality-gate.yml`
9. `eslint.config.js`

No dependency or lockfile change was required.

## Implementation commits

- contract baseline: `1fb9c9865bc32bbd4748800d1b060278a428c064`
- machine-readable packet template: `2e5e7c0792a4d3c0463e86c6d81807a2b6118b24`
- submission-directory guidance: `28601f66f365165a3871996c5c2264db61690efd`
- safe disposition taxonomy: `23392fd4439b659a6613b5f4ee9abaebecff2cba`
- fail-closed packet validator: `9212a204980665e0914359cf6cab9b3a25eb8bea`
- deterministic validator tests: `6cdbea6891eb4d4d4a108f621031a4566e4bc1fa`
- package command: `d1f179859c8d2ee587019cd39fa68bc1f9577493`
- CI packet validation and evidence upload: `21926ceb429bbb02e84540d4810df8337bd0eb01`
- persistent lint evidence capture: `76df64cd45106514108014774d39a8a147c440e4`
- Node `URL` lint-global correction: `ff45ee3f6caf4f4410225a24068b212a8f0e4fb9`

## Forty-eight quality controls completed

### Contract integrity

1. Requires a top-level contract object.
2. Requires schema version `1`.
3. Requires all controlled enumeration arrays.
4. Requires non-empty string values in every enumeration.
5. Rejects duplicate enumeration values.
6. Requires deterministic enumeration sorting.
7. Requires a positive maximum file-size integer.

### Packet identity and manifest linkage

8. Requires every packet to be a JSON object.
9. Requires packet identity, manifest, status, date, disposition, and notes fields.
10. Requires the packet schema version to match the contract.
11. Requires `SID-SUB-YYYYMMDD-NNN` packet IDs.
12. Requires the JSON filename to match the packet ID.
13. Rejects duplicate packet IDs.
14. Requires a real `YYYY-MM-DD` submission date.
15. Requires the submission date to match the date encoded in the packet ID.
16. Requires an existing `SID-EV-*` manifest reference.
17. Requires `manifestStatusObserved` to match the current manifest status.
18. Restricts packet status to the approved non-production taxonomy.
19. Requires `productionEligible: false`.
20. Restricts proposed dispositions to non-production review outcomes.
21. Rejects fields that propose or apply a new manifest/editorial status.
22. Rejects unresolved template placeholders in committed packets.
23. Rejects unsupported authentication and production-ready language.

### Source and locator integrity

24. Requires a source object.
25. Requires repository, record, title, bibliographic, language, script, URL, and access-date fields.
26. Restricts source type to the approved taxonomy.
27. Requires a non-placeholder HTTPS official-source URL.
28. Requires a real access date.
29. Requires a locator object.
30. Requires all locator fields to be explicit strings, including empty strings when unavailable.
31. Requires at least one bundle, work, accession, folio/page, or verse/line locator.
32. Requires an explicit adjacent-context boolean.

### File integrity

33. Requires at least one evidence-file declaration per committed packet.
34. Requires path, SHA-256, MIME type, and byte-size metadata.
35. Restricts evidence paths to `docs/content-intake/evidence/uploads/` and rejects traversal/backslash paths.
36. Restricts file extensions to PDF, JPEG, PNG, and TIFF.
37. Rejects duplicate evidence paths across packets.
38. Requires a non-placeholder 64-character SHA-256 digest.
39. Rejects duplicate file digests across packets.
40. Restricts MIME types to the approved evidence formats.
41. Requires a positive size not exceeding 100 MiB.

### Review, rights, declarations, and non-regression

42. Requires all transcription, transliteration, translation, and editorial review roles.
43. Restricts review statuses and enforces coherent completion dates.
44. Requires named reviewers before `SUBMITTED_FOR_REVIEW` status.
45. Requires rights metadata and coherent permission-granted evidence.
46. Requires all no-promotion, no-production, no-medical-use, and no-secret/personal-data declarations to remain `true`.
47. Restricts contradicted records to `CORRECTION_EVIDENCE_ONLY` packets.
48. Generates deterministic counts while reporting zero automatic status changes and zero production-eligible packets.

## Evidence-driven correction

The first CI execution for implementation commit `21926ceb429bbb02e84540d4810df8337bd0eb01` passed both Siddhar validators but failed ESLint because the new script used Node's global `URL` without declaring it in the repository's script-global policy.

Quality Gate run `30371480983`, run #229:

- public-environment policy: passed;
- Siddhar manifest validation: passed;
- Siddhar submission validation: passed;
- lint: failed with `URL is not defined` at `scripts/check-siddhar-evidence-submissions.mjs`;
- later steps were skipped.

The repository quality configuration was corrected by declaring Node's built-in `URL` as a read-only script global. TypeScript, lint rules, and the validator were not weakened. The workflow was also improved to retain lint output as a seven-day artifact for future deterministic remediation.

## Verified command and workflow evidence

Corrected implementation commit: `ff45ee3f6caf4f4410225a24068b212a8f0e4fb9`.

GitHub Actions results:

- Quality Gate run `30372118183`, run #236: **completed / success**;
- CodeQL run `30372117349`, run #130: **completed / success**.

The successful Quality Gate completed:

```bash
npm ci --no-audit --no-fund
git diff --exit-code -- package-lock.json
npm run check:public-env
npm run check:siddhar-evidence
npm run check:siddhar-submissions
npm run lint
npm run typecheck
npm run test:ci
npm run build
npm audit --audit-level=high
```

The final JUnit evidence reported:

- 55 tests;
- 0 failures;
- 0 errors;
- 11 focused Siddhar evidence-submission tests.

The generated submission report recorded:

```json
{
  "ok": true,
  "contractSchemaVersion": 1,
  "manifestItemCount": 24,
  "packetCount": 0,
  "linkedManifestItems": 0,
  "fileCount": 0,
  "automaticStatusChanges": 0,
  "productionEligiblePackets": 0,
  "issues": []
}
```

No packet count was invented: zero completed packets is the correct repository state until real documents are supplied.

### Evidence artifacts

- Siddhar submission report artifact ID: `8693337239`;
- submission report digest: `sha256:8d1a0792fa0df98c5198c2e9c4b793ec6ed6b7db51b37fea59e9230103e62e41`;
- lint evidence artifact ID: `8693340257`;
- lint evidence digest: `sha256:ae6ed1bdca69a99e89b1e84daefc09cc3cb14cbf7a55c85d2cdf8ff2c8bbc756`;
- test evidence artifact ID: `8693347399`;
- test evidence digest: `sha256:31243b4070e836aca5d445c20e3878487d9ee12337862eab16bbb6115e0eaaf5`;
- retention: 7 days.

CodeQL completed JavaScript and TypeScript analysis successfully.

No local shell PASS is claimed. Repository validation evidence comes from GitHub Actions and the downloaded workflow artifacts.

## Manual work required

No real source document, manuscript folio, temple publication, or completed reviewer record is available in the repository. The following work must therefore be performed manually before creating the first packet:

1. Obtain an official source document for an existing `SID-EV-*` control.
2. Save the original PDF/image under `docs/content-intake/evidence/uploads/` using a non-sensitive filename.
3. Calculate the file's SHA-256 digest and exact byte size.
4. Record the official repository, record ID, title, bibliographic details, URL, and access date.
5. Record bundle, work, accession, folio/page, and verse/line locators where available.
6. Include adjacent context rather than a cropped isolated line where possible.
7. Assign named transcription, transliteration, translation, and editorial reviewers.
8. Document the transliteration standard.
9. Establish image/publication rights and record the permission reference or restriction.
10. Copy the machine-readable template into the submissions directory and replace every placeholder.
11. Run `npm run check:siddhar-submissions`.
12. Keep the manifest status unchanged until a separate human editorial decision is completed.

Highest-priority evidence remains the Agastiyar `R.No. 3215` record and 1899 edition pages, exact Bogar 7000 folios, Korakkar Chandra Regai evidence, Pambatti `R.No. 121`, and the correct Ninth Tirumurai Karuvoorar page.

## Safety impact

- No completed evidence packet was fabricated.
- No raw devotional intake was duplicated or rewritten.
- No manifest item status changed.
- No content was authenticated or promoted into application data.
- No production-eligible packet was permitted.
- No dependencies or lockfile changed.
- No secrets, credentials, private correspondence, or unnecessary personal data were added.
- No authentication, API, persistence, AI service, deployment, or infrastructure changed.
- The contradicted Karuvoorar attribution remains blocked.
- PR #2 remains draft and unmerged.

## Blockers

1. There are no completed source files under the controlled uploads path.
2. There are no completed machine-readable submission packets.
3. Named reviewers and review dates remain unavailable.
4. Rights and reuse permissions remain unresolved.
5. File hashes can prove byte identity only; they do not prove source authenticity or lawful reuse.
6. Structural validation cannot replace manuscript, philological, translation, or editorial review.
7. Production publication remains prohibited.

## Next task

Add a dependency-free evidence-file integrity checker. It should compare each committed packet's declared path, SHA-256 digest, byte size, extension, and MIME signature against the actual repository file, generate CI evidence, and fail closed for missing or mismatched files. It must remain safe when zero completed packets exist and must not change manifest or editorial status.

## Status

MACHINE-READABLE PACKET CONTRACT COMPLETE  
48 QUALITY CONTROLS IMPLEMENTED  
55 TESTS PASSED, INCLUDING 11 PACKET TESTS  
QUALITY GATE AND CODEQL VERIFIED  
0 COMPLETED PACKETS — MANUAL EVIDENCE REQUIRED  
PRODUCTION PUBLICATION BLOCKED
