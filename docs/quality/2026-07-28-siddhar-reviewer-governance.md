# Siddhar Reviewer Identity and Separation-of-Duties Gate

**Date:** 2026-07-28  
**Prepared branch:** `quality/siddhar-reviewer-governance`  
**Delivered review branch:** `quality/ci-gate`  
**Task:** Validate non-sensitive reviewer identities, role authorisation, review chronology, and editorial separation of duties  
**Production impact:** None

## Objective

Complete the next verified remediation-backlog item without inventing reviewers, exposing personal data, or changing any evidence or editorial status. Replace free-form reviewer assertions with a fail-closed, dependency-free governance check that requires stable non-sensitive reviewer IDs, an explicit reviewer registry, authorised role assignments, conflict declarations, valid review dates, and a distinct editorial approver for every evidence packet.

## Repository inspection

Before implementation:

- the canonical submission contract already defined four roles: `EDITORIAL`, `TRANSCRIPTION`, `TRANSLATION`, and `TRANSLITERATION`;
- the evidence packet template stored reviewer values as unrestricted strings;
- the submission validator required a reviewer name for completed reviews and required assignments before submission, but it had no reviewer registry;
- there was no stable reviewer-ID format, role-authorisation record, active/inactive state, conflict-of-interest declaration, or attestation reference;
- there was no control preventing the same person from preparing transcription, transliteration, or translation and then approving the same packet editorially;
- no report showed reviewer-assignment coverage across the 24 `SID-EV-*` controls;
- the repository had zero completed packets and zero real reviewer records, so the truthful baseline had to remain empty rather than using synthetic identities from AI-generated working notes.

## Exact repository changes

### Added

1. `config/siddhar-reviewer-governance.json`
2. `scripts/check-siddhar-reviewer-governance.mjs`
3. `scripts/check-siddhar-reviewer-governance.test.mjs`
4. `docs/quality/2026-07-28-siddhar-reviewer-governance.md`

### Updated

5. `package.json`
6. `.github/workflows/quality-gate.yml`
7. `docs/content-intake/evidence/siddhar-evidence-submission-packet-template.json`
8. `docs/content-intake/evidence/submissions/README.md`

No dependency or lockfile change was required.

## Implementation commits

- reviewer-governance contract: `cd16b141184a058f7219d60f50e008bdc022565b`;
- reviewer identity and separation validator: `436869135b2b95fbbd22db625ed2a6a80cbd1b67`;
- 31 deterministic reviewer-governance tests: `66bbf4dd906fac3c9dfd7f083d80229c51f9a655`;
- package command: `615bec6a09c35914fdf75a3f7766aeec2c391a9e`;
- CI validation and report upload: `10af88776794ee366a067957b8af430f7140f70b`;
- packet-template reviewer instructions: `17f2fa6a0bb2e4ff148bfe85d171f25269f5da2d`;
- reviewer assignment and privacy guidance: `1bdea25c325b48fd213e78de212c790dc586bd1c`;
- narrowed synthetic-identity phrases to avoid false positives for legitimate labels and affiliations: `91d6c9fd55e7aff1a25be81655ab861e8127c48e`.

## Fifty quality controls completed

### Governance-contract integrity

1. Requires reviewer-governance schema version 1.
2. Requires anchored, compilable reviewer-ID and attestation regular expressions.
3. Keeps the unassigned value fixed as `UNASSIGNED`.
4. Requires the reviewer-role array to be non-empty.
5. Requires reviewer roles to be unique.
6. Requires reviewer roles to be sorted deterministically.
7. Requires reviewer roles to exactly match the canonical submission contract.
8. Requires non-empty approval roles.
9. Requires non-empty preparation roles.
10. Requires approval and preparation role arrays to be unique and sorted.
11. Requires every separated role to be a canonical review role.
12. Prohibits a role from appearing in both approval and preparation groups.
13. Requires approval and preparation groups together to cover every review role.
14. Requires forbidden synthetic-identity phrases to be non-empty, unique, and sorted.
15. Uses specific phrases such as `AI REVIEWER` and `REVIEW BOT` rather than overbroad tokens that could match legitimate words or place names.
16. Preserves an empty reviewer registry as the only truthful zero-reviewer baseline.

### Non-sensitive reviewer registry

17. Requires the reviewer registry to be an array.
18. Requires each reviewer entry to be an object.
19. Allows only the defined public governance fields.
20. Rejects unexpected fields that could expose email addresses, phone numbers, private identity mappings, or correspondence.
21. Requires a stable `SID-REV-*` reviewer ID.
22. Rejects duplicate reviewer IDs.
23. Requires a non-empty public role label.
24. Requires a non-empty affiliation.
25. Rejects synthetic, dummy, test, generated, placeholder, or generic public identities.
26. Rejects email, phone, URL, or contact data in public labels and affiliations.
27. Requires at least one approved role per reviewer.
28. Requires approved roles to be unique and sorted.
29. Rejects reviewer roles outside the canonical role set.
30. Requires explicit active/inactive state.
31. Requires an explicit conflict-of-interest declaration state.
32. Requires the conflict declaration to be complete before a reviewer is active.
33. Requires a stable non-sensitive `SID-REV-ATTEST-YYYYMMDD-NNN` reference.
34. Rejects duplicate attestation references.
35. Requires a real registration date.
36. Rejects future registration dates.

### Packet assignment and review chronology

37. Sorts packet inputs deterministically.
38. Fails closed for malformed packet JSON and non-object packets.
39. Requires valid `SID-SUB-*` packet IDs and existing `SID-EV-*` manifest references.
40. Requires a real packet-submission date and rejects future dates.
41. Requires every canonical review role to be represented by an object.
42. Requires approved review statuses.
43. Requires a non-empty stable reviewer ID or `UNASSIGNED`.
44. Rejects placeholder or free-form reviewer names in packet assignments.
45. Rejects reviewer IDs absent from the registry.
46. Rejects inactive reviewers, missing conflict declarations, and assignments outside approved roles.
47. Requires a registered reviewer and real date for every completed review.
48. Rejects future review dates, dates before packet submission, and dates recorded before completion.
49. Prevents one reviewer from holding an editorial approval role and any preparation role in the same packet while allowing compatible preparation roles when authorised.
50. Reports assignment and completion coverage for all 24 manifest controls, writes a machine-readable CI artifact, records zero automatic status changes, and permits zero production-eligible items.

## Verified command and workflow evidence

Verified implementation commit: `91d6c9fd55e7aff1a25be81655ab861e8127c48e`.

GitHub Actions results:

- Quality Gate run `30401230269`, run #289: **completed / success**;
- CodeQL run `30401230275`, run #183: **completed / success**.

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
npm run lint
npm run typecheck
npm run test:ci
npm run build
npm audit --audit-level=high
```

JUnit evidence reported:

- 119 tests;
- 0 failures;
- 0 errors;
- 31 focused reviewer identity, privacy, authorisation, chronology, coverage, and separation-of-duties tests.

The reviewer-governance report recorded:

```json
{
  "ok": true,
  "governanceSchemaVersion": 1,
  "manifestItemCount": 24,
  "registryReviewerCount": 0,
  "activeReviewerCount": 0,
  "packetFileCount": 0,
  "assignedReviewCount": 0,
  "completedReviewCount": 0,
  "distinctAssignedReviewerCount": 0,
  "placeholderIdentityFindingCount": 0,
  "unknownReviewerReferenceCount": 0,
  "inactiveReviewerReferenceCount": 0,
  "conflictDeclarationFindingCount": 0,
  "unauthorisedRoleReferenceCount": 0,
  "separationConflictCount": 0,
  "malformedPacketCount": 0,
  "assignmentReadyManifestItems": 0,
  "completedManifestItems": 0,
  "automaticStatusChanges": 0,
  "productionEligibleItems": 0,
  "issues": []
}
```

The report includes a deterministically sorted entry for `SID-EV-001` through `SID-EV-024`. Every control currently has assignment state `NO_PACKET`, which accurately reports the absence of real packets and reviewer assignments.

### Evidence artifacts

- reviewer-governance artifact ID: `8704778759`;
- reviewer-governance artifact digest: `sha256:c610af7e3823dad545b2b353d9563b95626fd23167cb8a9dc8e78956fe8abb55`;
- test-evidence artifact ID: `8704785830`;
- test-evidence artifact digest: `sha256:1a0ea351342985e760bc14eade5b21b610e5817e130181a34681a03b57490fda`;
- retention: 7 days.

No local-shell PASS is claimed for the complete repository. Repository validation evidence comes from GitHub Actions and the downloaded machine-readable artifacts.

## Data appended without fabrication

The repository now reports the previously missing reviewer-governance dimension for every evidence control:

- packet count;
- assigned role count;
- completed role count;
- distinct reviewer count;
- separation-of-duties conflict count;
- assignment state: `NO_PACKET`, `UNASSIGNED`, `PARTIALLY_ASSIGNED`, `FULLY_ASSIGNED`, `PARTIALLY_COMPLETE`, or `COMPLETE`.

No reviewer name, qualification, attestation, conflict declaration, assignment, completion date, or editorial approval was invented. The public registry intentionally remains empty until real governance records are supplied.

## Manual work required

1. Nominate qualified transcription, transliteration, translation, and editorial reviewers.
2. Keep each person's real identity, contact details, qualifications, signed declarations, and private correspondence in an access-controlled system outside this repository.
3. Assign each approved person a stable non-sensitive `SID-REV-*` ID.
4. Create a real `SID-REV-ATTEST-YYYYMMDD-NNN` reference linked to the off-repository identity and qualification record.
5. Add only the permitted public governance fields to `config/siddhar-reviewer-governance.json`.
6. Record approved roles, registration date, active state, affiliation, public role label, and conflict-of-interest declaration.
7. Ensure the editorial approver is not assigned to transcription, transliteration, or translation in the same packet.
8. Replace `UNASSIGNED` in a completed packet only with a registered and authorised reviewer ID.
9. Record review completion dates only after the review occurs and never before packet submission.
10. Run `npm run check:siddhar-reviewers` together with all existing Siddhar evidence gates.
11. Retain signed reviewer evidence and the private ID mapping for audit; do not commit it publicly.
12. Keep every manifest and production status unchanged until a separate authorised editorial decision is documented.

## Safety impact

- No reviewer identity or qualification was fabricated.
- No personal contact information or private mapping record was committed.
- No AI identity was accepted as a human reviewer.
- No evidence packet, manuscript file, permission, or editorial approval was invented.
- No manifest or production status changed.
- No dependency or lockfile changed.
- No authentication, API, database, AI service, deployment, or infrastructure changed.
- The contradicted Karuvoorar record remains blocked.
- PR #2 remains draft and unmerged.

## Blockers

1. The reviewer registry contains zero real reviewers.
2. There are zero completed evidence packets and zero controlled evidence files.
3. All 24 manifest controls therefore remain `NO_PACKET` for reviewer coverage.
4. Real qualifications, signed conflict declarations, attestations, and identity mappings are unavailable.
5. Item-level publication and image rights remain unresolved.
6. Structural governance validation cannot prove reviewer competence, independence, or the authenticity of off-repository attestations.
7. Production publication remains prohibited.

## Next task

Add a dependency-free rights-decision provenance gate. It should require every `PERMISSION_GRANTED` decision to reference a controlled permission record and an authorised rights reviewer, keep `PUBLIC_DOMAIN_CLAIM_UNVERIFIED` and `UNRESOLVED` non-production, reject broad or synthetic rights assertions, report rights-review coverage by manifest control, pass safely with zero packets, and never change manifest, editorial, or production status.

## Status

50 REVIEWER-GOVERNANCE CONTROLS COMPLETE  
119 TESTS PASSED, INCLUDING 31 REVIEWER-GOVERNANCE TESTS  
QUALITY GATE AND CODEQL VERIFIED  
24 MANIFEST CONTROLS REPORTED, 0 FABRICATED REVIEWERS  
0 COMPLETED PACKETS, 0 REGISTERED REVIEWERS, AND 0 ASSIGNMENTS  
PRODUCTION PUBLICATION BLOCKED
