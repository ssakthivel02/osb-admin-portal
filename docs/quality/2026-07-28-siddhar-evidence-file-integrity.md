# Siddhar Evidence File Integrity Gate

**Date:** 2026-07-28  
**Prepared branch:** `quality/siddhar-evidence-file-integrity`  
**Delivered review branch:** `quality/ci-gate`  
**Task:** Verify committed evidence bytes against machine-readable packet declarations and reconcile the newly supplied Gemini conversation PDF  
**Production impact:** None

## Objective

Complete the next verified remediation backlog item without creating fictional source packets or promoting AI-generated working notes. Add a dependency-free gate that verifies each future Siddhar evidence packet against the actual committed file and fails closed for missing, redirected, disguised, truncated, duplicated, or metadata-mismatched evidence.

## Repository and attachment inspection

Before implementation:

- the repository had a 24-control evidence manifest and a machine-readable packet validator;
- packet metadata already declared a repository path, SHA-256 digest, MIME type, and byte size;
- no control compared those declarations with actual repository bytes;
- no completed packet or evidence file existed, so the correct baseline was zero files;
- the newly supplied `28 july admin chatgpt gemni output.pdf` was a 16-page browser print of a Gemini conversation, not an archival witness;
- the PDF contained useful search leads and draft material, but also synthetic reviewer data, unsupported clearance statements, broad rights claims, and generated implementation examples that must not be treated as repository truth.

Attachment fingerprint recorded in the reconciliation document:

- size: 1,240,280 bytes;
- SHA-256: `6f0d780f7627d732d0e87388c617eb17c599d98ead55dac3b08dfdd5d746bc35`;
- classification: `SECONDARY_AI_WORKING_NOTES`;
- new official evidence supplied: 0.

## Exact repository changes

### Added

1. `scripts/check-siddhar-evidence-file-integrity.mjs`
2. `scripts/check-siddhar-evidence-file-integrity.test.mjs`
3. `docs/content-intake/evidence/2026-07-28-gemini-output-reconciliation.md`
4. `docs/quality/2026-07-28-siddhar-evidence-file-integrity.md`

### Updated

5. `package.json`
6. `.github/workflows/quality-gate.yml`
7. `docs/content-intake/evidence/submissions/README.md`

No dependency or lockfile change was required.

## Implementation commits

- evidence-byte integrity checker: `9b3070a50abfda32de320ec4aec579a4f86c2b04`;
- 14 deterministic integrity tests: `014a913f2a950ab1c8afd439c5440f112fdff785`;
- package command: `0030a792759ca52d943bfcc19b3d3a27c80173b4`;
- CI validation and evidence upload: `95f1d6e1f7c5b2dc286fa0e7907bcd478662db3d`;
- submission guidance reconciliation: `257bb7e5f727b597e508c6ceffe8553afae2f25d`;
- Gemini-output evidence classification: `10b4596930b6346b088d337d6a52633f42058c3b`.

## Forty-five quality controls completed

### Path and filesystem containment

1. Uses the canonical Siddhar evidence-submission contract rather than a second MIME or size policy.
2. Passes safely when zero completed packets exist.
3. Sorts packet inputs deterministically.
4. Rejects packet JSON parse failures.
5. Requires each packet to be an object.
6. Requires a `files` array.
7. Requires each file declaration to be an object.
8. Requires a non-empty repository path.
9. Restricts evidence paths to `docs/content-intake/evidence/uploads/`.
10. Rejects traversal segments.
11. Rejects Windows-style backslash paths.
12. Rejects null-byte paths.
13. Requires normalised repository-relative paths.
14. Requires the resolved path to remain inside the repository root.
15. Rejects duplicate declarations of the same evidence path.
16. Fails when the declared file does not exist.
17. Converts filesystem inspection failures into deterministic validation findings.
18. Rejects symbolic links.
19. Requires a regular file rather than a directory or special file.
20. Resolves the real path and checks containment again to prevent redirection outside the repository.

### Size, digest, type, and byte-signature integrity

21. Enforces the canonical extension allow-list.
22. Enforces the canonical MIME allow-list.
23. Requires extension and declared MIME to agree.
24. Requires a positive declared byte size.
25. Enforces the canonical 100 MiB maximum.
26. Compares declared size with the actual filesystem size.
27. Rejects empty evidence files.
28. Converts file-read failures into deterministic findings.
29. Calculates the actual SHA-256 digest from committed bytes.
30. Requires the declared SHA-256 digest to match exactly.
31. Rejects duplicate actual file content across declarations.
32. Recognises PDF only when the `%PDF-` header and `%%EOF` trailer are present.
33. Recognises the full PNG signature.
34. Recognises the JPEG start-of-image signature.
35. Recognises both little-endian and big-endian TIFF signatures.
36. Rejects unknown or incomplete byte signatures.
37. Requires detected MIME to match the packet declaration.
38. Requires detected MIME to match the filename extension.

### Evidence, testing, and non-promotion controls

39. Generates deterministic packet, declaration, checked-file, missing-file, and mismatch counts.
40. Reports zero automatic manifest-status changes.
41. Reports zero production-eligible evidence files.
42. Runs file-byte integrity validation in CI before lint, type-check, tests, and build.
43. Uploads a seven-day machine-readable integrity report.
44. Adds 14 focused tests for success, zero-state safety, missing files, metadata mismatch, disguised files, unsafe paths, links, directories, duplicates, invalid packets, and size limits.
45. Explicitly classifies AI chat exports and generated examples as non-authoritative working notes rather than archival evidence.

## Verified command and workflow evidence

Implementation evidence commit: `10b4596930b6346b088d337d6a52633f42058c3b`.

GitHub Actions results:

- Quality Gate run `30397468936`, run #248: **completed / success**;
- CodeQL run `30397469710`, run #142: **completed / success**.

The successful Quality Gate completed:

```bash
npm ci --no-audit --no-fund
git diff --exit-code -- package-lock.json
npm run check:public-env
npm run check:siddhar-evidence
npm run check:siddhar-submissions
npm run check:siddhar-files
npm run lint
npm run typecheck
npm run test:ci
npm run build
npm audit --audit-level=high
```

The JUnit artifact reported:

- 69 tests;
- 0 failures;
- 0 errors;
- 14 focused evidence-file integrity tests.

The generated file-integrity report recorded:

```json
{
  "ok": true,
  "contractSchemaVersion": 1,
  "packetCount": 0,
  "declaredFileCount": 0,
  "checkedFileCount": 0,
  "missingFileCount": 0,
  "mismatchCount": 0,
  "automaticStatusChanges": 0,
  "productionEligibleFiles": 0,
  "issues": []
}
```

Zero checked files is deliberate and truthful. The uploaded Gemini conversation PDF was not converted into a source packet because it does not contain the required archival witness or reviewer evidence.

### Evidence artifacts

- file-integrity report artifact ID: `8703364839`;
- file-integrity report digest: `sha256:d92b7a12e3e0b39e738830bd71c6073f8baacfb915a0cf3386272f8925d64686`;
- test evidence artifact ID: `8703372139`;
- test evidence digest: `sha256:c2b461a1e94282d6781f1a515c30505a5dff05b5fbacdba60b694da7606f0b3c`;
- retention: 7 days.

No local shell PASS is claimed for the full repository. Repository validation evidence comes from GitHub Actions and the downloaded workflow artifacts.

## Attachment reconciliation decisions

The supplied PDF was useful for backlog reconciliation, but the following statements remain blocked pending direct evidence:

1. The proposed Karuvoorar replacement does not clear `SID-EV-003`.
2. Synthetic reviewer identities, dates, approval records, and placeholder governance payloads are not acceptable evidence.
3. Broad public-domain and reuse labels require item-level rights review.
4. Generated database, API, identity, monitoring, AI, and deployment examples are not implemented repository features.
5. Descriptions such as authenticated, fully operational, production-ready, or ready to merge are unsupported.
6. The existing model must preserve contradicted audit records while continuing to block their publication.

## Manual work required

1. Obtain an official archival or canonical source file for an existing `SID-EV-*` control.
2. Save the original file under `docs/content-intake/evidence/uploads/` with a non-sensitive filename.
3. Record the exact source locator, rights basis, MIME type, byte size, and SHA-256 digest.
4. Create a completed machine-readable `SID-SUB-*` packet.
5. Assign named transcription, transliteration, translation, and editorial reviewers.
6. Run both `npm run check:siddhar-submissions` and `npm run check:siddhar-files`.
7. Keep the manifest status unchanged until a separate human editorial decision is recorded.

Highest-priority evidence remains:

- Agastiyar `R.No. 3215` official record;
- claimed 1899 Agastiyar edition title, colophon, contents, invocation, verse-1, and adjacent pages;
- exact Bogar 7000 folios;
- Korakkar Chandra Regai catalogue record and verse folio;
- Pambatti `R.No. 121` record and refrain folio;
- stable official Ninth Tirumurai evidence for a Karuvoorar correction;
- named reviewers and item-level rights evidence.

## Safety impact

- No chat-generated claim was promoted to verified evidence.
- No completed evidence packet was fabricated.
- No evidence file was invented or copied into the controlled source path.
- No manifest status changed.
- No production-eligible content or file was permitted.
- No dependency or lockfile changed.
- No secrets, credentials, private correspondence, or unnecessary personal data were committed.
- No authentication, API, database, AI service, deployment, or infrastructure changed.
- PR #2 remains draft and unmerged.

## Blockers

1. The repository still contains zero completed evidence packets and zero controlled evidence files.
2. The attached PDF is a secondary AI conversation record, not source evidence.
3. Named human reviewers and review dates remain unavailable.
4. Rights and reuse permissions remain unresolved.
5. Byte integrity proves file identity only; it does not prove authenticity, completeness, lawful reuse, or textual correctness.
6. Production publication remains prohibited.

## Next task

Add a dependency-free orphan-evidence and coverage gate. It should fail when a file exists under the controlled uploads path without exactly one valid packet declaration, report which manifest controls have packets and files, and preserve the safe zero-file baseline. It must not change manifest, editorial, or production status.

## Status

45 FILE-INTEGRITY CONTROLS COMPLETE  
69 TESTS PASSED, INCLUDING 14 FILE-INTEGRITY TESTS  
QUALITY GATE AND CODEQL VERIFIED  
GEMINI PDF RECONCILED AS WORKING NOTES, NOT ARCHIVAL EVIDENCE  
0 COMPLETED PACKETS AND 0 CONTROLLED EVIDENCE FILES  
PRODUCTION PUBLICATION BLOCKED
