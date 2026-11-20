# Siddhar Editorial Disposition Provenance and End-to-End Integrity Gate

**Date:** 2026-11-20  
**Prepared branch:** `quality/siddhar-editorial-disposition`  
**Review target:** `quality/ci-gate` → `audit/repository-baseline`  
**Production impact:** None  
**Automatic manifest changes:** 0  
**Publication approvals:** 0

## Objective

Complete the next verified remediation-backlog item from the prior rights-provenance record: add a dependency-free editorial-disposition provenance gate that reconciles source evidence, source-file integrity, source coverage, reviewer governance, rights provenance, the current manifest, and a controlled human editorial decision without authenticating devotional content or approving production publication.

During end-to-end verification, two pre-existing cross-gate inconsistencies and a newly published dependency-security backlog were also identified and corrected rather than bypassed.

## Repository truth before this batch

- The prior progress record explicitly named editorial-disposition provenance as the next task.
- The evidence manifest contains 24 controlled `SID-EV-*` items.
- `SID-EV-003` is `CONTRADICTED_DO_NOT_PUBLISH` and must remain blocked.
- The repository currently contains zero completed evidence packets, zero registered reviewers, zero rights decisions, zero permission files, and zero editorial decisions.
- The truthful release-readiness baseline is therefore zero reviewed items; no decision or approval may be fabricated to improve coverage.

## Exact repository changes

### Added

1. `config/siddhar-editorial-disposition-governance.json`
2. `docs/content-intake/evidence/editorial/README.md`
3. `docs/content-intake/evidence/editorial/siddhar-editorial-decision-template.json`
4. `scripts/check-siddhar-editorial-disposition.mjs`
5. `scripts/check-siddhar-editorial-disposition.test.mjs`
6. `scripts/check-siddhar-upload-namespace.test.mjs`
7. `docs/quality/2026-11-20-siddhar-editorial-disposition.md`

### Updated

8. `scripts/check-siddhar-evidence-coverage.mjs`
9. `scripts/check-siddhar-rights-provenance.mjs`
10. `scripts/check-siddhar-evidence-submissions.mjs`
11. `package.json`
12. `package-lock.json`
13. `.github/workflows/quality-gate.yml`
14. `docs/content-intake/evidence/submissions/README.md`
15. `docs/content-intake/evidence/rights/README.md`

The temporary dependency-maintenance workflow used to generate the security lockfile refresh was deleted after the lockfile commit. No temporary maintenance workflow remains.

## Implementation commits

- editorial-disposition governance contract: `3090d8d8ee695db9e7d180d42c3924045a5f3a61`
- editorial workflow documentation: `ce50b969d51ece799f373a5edd6d6fd5039fd1a3`
- editorial decision template: `078f8bbd05a8f84300624a5d741d6159d99ff531`
- isolate rights uploads from source coverage: `939f9b4e0ca22bdc6247ad9272bfb1b383171749`
- add rights-upload orphan ownership to rights gate: `2d9cf512effe6f34289d524987a786f1a8ac77ad`
- namespace regression tests: `8e4b3db64087d3cc6f235257a51bcab31c2fd60a`
- allow explicit fail-closed `UNASSIGNED` values: `8a1bf8fa20dee09529125cee638e78a9419d404a`
- editorial-disposition validator: `2da61706760ab275cfcb1a03b8069f40f9727f7a`
- 42 focused editorial tests: `5501e89111e2fe3fa063391d915325c0bbe2464d`
- package command: `660c269f84d762a34ee6e9abd8a84585c868927d`
- CI editorial gate and report: `ebcbc81b5f0bc030b55bf52a57909904e386c22d`
- submission workflow reconciliation: `a1f7f2670103ceb464b19e7012bb290ba20f6116`
- rights namespace documentation: `2040e7095552fae5df6773f9660339224651d20d`
- align `NOT_APPLICABLE` reviewer semantics: `b605952629e834aba3d6c05ba8a411aa09c78d63`
- non-major dependency security refresh: `8253e6db12a78f578d553ed7c38199bf4bd40455`
- remove temporary security-maintenance workflow: `ca715dae4bc082ca7a41d2986cba84c6be0fcaea`

## Fifty quality controls completed

### Editorial-governance contract

1. Requires editorial governance schema version 1.
2. Requires anchored `SID-ED-DEC-YYYYMMDD-NNN` decision IDs.
3. Fixes decision records under `docs/content-intake/evidence/editorial/decisions/`.
4. Requires final dispositions to exactly match the canonical non-production packet dispositions.
5. Restricts the only release-candidate disposition to `SOURCE_REVIEW_ONLY`.
6. Pins the contradiction status to `CONTRADICTED_DO_NOT_PUBLISH`.
7. Prevents contradicted items from using release-candidate dispositions.
8. Requires every disposition to define explicit review-role requirements.
9. Requires every disposition to include `EDITORIAL` review.
10. Requires `SOURCE_REVIEW_ONLY` to complete all four canonical review roles.
11. Requires every disposition to define explicit allowed rights states.
12. Requires `SOURCE_REVIEW_ONLY` to use only authoritative reviewed rights states.
13. Requires packets to be `SUBMITTED_FOR_REVIEW` before editorial decisions.
14. Requires all protected non-production declarations to remain present and true.
15. Forbids production, publication, authentication, and manifest-promotion decision fields.

### Editorial-decision provenance

16. Requires the decision filename to match its decision ID.
17. Rejects duplicate editorial decision IDs.
18. Requires a valid `SID-SUB-*` packet reference.
19. Requires an existing `SID-EV-*` manifest reference.
20. Requires the decision manifest item to match the referenced packet.
21. Requires a stable `SID-REV-*` editorial reviewer ID.
22. Requires the editorial reviewer to be active.
23. Requires the editorial reviewer to be conflict-cleared.
24. Requires the reviewer to be authorised for `EDITORIAL`.
25. Requires the decision reviewer to match the packet's completed editorial review.
26. Requires a real, non-future decision date.
27. Rejects decisions dated before packet submission.
28. Rejects decisions dated before any review required by the chosen disposition.
29. Requires a substantive editorial basis of at least 20 characters.
30. Rejects placeholder or synthetic basis language.
31. Rejects unsupported authentication, publication-approval, release-approval, or production-readiness language.
32. Requires the decision to contain only approved public metadata fields.
33. Requires exact protected declaration keys and values.
34. Requires the observed manifest status to match current repository truth.
35. Requires the observed packet submission status to match current repository truth.
36. Requires the observed packet proposed disposition to match current repository truth.
37. Requires observed rights status and rights decision ID to match the current packet.
38. Requires the completed-review-role snapshot to exactly match current packet reviews.
39. Rejects multiple current editorial decisions for one packet.
40. Preserves the contradicted-item release block independently of other readiness signals.

### End-to-end integrity and coverage

41. Re-runs packet validation before accepting editorial decisions.
42. Re-runs source-file byte integrity before accepting editorial decisions.
43. Re-runs source orphan/coverage validation before accepting editorial decisions.
44. Re-runs reviewer identity, authorisation, chronology, and separation-of-duties validation.
45. Re-runs rights provenance, reviewer, decision, permission-file, and expiry validation.
46. Produces deterministic readiness for every manifest item: `NO_PACKET`, `BLOCKED_CONTRADICTION`, `AWAITING_DECISION`, `HOLD`, `REJECTED`, `CORRECTION_ONLY`, or `NONPRODUCTION_READY`.
47. Reports zero automatic manifest changes, zero production-eligible items, and zero publication approvals by construction.
48. Reserves `docs/content-intake/evidence/uploads/rights/` for rights evidence so permission files cannot be miscounted as source evidence, while the rights gate independently rejects orphan rights files.
49. Reconciles canonical fail-closed `UNASSIGNED` and `NOT_APPLICABLE` review states across the submission and reviewer-governance gates.
50. Refreshes vulnerable development dependencies without a major-version jump and preserves the high-severity audit as a hard CI gate.

## Evidence-driven corrections

### 1. Rights/source upload namespace collision

End-to-end analysis found that permission files under `docs/content-intake/evidence/uploads/rights/` would also be scanned by the source-evidence coverage gate and incorrectly reported as orphan source files.

Correction:

- the source-coverage gate now excludes the reserved rights subtree;
- the rights-provenance gate owns that subtree;
- the rights gate independently scans it and rejects unsupported, unsafe, symlinked, or orphan permission evidence;
- six focused namespace tests protect the separation.

### 2. Fail-closed reviewer-state mismatch

The submission validator's global placeholder expression treated `UNASSIGNED` as invalid, while reviewer and rights governance explicitly use `UNASSIGNED` as the safe state for pending/not-applicable reviews and unresolved rights.

Correction:

- `UNASSIGNED` is no longer treated as generic unresolved template text;
- a `SUBMITTED_FOR_REVIEW` packet still requires reviewer assignment for every applicable role;
- `NOT_APPLICABLE` roles may remain `UNASSIGNED`, matching reviewer-governance semantics;
- completed reviews still require a registered reviewer and real review date.

The first integrated run after the editorial implementation exposed this mismatch through five failed positive-path tests rather than silently accepting inconsistent behavior.

### 3. Current dependency-security advisories

Quality Gate run `44673567829` reached the dependency audit after all validators, lint, type-check, tests, and build passed. npm's current advisory database then reported 16 findings: 5 high, 11 moderate, 0 critical.

The high findings included transitive `brace-expansion`, `nanoid`, `source-map-js`, and `undici`, plus the direct Vite development dependency. Fixes were available without a major-version transition.

The maintenance refresh updated only development tooling:

- `eslint`: 10.7.0 → 10.15.0
- `typescript-eslint`: 8.65.0 → 8.73.0
- `vite`: 8.1.5 → 8.3.8
- `vitest`: 4.1.10 → 4.1.12

The generated lockfile also moved affected transitive packages to non-vulnerable versions.

npm 10.9.2 crashed twice with an internal Arborist `Cannot read properties of null (reading 'edgesOut')` error during maintenance. No repository dependency commit was produced by those failed attempts. The maintenance runner was then temporarily upgraded to npm 11, the same non-major dependency refresh succeeded, the audit passed, the resulting package/lockfile changes were committed, and the temporary workflow was removed. Normal repository CI continues to honor the repository's existing Node/npm engine policy.

## Final child-branch verification

Final pre-document implementation commit: `ca715dae4bc082ca7a41d2986cba84c6be0fcaea`.

GitHub Actions:

- Quality Gate run `44674264553`, run #330: **completed / success**
- CodeQL run `44674264557`, run #224: **completed / success**

The Quality Gate completed:

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
npm run check:siddhar-editorial
npm run lint
npm run typecheck
npm run test:ci
npm run build
npm audit --audit-level=high
```

JUnit evidence:

- **197 tests**
- **0 failures**
- **0 errors**
- 42 editorial-disposition tests
- 6 source/rights namespace tests
- all prior evidence, reviewer, rights, UI, and policy tests retained

Dependency-audit evidence:

```json
{
  "info": 0,
  "low": 0,
  "moderate": 0,
  "high": 0,
  "critical": 0,
  "total": 0
}
```

### Final evidence artifacts from run #330

- editorial-disposition report: artifact `14601960554`; digest `sha256:5ce5831c7e829dd3837c2078c2a6d70c2fb349ebe325d931646094990e36e978`
- test evidence: artifact `14601052705`; digest `sha256:80ecdd3053a993ae025d2009e6445c562185c2ac2c38fc7350f0733cfbd8d291`
- dependency-audit evidence: artifact `14601152210`; digest `sha256:5e8999e44df342ce53e12e606d47310ea196536cbeb9375cf17ee1c1d5940af3`
- production-build artifact: artifact `14601004566`; digest `sha256:8e54317b34ea1b90143dd6570dde6a6e4f1481248ad92a0c532084acf406d9bb`
- rights-provenance report: artifact `14601152130`; digest `sha256:c89c8df1f660ed972c975061fa4e88ae1908ca9becee201b45549b0976d5aa1c`

All artifacts have seven-day retention.

## Current truthful editorial-readiness state

The machine-readable editorial report records:

```json
{
  "ok": true,
  "manifestItemCount": 24,
  "packetFileCount": 0,
  "rightsDecisionFileCount": 0,
  "editorialDecisionFileCount": 0,
  "validEditorialDecisionCount": 0,
  "nonProductionReadyManifestItems": 0,
  "noPacketManifestItems": 24,
  "readinessCounts": {
    "NO_PACKET": 24
  },
  "upstream": {
    "submissionsOk": true,
    "sourceFileIntegrityOk": true,
    "sourceCoverageOk": true,
    "reviewerGovernanceOk": true,
    "rightsProvenanceOk": true
  },
  "automaticManifestChanges": 0,
  "productionEligibleItems": 0,
  "publicationApprovals": 0,
  "issues": []
}
```

`SID-EV-003` remains `CONTRADICTED_DO_NOT_PUBLISH`. Because there is no evidence packet yet, its readiness is currently `NO_PACKET`; once a packet exists, the editorial gate prevents a release-candidate disposition and permits only correction/hold/reject handling.

## Data appended without fabrication

The repository now has machine-readable editorial readiness for every one of the 24 evidence controls and explicit cross-gate ownership for source and rights evidence.

No source page, catalogue record, translation, reviewer identity, rights holder, permission, editorial decision, authentication status, publication approval, or production state was invented.

## Manual work required

1. Obtain the outstanding primary-source material for the P0 controls, beginning with the Agastiyar catalogue/edition pages, exact Bogar folios, Korakkar witness, Pambatti `R.No. 121`, and the correct Ninth Tirumurai Karuvoorar source.
2. Create real `SID-SUB-*` evidence packets with committed source files, exact SHA-256, size, MIME, repository identity, and precise folio/page/verse locators.
3. Nominate real qualified transcription, transliteration, translation, editorial, and rights reviewers.
4. Keep real identities, contact details, qualifications, signed attestations, conflicts, private correspondence, and legal advice outside GitHub; store only approved non-sensitive `SID-REV-*` governance metadata.
5. Complete the required human reviews after packet submission and record real review dates.
6. Obtain item-level rights evidence or restriction terms and create controlled `SID-RGT-DEC-*` decisions when authoritative rights are claimed.
7. For any proposed non-production source-review readiness, ensure all four review roles are complete and authoritative reviewed rights provenance exists.
8. For `SID-EV-003` Karuvoorar, use only correction evidence, hold, or reject dispositions; do not attempt release-candidate handling while the manifest remains contradicted.
9. Create a real `SID-ED-DEC-*` decision only after the required human review is complete.
10. Do not change the canonical manifest or application content merely because a packet or editorial decision validates; a separate authorised release process is still required.

## Blockers

- 0 completed evidence packets
- 0 controlled source files
- 0 registered reviewers
- 0 completed human reviews
- 0 rights decisions
- 0 permission/restriction files
- 0 editorial decisions
- 0 non-production-ready manifest items
- 24 controls remain `NO_PACKET`
- production publication remains blocked

## Next verified task

Add a dependency-free **decision-subject fingerprint and stale-decision gate**.

The current editorial decision snapshots semantic status fields, but a packet could theoretically be edited after sign-off while preserving those snapshot fields. The next gate should:

1. calculate a deterministic SHA-256 fingerprint of the complete canonical evidence packet;
2. calculate a deterministic fingerprint of the referenced rights decision when one exists;
3. record those fingerprints in the editorial decision;
4. reject editorial decisions if packet bytes or rights-decision bytes change after sign-off;
5. report stale/fresh decision coverage across all 24 controls;
6. preserve the Karuvoorar contradiction block and every current non-production safeguard;
7. require no new dependency and make no automatic manifest, publication, or production change.

## Status

50 QUALITY CONTROLS COMPLETE  
197 TESTS PASSED / 0 FAILURES / 0 ERRORS  
QUALITY GATE #330 SUCCESS  
CODEQL #224 SUCCESS  
NPM AUDIT: 0 VULNERABILITIES  
24 MANIFEST CONTROLS REPORTED / 0 FABRICATED DECISIONS  
0 AUTOMATIC MANIFEST CHANGES / 0 PUBLICATION APPROVALS / 0 PRODUCTION ITEMS
