# Siddhar Rights-Decision Provenance Gate

**Date:** 2026-07-29  
**Prepared branch:** `quality/siddhar-rights-provenance`  
**Delivered review branch:** `quality/ci-gate`  
**Task:** Validate Siddhar rights status, controlled decision provenance, authorised rights reviewers, permission evidence, expiry, and packet-to-decision reconciliation  
**Production impact:** None

## Objective

Complete the next verified remediation-backlog item without inventing permissions, accepting broad public-domain claims, exposing private legal correspondence, or changing any manifest, editorial, or production state. Add a dependency-free rights gate that keeps unresolved and unverified claims fail-closed, requires controlled provenance for authoritative rights decisions, validates permission-document bytes, and reports rights-review coverage for every evidence control.

## Repository inspection

Before implementation:

- the canonical submission contract already defined `PERMISSION_GRANTED`, `PUBLIC_DOMAIN_CLAIM_UNVERIFIED`, `RESTRICTED`, and `UNRESOLVED` rights statuses;
- packet rights metadata used free-form holder, basis, permission-reference, and reuse-scope fields;
- no controlled rights-decision record existed;
- no rights-reviewer authorisation list existed;
- no control verified a permission letter's repository path, byte size, SHA-256, MIME declaration, extension, or file signature;
- no control rejected expired permission evidence, orphan decisions, duplicate decision references, or packet/decision drift;
- no report showed rights state for all 24 `SID-EV-*` controls;
- the repository had zero real packets, reviewers, decisions, and permission documents, so the truthful baseline had to remain empty rather than using AI-generated legal conclusions or synthetic approvals.

## Exact repository changes

### Added

1. `config/siddhar-rights-governance.json`
2. `docs/content-intake/evidence/rights/README.md`
3. `docs/content-intake/evidence/rights/siddhar-rights-decision-template.json`
4. `scripts/check-siddhar-rights-provenance.mjs`
5. `scripts/check-siddhar-rights-provenance.test.mjs`
6. `docs/quality/2026-07-29-siddhar-rights-provenance.md`

### Updated

7. `package.json`
8. `.github/workflows/quality-gate.yml`
9. `docs/content-intake/evidence/siddhar-evidence-submission-packet-template.json`
10. `docs/content-intake/evidence/submissions/README.md`

No dependency or lockfile change was required.

## Implementation commits

- rights-governance contract: `ef9241026ef7c8f931f7977400f2aeddd5295e7f`;
- rights workflow documentation: `2553ddf3e2bdc1c9735a3465d75e4b045743b364`;
- controlled decision template: `318df4eaf190fc6ace3c105db2002744b8358cc3`;
- rights provenance validator: `3f25399ce94fa6d1c55bc07216db49e258d738ba`;
- 30 focused rights tests: `e9594fdfa833b80d9811ec671b2f7b1dd0885228`;
- package command: `cfc48ae5c0184b5fccdb83c60c074db95f5793d3`;
- CI gate and report upload: `6ff8d67daf5504ccb934da32d3d7f23bfb8a2b87`;
- packet decision-link fields: `118da1305168598ba018ac81e18e94c182a43707`;
- submission guidance reconciliation: `a1bd734a6f15f1e46fc4e44d7b7ef53fbe45937a`;
- final branch state after the focused lint correction and removal of its temporary helper workflow: `2fadfc8f05b86d736f2c73c61190eba40b0c8bbd`.

## Fifty quality controls completed

### Rights-governance contract

1. Requires rights-governance schema version 1.
2. Requires anchored, compilable decision-ID and permission-record-ID patterns.
3. Fixes decision records under `docs/content-intake/evidence/rights/decisions/`.
4. Fixes permission evidence under `docs/content-intake/evidence/uploads/rights/`.
5. Requires authoritative rights statuses to be unique and sorted.
6. Requires non-authoritative rights statuses to be unique and sorted.
7. Requires the two status groups to partition the canonical submission-contract rights statuses exactly.
8. Prohibits one status from appearing in both groups.
9. Requires exactly one reuse-scope array for every canonical rights status.
10. Requires reuse scopes to be non-empty, unique, and sorted.
11. Restricts `UNRESOLVED` to `NO_REUSE_APPROVED`.
12. Restricts `PUBLIC_DOMAIN_CLAIM_UNVERIFIED` to `NO_REUSE_APPROVED`.
13. Requires authorised-rights-reviewer IDs to be unique and sorted while allowing a truthful empty list.
14. Requires each authorised rights reviewer to exist in the reviewer registry.
15. Requires each authorised rights reviewer to be active, conflict-cleared, and approved for `EDITORIAL` review.
16. Requires broad-rights assertion phrases to be non-empty, unique, sorted, and sufficiently specific.

### Controlled decision integrity

17. Accepts only `SID-RGT-DEC-YYYYMMDD-NNN` decision IDs.
18. Requires each decision filename to match its decision ID.
19. Rejects duplicate decision IDs.
20. Requires a valid `SID-SUB-*` packet link.
21. Requires an existing `SID-EV-*` manifest link.
22. Permits decision records only for authoritative `PERMISSION_GRANTED` or `RESTRICTED` statuses.
23. Requires an authorised rights reviewer on every decision.
24. Requires real, non-future decision dates.
25. Requires non-placeholder rights-holder, basis, and reuse-scope text.
26. Rejects broad assertions such as “all ancient texts are public domain”, “copyright free”, “free to use”, “no copyright”, “public domain worldwide”, and “royalty free”.
27. Requires the reuse scope to be allowed for the selected rights status.
28. Requires all no-promotion, no-production, privacy, and off-repository-correspondence declarations to be true.
29. Requires `PERMISSION_GRANTED` decisions to contain permission evidence metadata.
30. Requires `RESTRICTED` decisions to set permission evidence to null.

### Permission evidence integrity

31. Accepts only `SID-RGT-PERM-YYYYMMDD-NNN` permission-record IDs.
32. Rejects duplicate permission-record IDs.
33. Restricts evidence paths to the controlled rights-upload directory.
34. Rejects traversal, backslash, null-byte, and non-normalised paths.
35. Rejects duplicate evidence paths.
36. Enforces approved PDF, JPEG, PNG, or TIFF extensions and MIME types.
37. Requires extension and declared MIME type to agree.
38. Enforces positive file size within the canonical 100 MiB limit.
39. Requires a non-placeholder 64-character SHA-256 digest.
40. Requires real effective dates and rejects dates after the rights decision.
41. Accepts null expiry or a real expiry date, rejects expiry before effectiveness, and rejects expired permissions.
42. Rejects missing files, symbolic links, directories, unreadable files, and paths resolving outside the repository.
43. Compares declared size with actual bytes.
44. Calculates and verifies actual SHA-256.
45. Rejects duplicate actual permission-document content.
46. Verifies PDF/JPEG/PNG/TIFF byte signatures and rejects MIME or extension disguises.

### Packet reconciliation, coverage, and safety

47. Keeps `UNRESOLVED` and `PUBLIC_DOMAIN_CLAIM_UNVERIFIED` packets decision-free, reviewer-unassigned, and `NO_REUSE_APPROVED`.
48. Requires authoritative packet rights fields to match one controlled decision exactly, including holder, basis, scope, reviewer, date, packet ID, manifest ID, record path, and permission or restriction reference.
49. Rejects missing, orphan, or multiply referenced decisions and reports deterministic rights state for all 24 manifest controls.
50. Runs the rights gate in CI, uploads seven-day machine-readable evidence, adds 30 focused tests, records zero automatic status changes, and permits zero production-eligible items.

## Evidence-driven correction

The first integrated Quality Gate run proved that the new rights-provenance validator itself passed. ESLint then found one unused `basename` import in `scripts/check-siddhar-rights-provenance.mjs`.

Quality Gate run `30470812154`, run #303:

- immutable installation: passed;
- lockfile drift verification: passed;
- public-environment policy: passed;
- Siddhar manifest validation: passed;
- Siddhar packet validation: passed;
- Siddhar source-file integrity validation: passed;
- Siddhar orphan-and-coverage validation: passed;
- Siddhar reviewer-governance validation: passed;
- Siddhar rights-provenance validation: passed;
- lint: failed with `no-unused-vars` for `basename`;
- later type-check, tests, build, and dependency audit were skipped.

The import was removed without weakening ESLint, TypeScript, the rights policy, or CI. A narrowly scoped temporary helper workflow was used only to apply the one-line branch correction because the repository connector requires full-file replacement for direct edits of large files. The helper workflow was then deleted. The final comparison from the pre-correction commit to the final branch state contains only the intended one-line import change; no temporary workflow remains.

## Verified command and workflow evidence

Final verified implementation commit: `2fadfc8f05b86d736f2c73c61190eba40b0c8bbd`.

GitHub Actions results:

- Quality Gate run `30471280707`, run #307: **completed / success**;
- CodeQL run `30471281701`, run #201: **completed / success**.

The successful Quality Gate completed:

```bash
npm ci --no-audit --no-fund
git diff --exit-code -- package-lock.json
npm run check:public-env
npm run check:siddhar-evidence
npm run check:siddhar-submissions
npm run check:siddhar-files
npm run check:siddhar-coverage
npm run check:siddhar-reviewers
npm run check:siddhar-rights
npm run lint
npm run typecheck
npm run test:ci
npm run build
npm audit --audit-level=high
```

JUnit evidence reported:

- 149 tests;
- 0 failures;
- 0 errors;
- 30 focused rights-governance, reviewer-authorisation, decision, permission-file, chronology, reconciliation, coverage, and safety tests.

The final rights-provenance report recorded:

```json
{
  "ok": true,
  "governanceSchemaVersion": 1,
  "manifestItemCount": 24,
  "authorisedRightsReviewerCount": 0,
  "packetFileCount": 0,
  "decisionFileCount": 0,
  "validDecisionCount": 0,
  "permissionGrantedDecisionCount": 0,
  "restrictedDecisionCount": 0,
  "permissionEvidenceFileCount": 0,
  "missingPermissionEvidenceCount": 0,
  "expiredPermissionCount": 0,
  "broadAssertionFindingCount": 0,
  "unauthorisedRightsReviewerCount": 0,
  "malformedDecisionCount": 0,
  "malformedPacketCount": 0,
  "missingDecisionReferenceCount": 0,
  "orphanDecisionCount": 0,
  "duplicateDecisionReferenceCount": 0,
  "reviewedManifestItems": 0,
  "nonProductionManifestItems": 24,
  "automaticStatusChanges": 0,
  "productionEligibleItems": 0,
  "issues": []
}
```

Every `SID-EV-001` through `SID-EV-024` currently reports `NO_PACKET`. This is accurate: no rights decision, permission, restriction, reviewer authorisation, or legal conclusion was fabricated.

### Evidence artifacts

- rights-provenance report artifact ID: `8731725513`;
- rights-provenance report digest: `sha256:5f81d024c20a652031323a79806f156d44d00da46d572ce83927a1da6cde5e30`;
- test-evidence artifact ID: `8731735977`;
- test-evidence artifact digest: `sha256:2aeeaf979810e136e217b35c7c4312ae0eb873ee3a0c7daa3f6471be7f59b06b`;
- retention: 7 days.

No local-shell PASS is claimed for the complete repository. Repository validation evidence comes from GitHub Actions and the downloaded machine-readable artifacts.

## Data appended without fabrication

The repository now records the previously missing rights dimension for every evidence control:

- packet count;
- rights status distribution;
- controlled-decision count;
- permission-granted and restricted decision counts;
- permission-file verification count;
- missing, expired, malformed, orphan, duplicate-reference, broad-assertion, and unauthorised-reviewer findings;
- rights state: `NO_PACKET`, `UNRESOLVED`, `PUBLIC_DOMAIN_UNVERIFIED`, `PERMISSION_GRANTED_REVIEWED`, or `RESTRICTED_REVIEWED`.

No rights holder, permission letter, restriction, reviewer, decision date, scope, territory, duration, licence, or publication clearance was invented merely to improve coverage.

## Manual work required

1. Nominate a qualified rights reviewer and complete the existing private reviewer-governance process.
2. Register only the reviewer's non-sensitive `SID-REV-*` ID and approved public governance fields in the repository.
3. Add that ID to `authorisedReviewerIds` only after the reviewer is active, conflict-cleared, and approved for editorial review.
4. Keep the real identity, qualifications, signed declarations, contact details, private legal advice, and identity mapping in an access-controlled system outside GitHub.
5. Obtain an actual item-level permission, licence, restriction notice, or repository terms record from the rights holder or source institution.
6. Confirm the exact work, image/pages, territory, duration, attribution requirement, redistribution permission, modification permission, platform scope, and any non-commercial restriction.
7. Store private correspondence and original signed documents outside the repository; commit only an approved, non-sensitive evidence copy when permitted.
8. Save the approved permission copy under `docs/content-intake/evidence/uploads/rights/` and calculate exact SHA-256, byte size, MIME type, effective date, and expiry date.
9. Create one `SID-RGT-DEC-*` decision record using the controlled template.
10. Link the packet rights fields exactly to the decision ID, record path, authorised reviewer, decision date, permission or restriction reference, and approved reuse scope.
11. Obtain legal or governance-owner review where required; this technical gate is not legal advice and cannot establish ownership independently.
12. Keep the evidence manifest, editorial status, and production status unchanged until a separate authorised editorial decision is documented.

Highest-priority source and rights evidence still required:

- official GOML record for `R.No. 3215 — Agastiyar Parippooranam 400`;
- claimed 1899 Agastiyar title page, colophon, contents, invocation, verse 1, and adjacent pages;
- exact Bogar 7000 folios for the submitted moola mantra and dhyana sloka;
- Korakkar Chandra Regai catalogue record and exact verse folio;
- Pambatti `R.No. 121` catalogue record and refrain folio;
- stable official Ninth Tirumurai source evidence for a Karuvoorar correction;
- item-level publication and image-rights evidence for every proposed source file.

## Safety impact

- No rights decision or permission was fabricated.
- No broad public-domain claim was accepted as publication clearance.
- No private legal correspondence, signature, contact data, or identity mapping was committed.
- No evidence, reviewer, manifest, editorial, or production status changed.
- No dependency or lockfile changed.
- No authentication, API, database, persistence, AI service, deployment, or infrastructure changed.
- The contradicted Karuvoorar record remains blocked.
- PR #2 remains draft and unmerged.

## Blockers

1. There are zero completed evidence packets.
2. There are zero registered or authorised rights reviewers.
3. There are zero controlled rights decisions.
4. There are zero permission or restriction evidence documents.
5. All 24 manifest controls therefore remain `NO_PACKET` for rights coverage.
6. Rights-holder identity, scope, territory, duration, attribution, modification, redistribution, and expiry terms remain unresolved.
7. Structural and byte-integrity validation cannot prove ownership, legal enforceability, signature authenticity, territorial clearance, or lawful publication.
8. Production publication remains prohibited.

## Next task

Add a dependency-free editorial-disposition provenance gate. It should require one controlled `SID-ED-DEC-*` record, verify that source evidence, file integrity, packet coverage, reviewer assignments, completed reviews, and rights status meet the selected disposition, preserve the Karuvoorar contradiction block, report release-readiness for all 24 manifest controls, pass safely with zero packets, and never change manifest, editorial, or production status automatically.

## Status

50 RIGHTS-PROVENANCE CONTROLS COMPLETE  
149 TESTS PASSED, INCLUDING 30 RIGHTS-PROVENANCE TESTS  
QUALITY GATE AND CODEQL VERIFIED  
24 MANIFEST CONTROLS REPORTED, 0 FABRICATED RIGHTS DECISIONS  
0 PACKETS, 0 RIGHTS REVIEWERS, 0 DECISIONS, AND 0 PERMISSION FILES  
PRODUCTION PUBLICATION BLOCKED
